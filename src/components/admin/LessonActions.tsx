"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { BUTTON_DANGER, BUTTON_PRIMARY, FIELD, LABEL, SELECT_FIELD } from "@/components/admin/admin-ui";
import { DateAndTimeFields, describeWhen } from "@/components/admin/AddAppointmentForms";
import ConfirmDialog from "@/components/student/ConfirmDialog";
import { labels } from "@/components/student/format";

async function errorFrom(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

type Status = "SCHEDULED" | "COMPLETED" | "CANCELLED";

/**
 * The three things an admin can change on a lesson: attendance, the time, and a cancellation with its reason.
 * Each one is saved separately, and the server checks every rule again.
 */
export default function LessonActions({
  lessonId,
  status,
  date,
  startTime,
  attendance,
}: {
  lessonId: string;
  status: Status;
  date: string;
  startTime: string;
  attendance: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const open = status === "SCHEDULED";
  const canRecord = status !== "CANCELLED";

  async function send(body: Record<string, unknown>, fallback: string) {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch(`/api/admin/lessons/${encodeURIComponent(lessonId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await errorFrom(response, fallback));
      router.refresh();
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : fallback);
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 grid gap-5">
      <AttendanceSection
        disabled={!canRecord || busy}
        current={attendance}
        onSave={async (value) => {
          if (await send({ action: "attendance", attendance: value }, "Attendance could not be saved.")) setNotice("Attendance saved.");
        }}
      />
      <RescheduleSection
        disabled={!open || busy}
        date={date}
        startTime={startTime}
        onSave={async (newDate, newTime) => {
          if (await send({ action: "reschedule", date: newDate, startTime: newTime }, "The lesson could not be moved.")) {
            setNotice("Lesson moved.");
          }
        }}
      />
      <CancelSection
        disabled={!open || busy}
        onCancel={async (reason) => {
          if (await send({ action: "cancel", reason }, "The lesson could not be cancelled.")) setNotice("Lesson cancelled.");
        }}
      />
      {notice && <p role="status" className="text-[0.875rem] font-semibold text-success">{notice}</p>}
      {error && <p role="alert" className="text-[0.875rem] text-red-700">{error}</p>}
    </div>
  );
}

function Block({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-line bg-white p-4">
      <div className="grid gap-0.5">
        <p className="text-[0.9375rem] font-bold text-ink">{title}</p>
        <p className="text-[0.8125rem] text-muted">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function AttendanceSection({
  disabled,
  current,
  onSave,
}: {
  disabled: boolean;
  current: string | null;
  onSave: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState(current ?? "");
  return (
    <Block title="Attendance" hint="Record whether the student attended. Only for lessons that have started and are not cancelled.">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-[12rem] flex-1 gap-1.5">
          <label htmlFor="lesson-attendance" className={LABEL}>
            Attendance
          </label>
          <select id="lesson-attendance" value={value} onChange={(event) => setValue(event.target.value)} disabled={disabled} className={`${SELECT_FIELD} h-11`}>
            <option value="">Choose</option>
            {Object.entries(labels.attendance).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button type="button" onClick={() => value && void onSave(value)} disabled={disabled || !value} className={`${BUTTON_PRIMARY} h-11 px-5`}>
          Save attendance
        </button>
      </div>
    </Block>
  );
}

function RescheduleSection({
  disabled,
  date,
  startTime,
  onSave,
}: {
  disabled: boolean;
  date: string;
  startTime: string;
  onSave: (date: string, time: string) => Promise<void>;
}) {
  const [newDate, setNewDate] = useState(date);
  const [newTime, setNewTime] = useState(startTime);
  const summary = describeWhen(newDate, newTime);
  const changed = newDate !== date || newTime !== startTime;
  return (
    <Block
      title="Reschedule"
      hint="Move the lesson to a new date and start time. The instructor, vehicle and student must all be free, and the instructor must be available."
    >
      <DateAndTimeFields idPrefix="lesson-move" date={newDate} time={newTime} onDate={setNewDate} onTime={setNewTime} disabled={disabled} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.8125rem] text-muted">{summary ? `New time: ${summary}` : "Choose a date and a time."}</p>
        <button
          type="button"
          onClick={() => void onSave(newDate, newTime)}
          disabled={disabled || !changed || !summary}
          className={`${BUTTON_PRIMARY} h-11 px-5`}
        >
          Move lesson
        </button>
      </div>
    </Block>
  );
}

function CancelSection({ disabled, onCancel }: { disabled: boolean; onCancel: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function askToConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reason.trim()) setConfirming(true);
  }

  return (
    <Block title="Cancel lesson" hint="Give a reason. The student's session is released, so the lesson no longer counts against their package.">
      <form onSubmit={askToConfirm} className="grid gap-3">
        <div className="grid gap-1.5">
          <label htmlFor="cancel-reason" className={LABEL}>
            Reason for cancelling
          </label>
          <textarea
            id="cancel-reason"
            rows={2}
            maxLength={300}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={disabled}
            className={`${FIELD} py-2.5`}
          />
        </div>
        <div>
          <button type="submit" disabled={disabled || !reason.trim()} className={`${BUTTON_DANGER} h-11 px-5`}>
            Cancel this lesson
          </button>
        </div>
      </form>
      <ConfirmDialog
        open={confirming}
        title="Cancel this lesson?"
        confirmLabel="Cancel lesson"
        busy={submitting}
        onConfirm={async () => {
          setSubmitting(true);
          await onCancel(reason.trim());
          setSubmitting(false);
          setConfirming(false);
        }}
        onCancel={() => setConfirming(false)}
      >
        <p>The lesson will be cancelled and the reason will be recorded. This cannot be undone from this page.</p>
      </ConfirmDialog>
    </Block>
  );
}
