"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { BUTTON_PRIMARY, FIELD, LABEL, SELECT_FIELD } from "@/components/admin/admin-ui";
import { labels } from "@/components/student/format";

/** Times offered every 15 minutes, so the choice is quick and always valid. */
const TIME_OPTIONS = Array.from({ length: 96 }, (_, index) => {
  const hours = String(Math.floor(index / 4)).padStart(2, "0");
  const minutes = String((index % 4) * 15).padStart(2, "0");
  return `${hours}:${minutes}`;
});

/** The 15-minute times, plus the record's own time when it falls between them, so an existing value still shows. */
function timeOptionsWith(time: string): string[] {
  if (!time || TIME_OPTIONS.includes(time)) return TIME_OPTIONS;
  return [...TIME_OPTIONS, time].sort();
}

/** Today's date in school time, as YYYY-MM-DD. Earlier dates are not offered. */
function schoolToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(new Date());
}

/** Splits an instant into school-time date and time parts, for pre-filling an edit form. */
export function schoolDateAndTime(iso: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

/** A readable line such as "Thursday 12 December 2026, 09:30", or null until a date and time are chosen. */
export function describeWhen(date: string, time: string): string | null {
  if (!date || !time) return null;
  const value = new Date(`${date}T${time}:00+05:30`);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Colombo",
  }).format(value);
}

async function errorFrom(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

/**
 * Adds a scheduled medical appointment and a scheduled exam for this student. Records can only be added here.
 * Changing or cancelling them is not available yet.
 */
export default function AddAppointmentForms({ userId, disabled }: { userId: string; disabled: boolean }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <MedicalForm userId={userId} disabled={disabled} />
      <ExamForm userId={userId} disabled={disabled} />
    </div>
  );
}

/** Shared frame for both forms: a title, a one-line purpose, the fields, a summary and one action. */
function FormCard({
  title,
  purpose,
  children,
  summary,
  footer,
}: {
  title: string;
  purpose: string;
  children: ReactNode;
  summary: string | null;
  footer: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(16,27,48,0.04)]">
      <div className="grid gap-1">
        <p className="text-[1rem] font-bold text-ink">{title}</p>
        <p className="text-[0.8125rem] text-muted">{purpose}</p>
      </div>
      <div className="grid gap-4">{children}</div>
      <div className="rounded-xl bg-page px-4 py-3 ring-1 ring-line">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">Will be scheduled for</p>
        <p className="mt-1 text-[0.9375rem] font-semibold text-ink">{summary ?? "Choose a date and a time"}</p>
      </div>
      {footer}
    </div>
  );
}

export function DateAndTimeFields({
  idPrefix,
  date,
  time,
  onDate,
  onTime,
  disabled,
}: {
  idPrefix: string;
  date: string;
  time: string;
  onDate: (value: string) => void;
  onTime: (value: string) => void;
  disabled: boolean;
}) {
  const today = useMemo(() => schoolToday(), []);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-1.5">
        <label htmlFor={`${idPrefix}-date`} className={LABEL}>
          Date
        </label>
        <input
          id={`${idPrefix}-date`}
          type="date"
          min={today}
          value={date}
          onChange={(event) => onDate(event.target.value)}
          disabled={disabled}
          className={`${FIELD} h-11`}
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor={`${idPrefix}-time`} className={LABEL}>
          Start time
        </label>
        <div className="relative">
          <select
            id={`${idPrefix}-time`}
            value={time}
            onChange={(event) => onTime(event.target.value)}
            disabled={disabled}
            className={`${SELECT_FIELD} h-11`}
          >
            <option value="">Choose a time</option>
            {timeOptionsWith(time).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-[0.75rem] text-muted sm:col-span-2">All times are school time (Sri Lanka). The date must be today or later.</p>
    </div>
  );
}

