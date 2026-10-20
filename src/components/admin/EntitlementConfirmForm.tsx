"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  ENTITLEMENT_REASON_MAX,
  MAX_REQUIRED_SESSIONS,
  MIN_REQUIRED_SESSIONS,
  checkEntitlementInput,
  describeChange,
  formatChangeTime,
} from "@/lib/admin/entitlement-input";

async function errorFrom(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

export type HistoryRow = {
  previousRequiredSessions: number | null;
  newRequiredSessions: number;
  reason: string;
  changedAt: string;
};

/**
 * Confirms, or changes, the session count of one enrollment requirement. The input is checked here with the same rules
 * the server uses, so the admin sees the problem before submitting. The server still re-checks everything and saves
 * the count and its audit row together.
 */
export default function EntitlementConfirmForm({
  requirementId,
  requiredSessions,
  used,
  updatedAt,
  label,
  history,
}: {
  requirementId: string;
  requiredSessions: number | null;
  used: number;
  updatedAt: string;
  label: string;
  history: HistoryRow[];
}) {
  const router = useRouter();
  const isPending = requiredSessions === null;
  const [count, setCount] = useState(requiredSessions === null ? "" : String(requiredSessions));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const id = `entitlement-${requirementId}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const checked = checkEntitlementInput({ count, reason, used });
    if (!checked.ok) {
      setMessage({ kind: "error", text: checked.message });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/enrollment-requirements/${requirementId}/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ requiredSessions: checked.count, reason: checked.reason, expectedUpdatedAt: updatedAt }),
      });
      if (!response.ok) {
        setMessage({ kind: "error", text: await errorFrom(response, "The session count could not be saved. Reload the page and try again.") });
        return;
      }
      setMessage({ kind: "success", text: isPending ? "Session count confirmed." : "Session count changed." });
      setReason("");
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "The session count could not be saved. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} aria-labelledby={`${id}-title`} className="mt-3 grid gap-3 rounded-xl bg-page p-4 sm:grid-cols-2">
      <p id={`${id}-title`} className="text-[0.9375rem] font-semibold text-ink sm:col-span-2">
        {label} {isPending ? <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 text-[0.75rem] text-ink">Allocation pending</span> : null}
      </p>
      <p className="text-[0.8125rem] text-muted sm:col-span-2">
        {isPending
          ? "Students cannot book this requirement until a session count is confirmed."
          : `Currently ${requiredSessions} session${requiredSessions === 1 ? "" : "s"} required.`}{" "}
        {used} already completed or scheduled, so the count cannot go below {used}.
      </p>
      <label className="grid gap-1 text-[0.8125rem] font-medium text-ink">
        Sessions required ({MIN_REQUIRED_SESSIONS} to {MAX_REQUIRED_SESSIONS})
        <input
          type="number"
          inputMode="numeric"
          min={MIN_REQUIRED_SESSIONS}
          max={MAX_REQUIRED_SESSIONS}
          step={1}
          required
          value={count}
          onChange={(event) => setCount(event.target.value)}
          className="rounded-xl bg-white px-3 py-2 text-[0.9375rem] text-ink ring-1 ring-line"
        />
      </label>
      <label className="grid gap-1 text-[0.8125rem] font-medium text-ink sm:col-span-2">
        Reason (required, up to {ENTITLEMENT_REASON_MAX} characters)
        <textarea
          required
          maxLength={ENTITLEMENT_REASON_MAX}
          rows={2}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="rounded-xl bg-white px-3 py-2 text-[0.9375rem] text-ink ring-1 ring-line"
        />
      </label>
      {message ? (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={message.kind === "error" ? "rounded-xl bg-red-50 px-4 py-3 text-[0.875rem] font-medium text-red-700 sm:col-span-2" : "text-[0.875rem] font-medium text-ink sm:col-span-2"}
        >
          {message.text}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center rounded-xl bg-gold px-6 py-3 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] hover:bg-gold-dark disabled:opacity-60"
        >
          {busy ? "Saving..." : isPending ? "Confirm session count" : "Change session count"}
        </button>
      </div>
      <div className="sm:col-span-2">
        <h3 className="text-[0.8125rem] font-semibold text-ink">Confirmation history</h3>
        {history.length === 0 ? (
          <p className="mt-1 text-[0.8125rem] text-muted">No confirmations recorded yet.</p>
        ) : (
          <ol className="mt-1 grid gap-1 text-[0.8125rem] text-muted">
            {history.map((row) => (
              <li key={`${row.changedAt}-${row.previousRequiredSessions ?? "none"}-${row.newRequiredSessions}`}>
                {formatChangeTime(row.changedAt)}: {describeChange(row)}. Reason: {row.reason}
              </li>
            ))}
          </ol>
        )}
      </div>
    </form>
  );
}
