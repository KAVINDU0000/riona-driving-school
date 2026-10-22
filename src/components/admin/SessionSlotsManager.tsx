"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BUTTON_INK, FIELD, LABEL } from "@/components/admin/admin-ui";
import type { SessionSlotAdminView } from "@/lib/session-slots/store";

async function errorFrom(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

/**
 * The fixed session times. Admins change a time or open and close a session. The server checks every change: a time cannot
 * move while instructors or lessons are on it from today onward, and a session cannot close while lessons are booked on it.
 */
export default function SessionSlotsManager({ slots }: { slots: SessionSlotAdminView[] }) {
  return (
    <div className="grid gap-4">
      {slots.map((slot) => (
        <SlotRow key={`${slot.id}-${slot.startTime}-${slot.endTime}-${slot.isActive}`} slot={slot} />
      ))}
    </div>
  );
}

function SlotRow({ slot }: { slot: SessionSlotAdminView }) {
  const router = useRouter();
  const [startTime, setStartTime] = useState(slot.startTime);
  const [endTime, setEndTime] = useState(slot.endTime);
  const [isActive, setIsActive] = useState(slot.isActive);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const changed = startTime !== slot.startTime || endTime !== slot.endTime || isActive !== slot.isActive;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/session-slots/${slot.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ startTime, endTime, isActive }),
      });
      if (!response.ok) {
        setError(await errorFrom(response, "The session time could not be saved."));
        return;
      }
      setNotice("Session time saved.");
      router.refresh();
    } catch {
      setError("The session time could not be saved. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} noValidate className="glass grid gap-4 rounded-2xl p-5 sm:grid-cols-[auto_repeat(2,minmax(0,9rem))_minmax(0,1fr)_auto] sm:items-end">
      <p className="text-[0.9375rem] font-semibold text-ink sm:pb-2">Session {slot.sortOrder}</p>
      <label className={`grid gap-1.5 ${LABEL}`}>
        Start
        <input type="time" step={900} value={startTime} onChange={(event) => setStartTime(event.target.value)} className={FIELD} required />
      </label>
      <label className={`grid gap-1.5 ${LABEL}`}>
        End
        <input type="time" step={900} value={endTime} onChange={(event) => setEndTime(event.target.value)} className={FIELD} required />
      </label>
      <div className="flex flex-col gap-1.5 text-[0.8125rem] text-muted">
        <label className="inline-flex items-center gap-2 text-[0.875rem] font-semibold text-ink">
          <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="h-4 w-4 accent-gold-dark" />
          Open for booking
        </label>
        <span>
          {slot.futureAssignments} instructor{slot.futureAssignments === 1 ? "" : "s"} · {slot.futureLessons} lesson{slot.futureLessons === 1 ? "" : "s"} from today
        </span>
      </div>
      <button type="submit" disabled={busy || !changed} className={BUTTON_INK}>
        {busy ? "Saving…" : "Save"}
      </button>

      {notice && (
        <p role="status" className="rounded-xl bg-success-soft px-4 py-3 text-[0.875rem] text-success sm:col-span-full">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[0.875rem] text-red-700 sm:col-span-full">
          {error}
        </p>
      )}
    </form>
  );
}