function MedicalForm({ userId, disabled }: { userId: string; disabled: boolean }) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const summary = describeWhen(date, time);
  const ready = summary !== null && !busy && !disabled;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/students/${encodeURIComponent(userId)}/medical-appointments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ appointmentDate: `${date}T${time}`, description: note }),
      });
      if (!response.ok) throw new Error(await errorFrom(response, "The appointment could not be added."));
      setDate("");
      setTime("");
      setNote("");
      setNotice("Medical appointment added.");
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The appointment could not be added.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <FormCard
        title="Medical appointment"
        purpose="Book a medical check for this student."
        summary={summary}
        footer={
          <div className="grid gap-2">
            <button type="submit" disabled={!ready} className={`${BUTTON_PRIMARY} h-11 w-full`}>
              {busy ? "Adding…" : "Add medical appointment"}
            </button>
            {disabled && <p className="text-[0.8125rem] text-red-700">Reactivate the account before adding appointments.</p>}
            {!disabled && summary === null && <p className="text-[0.8125rem] text-muted">Choose both a date and a time to continue.</p>}
            {notice && <p role="status" className="text-[0.875rem] font-semibold text-success">{notice}</p>}
            {error && <p role="alert" className="text-[0.875rem] text-red-700">{error}</p>}
          </div>
        }
      >
        <DateAndTimeFields idPrefix="medical" date={date} time={time} onDate={setDate} onTime={setTime} disabled={busy || disabled} />
        <div className="grid gap-1.5">
          <label htmlFor="medical-note" className={LABEL}>
            Note <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id="medical-note"
            maxLength={500}
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={busy || disabled}
            placeholder="For example, the clinic or what to bring"
            className={`${FIELD} py-2.5`}
          />
          <p className="text-[0.75rem] text-muted">Only the school sees this note. It is not shown in admin lists.</p>
        </div>
      </FormCard>
    </form>
  );
}

function ExamForm({ userId, disabled }: { userId: string; disabled: boolean }) {
  const router = useRouter();
  const [examType, setExamType] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const summary = describeWhen(date, time);
  const examLabel = examType ? labels.examType[examType] ?? examType : null;
  const fullSummary = summary && examLabel ? `${examLabel}, ${summary}` : null;
  const ready = fullSummary !== null && !busy && !disabled;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/students/${encodeURIComponent(userId)}/exams`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ examType, vehicleType: vehicleType || null, scheduledDate: `${date}T${time}` }),
      });
      if (!response.ok) throw new Error(await errorFrom(response, "The exam could not be added."));
      setExamType("");
      setVehicleType("");
      setDate("");
      setTime("");
      setNotice("Exam added.");
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The exam could not be added.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <FormCard
        title="Exam"
        purpose="Schedule an exam for this student."
        summary={fullSummary}
        footer={
          <div className="grid gap-2">
            <button type="submit" disabled={!ready} className={`${BUTTON_PRIMARY} h-11 w-full`}>
              {busy ? "Adding…" : "Add exam"}
            </button>
            {disabled && <p className="text-[0.8125rem] text-red-700">Reactivate the account before adding exams.</p>}
            {!disabled && fullSummary === null && (
              <p className="text-[0.8125rem] text-muted">Choose an exam type, a date and a time to continue.</p>
            )}
            {notice && <p role="status" className="text-[0.875rem] font-semibold text-success">{notice}</p>}
            {error && <p role="alert" className="text-[0.875rem] text-red-700">{error}</p>}
          </div>
        }
      >
        <div className="grid gap-1.5">
          <label htmlFor="exam-type" className={LABEL}>
            Exam type
          </label>
          <select
            id="exam-type"
            value={examType}
            onChange={(event) => setExamType(event.target.value)}
            disabled={busy || disabled}
            className={`${SELECT_FIELD} h-11`}
          >
            <option value="">Choose an exam type</option>
            {Object.entries(labels.examType).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="exam-vehicle" className={LABEL}>
            Vehicle type <span className="font-normal text-muted">(optional)</span>
          </label>
          <select
            id="exam-vehicle"
            value={vehicleType}
            onChange={(event) => setVehicleType(event.target.value)}
            disabled={busy || disabled}
            className={`${SELECT_FIELD} h-11`}
          >
            <option value="">Not for a specific vehicle</option>
            {Object.entries(labels.vehicleType).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <DateAndTimeFields idPrefix="exam" date={date} time={time} onDate={setDate} onTime={setTime} disabled={busy || disabled} />
      </FormCard>
    </form>
  );
}
