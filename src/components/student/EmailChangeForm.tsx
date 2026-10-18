"use client";

import { useState, type FormEvent } from "react";
import { BUTTON_INK, FIELD, LABEL } from "@/components/admin/admin-ui";

const inputClass =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-[0.9375rem] text-ink focus:border-gold-dark focus:outline-none focus:ring-4 focus:ring-gold/25 disabled:opacity-60";

/**
 * Starts an email change. The address changes only after the link sent to the new address is confirmed.
 * When email delivery is unavailable the server answers 503, and the form says so instead of reporting success.
 * `staff` uses the admin field, label and button styles (the instructor profile). The student page keeps its own look.
 */
export default function EmailChangeForm({ currentEmail, staff = false }: { currentEmail: string; staff?: boolean }) {
  const fieldClass = staff ? FIELD : inputClass;
  const labelClass = staff ? LABEL : "text-[0.8125rem] font-semibold text-ink";
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function request(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setMessage("");
    if (!newEmail.trim() || !password) {
      setError("Enter the new email address and your current password.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/account/email/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ newEmail: newEmail.trim(), currentPassword: password }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (response.status === 202) {
        setMessage(data.message ?? "We sent a verification link to the new address.");
        setPassword("");
        return;
      }
      if (response.status === 503) {
        setError("Email verification is not available right now, so no link was sent. Your address has not changed. Try again later.");
        return;
      }
      setError(data.error ?? "The change could not be started. Try again.");
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={request} noValidate autoComplete="off" className="flex flex-col gap-4" aria-busy={pending}>
      <p className="text-[0.875rem] text-muted">
        Your current address is <span className="font-semibold text-ink">{currentEmail}</span>. It changes only after you confirm the new address.
      </p>
      <div className="flex flex-col gap-2">
        <label htmlFor="new-email" className={labelClass}>
          New email address
        </label>
        <input id="new-email" type="email" autoComplete="off" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} disabled={pending} className={fieldClass} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="email-password" className={labelClass}>
          Current password
        </label>
        <input id="email-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={pending} className={fieldClass} />
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[0.875rem] text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-xl bg-gold-soft px-4 py-3 text-[0.875rem] font-medium text-gold-ink">
          {message}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={pending}
          className={staff ? BUTTON_INK : "rounded-xl bg-white px-6 py-3 text-[0.9375rem] font-semibold text-ink ring-1 ring-line hover:ring-ink/30 disabled:cursor-not-allowed disabled:opacity-60"}
        >
          {pending ? "Sending…" : "Send verification link"}
        </button>
      </div>
    </form>
  );
}
