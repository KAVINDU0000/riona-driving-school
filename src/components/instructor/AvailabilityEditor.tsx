"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BUTTON_DANGER, BUTTON_INK } from "@/components/admin/admin-ui";
import { formatDate } from "@/components/student/format";
import type { SessionSlot } from "@/lib/session-slots/store";

export type WindowView = { id: string; date: string; startTime: string; endTime: string; notes: string | null; lessonCount: number };

async function errorFrom(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

/** True when a window has exactly this session's times. */
const isSession = (window: WindowView, slot: SessionSlot) => window.startTime === slot.startTime && window.endTime === slot.endTime;

/**
 * One week of sessions. Each day lists the open session times, and the instructor takes or releases each one. Every change
 * is validated again on the server, which also refuses to release a session that still has a lesson booked on it.
 */
export default function AvailabilityEditor({
  days,
  windows,
  slots,
  today,
}: {
  days: string[];
  windows: WindowView[];
  slots: SessionSlot[];
  today: string;
}) {
  return (
    <div className="grid gap-4">
      {days.map((day) => (
        <DayCard key={day} day={day} today={today} slots={slots} windows={windows.filter((window) => window.date === day)} />
      ))}
    </div>
  );
}

function DayCard({ day, today, slots, windows }: { day: string; today: string; slots: SessionSlot[]; windows: WindowView[] }) {
  const router = useRouter();
  const past = day < today;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Windows that are not one of the current session times, for example from before the fixed sessions were introduced.
  const otherWindows = windows.filter((window) => !slots.some((slot) => isSession(window, slot)));
  const takenCount = windows.length;

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
        return;
      }
      setNotice(success);
      router.refresh();
    } catch {
      setError("The change could not be saved. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const take = (slot: SessionSlot) =>
    call("/api/instructor/availability", { method: "POST", body: JSON.stringify({ date: day, startTime: slot.startTime }) }, "Session taken. Students can now book it.");

  const release = (window: WindowView) => call(`/api/instructor/availability/${window.id}`, { method: "DELETE" }, "Session released.");

  return (
    <section aria-labelledby={`day-${day}`} className="glass rounded-2xl p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`day-${day}`} className="text-[1rem] font-bold text-ink">
          {formatDate(day)}
          {day === today && <span className="ml-2 text-[0.8125rem] font-semibold text-gold-ink">Today</span>}
        </h2>
        {takenCount === 0 && <span className="text-[0.8125rem] text-muted">{past ? "No sessions were taken" : "Not working (day off)"}</span>}
      </div>

      <ul className="mt-3 grid gap-2">
        {slots.map((slot) => {
          const taken = windows.find((window) => isSession(window, slot));
          return (
            <li
              key={slot.id}
              className="flex flex-col gap-2 rounded-xl bg-white p-3 ring-1 ring-line sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-[0.9375rem] font-semibold text-ink">
                  {slot.startTime} – {slot.endTime}
                </p>
                <p className="text-[0.8125rem] text-muted">
                  {taken
                    ? `Working this session · ${taken.lessonCount === 0 ? "no lessons booked" : `${taken.lessonCount} lesson${taken.lessonCount === 1 ? "" : "s"} booked`}`
                    : "Not taken"}
                </p>
              </div>
              {!past &&
                (taken ? (
                  <button type="button" className={BUTTON_DANGER} disabled={busy} onClick={() => release(taken)}>
                    Release
                  </button>
                ) : (
                  <button type="button" className={BUTTON_INK} disabled={busy} onClick={() => take(slot)}>
                    Take this session
                  </button>
                ))}
            </li>
          );
        })}
      </ul>

      {otherWindows.length > 0 && (
        <div className="mt-3">
          <p className="text-[0.8125rem] font-semibold text-muted">Other windows on this day (not a current session time)</p>
          <ul className="mt-2 grid gap-2">
            {otherWindows.map((window) => (
              <li key={window.id} className="flex flex-col gap-2 rounded-xl bg-white/70 p-3 ring-1 ring-line sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[0.875rem] text-ink">
                  {window.startTime} – {window.endTime}
                  <span className="text-muted"> · {window.lessonCount === 0 ? "no lessons booked" : `${window.lessonCount} lesson(s) booked`}</span>
                </p>
                {!past && (
                  <button type="button" className={BUTTON_DANGER} disabled={busy} onClick={() => release(window)}>
                    Release
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
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
    </section>
  );
}
