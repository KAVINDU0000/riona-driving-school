"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import ConfirmDialog from "@/components/student/ConfirmDialog";
import { formatDate } from "@/components/student/format";
import Icon from "@/components/ui/Icon";
import { schoolNow } from "@/lib/student/time";

export type BookableRequirement = {
  key: string;
  enrollmentId: string;
  requirementId: string;
  enrollmentLabel: string;
  requirementLabel: string;
  vehicleLabel: string;
  remaining: number;
  durations: number[];
};

type Availability = { query: string; starts?: string[]; error?: string };

const selectClass =
  "h-12 w-full rounded-xl border border-line bg-white px-4 text-[0.9375rem] text-ink focus:border-gold-dark focus:outline-none focus:ring-4 focus:ring-gold/25 disabled:opacity-60";

export default function LessonBookingForm({ requirements }: { requirements: BookableRequirement[] }) {
  const router = useRouter();
  const today = schoolNow().date;
  const [choice, setChoice] = useState(requirements[0]?.key ?? "");
  const [date, setDate] = useState("");
  const [chosenDuration, setChosenDuration] = useState<number | null>(null);
  const [startTime, setStartTime] = useState("");
  const [availability, setAvailability] = useState<Availability>({ query: "" });
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [booked, setBooked] = useState<{ date: string; start: string; end: string } | null>(null);

  const selected = useMemo(() => requirements.find((r) => r.key === choice) ?? null, [requirements, choice]);
  const duration = selected && chosenDuration && selected.durations.includes(chosenDuration) ? chosenDuration : (selected?.durations[0] ?? null);

  // The query identifies one set of booking options. A result is used only while it answers the current query.
  const query = selected && date && duration ? new URLSearchParams({
    enrollmentId: selected.enrollmentId,
    requirementId: selected.requirementId,
    date,
    durationMinutes: String(duration),
  }).toString() : "";

  useEffect(() => {
    if (!query) return;
    let active = true;
    fetch(`/api/student/lessons?${query}`, { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as { startTimes?: string[]; error?: string };
        if (!active) return;
        setAvailability(
          response.ok
            ? { query, starts: data.startTimes ?? [] }
            : { query, error: data.error ?? "Booking options could not be loaded. Try again." },
        );
      })
      .catch(() => {
        if (active) setAvailability({ query, error: "We could not reach the server. Check your connection and try again." });
      });
    return () => {
      active = false;
    };
  }, [query]);

  const current = query && availability.query === query ? availability : null;
  const loadingStarts = Boolean(query) && !current;
  const starts = current?.starts ?? null;
  const loadError = current?.error ?? "";
  const chosenStart = starts?.includes(startTime) ? startTime : "";

  function reviewBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBookingError("");
    if (!selected || !date || !duration || !chosenStart) {
      setBookingError("Choose a requirement, a date, a lesson length and a start time.");
      return;
    }
    setConfirming(true);
  }

  async function confirmBooking() {
    if (!selected || !duration || !chosenStart) return;
    setSubmitting(true);
    setBookingError("");
    try {
      const response = await fetch("/api/student/lessons", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          enrollmentId: selected.enrollmentId,
          requirementId: selected.requirementId,
          lessonDate: date,
          startTime: chosenStart,
          durationMinutes: duration,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; lesson?: { lessonDate: string; startTime: string; endTime: string } };
      if (!response.ok || !data.lesson) {
        setBookingError(data.error ?? "The lesson could not be booked. Try again.");
        return;
      }
      setBooked({ date: data.lesson.lessonDate, start: data.lesson.startTime, end: data.lesson.endTime });
      setConfirming(false);
      setStartTime("");
      router.refresh();
    } catch {
      setBookingError("We could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (requirements.length === 0) {
    return (
      <p className="rounded-2xl bg-white/70 p-5 text-[0.9375rem] text-muted">
        You have no training sessions left to book. Sessions appear here while an enrollment still has sessions to complete.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {booked && (
        <p role="status" className="rounded-2xl bg-success-soft px-5 py-4 text-[0.9375rem] font-medium text-success">
          Lesson booked for {formatDate(booked.date)}, {booked.start} to {booked.end}.
        </p>
      )}

      <form onSubmit={reviewBooking} noValidate className="glass grid gap-5 rounded-[22px] p-5 md:grid-cols-2 md:p-6">
        <div className="flex flex-col gap-2 md:col-span-2">
          <label htmlFor="requirement" className="text-[0.8125rem] font-semibold text-ink">
            Enrollment and training requirement
          </label>
          <select
            id="requirement"
            value={choice}
            onChange={(e) => {
              setChoice(e.target.value);
              setStartTime("");
            }}
            className={selectClass}
            disabled={submitting}
          >
            {requirements.map((r) => (
              <option key={r.key} value={r.key}>
                {r.enrollmentLabel} · {r.requirementLabel} · {r.remaining} left to book
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="lesson-date" className="text-[0.8125rem] font-semibold text-ink">
            Date
          </label>
          <input
            id="lesson-date"
            type="date"
            min={today}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setStartTime("");
            }}
            disabled={submitting}
            className={selectClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="duration" className="text-[0.8125rem] font-semibold text-ink">
            Lesson length
          </label>
          <select
            id="duration"
            value={duration ?? ""}
            onChange={(e) => {
              setChosenDuration(Number(e.target.value));
              setStartTime("");
            }}
            disabled={submitting || !selected}
            className={selectClass}
          >
            {(selected?.durations ?? []).map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutes{minutes === 30 ? " (standard)" : ""}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="flex flex-col gap-2 md:col-span-2">
          <legend className="text-[0.8125rem] font-semibold text-ink">Start time</legend>
          {!date && <p className="text-[0.875rem] text-muted">Choose a date to see the free start times.</p>}
          {date && loadingStarts && (
            <p role="status" className="text-[0.875rem] text-muted">
              Checking free times…
            </p>
          )}
          {date && !loadingStarts && loadError && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[0.875rem] text-red-700">
              {loadError}
            </p>
          )}
          {date && !loadingStarts && !loadError && starts && starts.length === 0 && (
            <p className="rounded-xl bg-gold-soft px-4 py-3 text-[0.875rem] text-gold-ink">
              No start times are free on this date for this lesson length. Try another date or length.
            </p>
          )}
          {date && !loadingStarts && starts && starts.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6" role="radiogroup" aria-label="Free start times">
              {starts.map((time) => {
                const checked = chosenStart === time;
                return (
                  <label
                    key={time}
                    className={`cursor-pointer rounded-xl px-2 py-2.5 text-center text-[0.875rem] font-semibold ring-1 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold-dark ${
                      checked ? "bg-gold text-ink ring-gold" : "bg-white text-ink ring-line hover:ring-ink/30"
                    }`}
                  >
                    <input type="radio" name="start" value={time} checked={checked} onChange={() => setStartTime(time)} className="sr-only" />
                    {time}
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>

        {bookingError && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[0.875rem] text-red-700 md:col-span-2">
            {bookingError}
          </p>
        )}

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={submitting || !chosenStart}
            className="inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3 text-[0.9375rem] font-semibold text-ink hover:bg-gold-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            Review booking
            <Icon name="arrow-right" className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={confirming}
        title="Confirm your lesson"
        confirmLabel="Book lesson"
        busy={submitting}
        onConfirm={confirmBooking}
        onCancel={() => setConfirming(false)}
      >
        <p>
          {selected?.enrollmentLabel} · {selected?.requirementLabel}
        </p>
        <p className="mt-2">
          {date && formatDate(date)}, {chosenStart} for {duration} minutes.
        </p>
        <p className="mt-2 text-[0.8125rem]">
          Vehicle type: {selected?.vehicleLabel}. The school assigns an instructor and a vehicle of that type when you confirm.
        </p>
      </ConfirmDialog>
    </div>
  );
}
