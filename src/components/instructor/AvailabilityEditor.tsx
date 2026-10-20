"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BUTTON_DANGER, BUTTON_INK, BUTTON_SECONDARY, FIELD, LABEL } from "@/components/admin/admin-ui";
import ConfirmDialog from "@/components/student/ConfirmDialog";
import { formatDate } from "@/components/student/format";
import { breaksBetween } from "@/lib/instructor/availability-view";

export type WindowView = { id: string; date: string; startTime: string; endTime: string; notes: string | null; lessonCount: number };

async function errorFrom(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

/**
 * One week of availability. Each day lists its windows with the gaps between them shown as breaks. Every change is
 * validated again on the server, which also refuses a change that would leave a booked lesson outside every window.
 */
export default function AvailabilityEditor({ days, windows, today }: { days: string[]; windows: WindowView[]; today: string }) {
  return (
    <div className="grid gap-4">
      {days.map((day) => (
        <DayCard key={day} day={day} today={today} windows={windows.filter((window) => window.date === day)} />
      ))}
    </div>
  );
}

function DayCard({ day, today, windows }: { day: string; today: string; windows: WindowView[] }) {
  const router = useRouter();
  const past = day < today;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<WindowView | null>(null);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function beginEdit(window: WindowView | null) {
    setEditingId(window?.id ?? null);
    setStart(window?.startTime ?? "09:00");
    setEnd(window?.endTime ?? "17:00");
    setNotes(window?.notes ?? "");
    setError("");
    setNotice("");
  }

  async function call(path: string, init: RequestInit, success: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(path, {
        ...init,
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
      });
      if (!response.ok) {
        setError(await errorFrom(response, "The change could not be saved."));
        return false;
      }
      setNotice(success);
      router.refresh();
      return true;
    } catch {
      setError("The change could not be saved. Check your connection and try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = JSON.stringify({ date: day, startTime: start, endTime: end, notes });
    const ok = editingId
      ? await call(`/api/instructor/availability/${editingId}`, { method: "PUT", body: payload }, "Window updated.")
      : await call("/api/instructor/availability", { method: "POST", body: payload }, "Window added. Students can now book inside it.");
    if (ok) beginEdit(null);
  }

  async function remove() {
    const target = removing;
    setRemoving(null);
    if (target) await call(`/api/instructor/availability/${target.id}`, { method: "DELETE" }, "Window removed.");
  }

  const breaks = breaksBetween(windows);
  const formId = `window-form-${day}`;

  return (
    <section aria-labelledby={`day-${day}`} className="glass rounded-2xl p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`day-${day}`} className="text-[1rem] font-bold text-ink">
          {formatDate(day)}
          {day === today && <span className="ml-2 text-[0.8125rem] font-semibold text-gold-ink">Today</span>}
        </h2>
        {windows.length === 0 && <span className="text-[0.8125rem] text-muted">{past ? "No availability was set" : "Not available (day off)"}</span>}
      </div>

      {windows.length > 0 && (
        <ul className="mt-3 grid gap-2">
          {windows.map((window) => (
            <li key={window.id} className="flex flex-col gap-2 rounded-xl bg-white p-3 ring-1 ring-line sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[0.9375rem] font-semibold text-ink">
                  {window.startTime} – {window.endTime}
                </p>
                <p className="text-[0.8125rem] text-muted">
                  {window.lessonCount === 0 ? "No lessons booked" : `${window.lessonCount} lesson${window.lessonCount === 1 ? "" : "s"} booked`}
                  {window.notes ? ` · ${window.notes}` : ""}
                </p>
              </div>
              {!past && (
                <div className="flex gap-2">
                  <button type="button" className={BUTTON_SECONDARY} disabled={busy} onClick={() => beginEdit(window)}>
                    Edit
                  </button>
                  <button type="button" className={BUTTON_DANGER} disabled={busy} onClick={() => setRemoving(window)}>
                    Remove
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {breaks.length > 0 && (
        <p className="mt-2 text-[0.8125rem] text-muted">
          Breaks (no bookings): {breaks.map((gap) => `${gap.startTime}–${gap.endTime}`).join(", ")}
        </p>
      )}

      {notice && (
        <p role="status" className="mt-3 rounded-xl bg-success-soft px-4 py-3 text-[0.875rem] text-success">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-[0.875rem] text-red-700">
          {error}
        </p>
      )}

      {!past && (
        <form id={formId} onSubmit={submit} noValidate className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-[repeat(2,minmax(0,8rem))_minmax(0,1fr)_auto] sm:items-end">
          <label className={`grid gap-1.5 ${LABEL}`}>
            Start
            <input type="time" step={900} value={start} onChange={(event) => setStart(event.target.value)} className={FIELD} required />
          </label>
          <label className={`grid gap-1.5 ${LABEL}`}>
            End
            <input type="time" step={900} value={end} onChange={(event) => setEnd(event.target.value)} className={FIELD} required />
          </label>
          <label className={`grid gap-1.5 ${LABEL}`}>
            Note (optional)
            <input type="text" maxLength={200} value={notes} onChange={(event) => setNotes(event.target.value)} className={FIELD} />
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={BUTTON_INK}>
              {busy ? "Saving…" : editingId ? "Save window" : "Add window"}
            </button>
            {editingId && (
              <button type="button" disabled={busy} className={BUTTON_SECONDARY} onClick={() => beginEdit(null)}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      <ConfirmDialog open={removing !== null} title="Remove this window?" confirmLabel="Remove window" busy={busy} onConfirm={remove} onCancel={() => setRemoving(null)}>
        <p>
          Students will no longer be able to book {removing?.startTime} – {removing?.endTime} on {formatDate(day)}. If a lesson is booked inside it, the window
          cannot be removed until that lesson is cancelled.
        </p>
      </ConfirmDialog>
    </section>
  );
}
