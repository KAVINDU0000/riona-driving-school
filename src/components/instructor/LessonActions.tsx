"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import ConfirmDialog from "@/components/student/ConfirmDialog";
import { labels } from "@/components/student/format";

type Attendance = "PRESENT" | "ABSENT" | "LATE";

type Props = {
  lessonId: string;
  attendance: Attendance | null;
  permissions: {
    canRecordAttendance: boolean;
    canComplete: boolean;
    canCancel: boolean;
    canWriteFeedback: boolean;
  };
  feedback: { feedback: string; rating: number | null } | null;
};

const ATTENDANCE_OPTIONS: Attendance[] = ["PRESENT", "ABSENT", "LATE"];
const FEEDBACK_MAX = 2000;
const CANCEL_REASON_MAX = 300;

const BUTTON =
  "inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-[0.9375rem] font-semibold ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark disabled:opacity-60";

/** Reads the error message the API returns. Responses never include stack traces or internal details. */
async function errorFrom(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

/**
 * Instructor actions on one lesson. Every action is checked again on the server, and the buttons only reflect
 * what the server said is allowed. After a change the page is refreshed from the server.
 */
export default function LessonActions({ lessonId, attendance, permissions, feedback }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState<"complete" | "cancel" | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelReasonError, setCancelReasonError] = useState("");
  const [text, setText] = useState(feedback?.feedback ?? "");
  const [rating, setRating] = useState(feedback?.rating ? String(feedback.rating) : "");

  async function send(path: string, init: RequestInit, success: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/instructor/lessons/${lessonId}/${path}`, {
        ...init,
        headers: { "content-type": "application/json", ...init.headers },
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error(await errorFrom(response, "The change could not be saved."));
      setNotice(success);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The change could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  function recordAttendance(value: Attendance) {
    return send("attendance", { method: "POST", body: JSON.stringify({ attendance: value }) }, `Attendance set to ${labels.attendance[value]}.`);
  }

  async function complete() {
    setConfirm(null);
    await send("complete", { method: "POST" }, "Lesson marked completed.");
  }

  async function cancel() {
    const reason = cancelReason.trim();
    if (!reason) {
      setCancelReasonError("Enter the reason for cancelling this lesson.");
      return;
    }
    setCancelReasonError("");
    setConfirm(null);
    await send("cancel", { method: "POST", body: JSON.stringify({ reason }) }, "Lesson cancelled. Its record has been kept.");
    setCancelReason("");
  }

  async function saveFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Write feedback for the student before saving.");
      return;
    }
    const body: { feedback: string; rating: number | null } = {
      feedback: trimmed,
      rating: rating ? Number(rating) : null,
    };
    await send("feedback", { method: "PUT", body: JSON.stringify(body) }, "Feedback saved.");
  }

  return (
    <div className="grid gap-6">
      {notice && (
        <p role="status" className="rounded-xl bg-success-soft px-4 py-3 text-[0.875rem] text-success">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[0.875rem] text-red-700">
          {error}
        </p>
      )}

      {permissions.canRecordAttendance ? (
        <fieldset className="grid gap-3" disabled={busy}>
          <legend className="text-[0.875rem] font-semibold text-ink">Attendance</legend>
          <div className="flex flex-wrap gap-2">
            {ATTENDANCE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={attendance === option}
                onClick={() => recordAttendance(option)}
                className={`${BUTTON} ${attendance === option ? "bg-gold-soft text-gold-ink ring-gold/60" : "bg-white text-ink ring-line hover:bg-page"}`}
              >
                {labels.attendance[option]}
              </button>
            ))}
          </div>
        </fieldset>
      ) : (
        <p className="text-[0.875rem] text-muted">Attendance can be recorded once the lesson has started and is not cancelled.</p>
      )}

      <div className="flex flex-wrap gap-3 border-t border-line pt-5">
        <button
          type="button"
          disabled={busy || !permissions.canComplete}
          onClick={() => setConfirm("complete")}
          className={`${BUTTON} bg-gold text-ink ring-gold-dark hover:bg-gold-dark`}
        >
          Mark completed
        </button>
        <button
          type="button"
          disabled={busy || !permissions.canCancel}
          onClick={() => setConfirm("cancel")}
          className={`${BUTTON} bg-white text-red-700 ring-red-200 hover:bg-red-50`}
        >
          Cancel lesson
        </button>
      </div>
      {!permissions.canComplete && permissions.canCancel && (
        <p className="-mt-4 text-[0.8125rem] text-muted">Record attendance before marking the lesson completed.</p>
      )}

      {permissions.canWriteFeedback ? (
        <form onSubmit={saveFeedback} className="grid gap-3 border-t border-line pt-5">
          <h3 className="text-[1rem] font-bold text-ink">Lesson feedback</h3>
          <label className="grid gap-1.5 text-[0.8125rem] font-semibold text-ink">
            Feedback for the student
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={FEEDBACK_MAX}
              rows={5}
              required
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[0.9375rem] font-normal text-ink focus:border-gold-dark focus:outline-none focus:ring-4 focus:ring-gold/25"
            />
          </label>
          <label className="grid max-w-xs gap-1.5 text-[0.8125rem] font-semibold text-ink">
            Rating (optional)
            <select
              value={rating}
              onChange={(event) => setRating(event.target.value)}
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[0.9375rem] font-normal text-ink focus:border-gold-dark focus:outline-none focus:ring-4 focus:ring-gold/25"
            >
              <option value="">No rating</option>
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {value} of 5
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={busy} className={`${BUTTON} justify-self-start bg-gold text-ink ring-gold-dark hover:bg-gold-dark`}>
            {feedback ? "Update feedback" : "Save feedback"}
          </button>
        </form>
      ) : (
        <p className="border-t border-line pt-5 text-[0.875rem] text-muted">
          {feedback ? "Feedback is saved for this lesson." : "Feedback can be written once the lesson is completed."}
        </p>
      )}

      <ConfirmDialog
        open={confirm === "complete"}
        title="Mark this lesson completed?"
        confirmLabel="Mark completed"
        busy={busy}
        onConfirm={complete}
        onCancel={() => setConfirm(null)}
      >
        <p>The lesson will count towards the student&apos;s training progress. This does not change attendance.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === "cancel"}
        title="Cancel this lesson?"
        confirmLabel="Cancel lesson"
        busy={busy}
        onConfirm={cancel}
        onCancel={() => setConfirm(null)}
      >
        <p>The lesson stays in the record as cancelled. No replacement lesson is booked and the student is not rescheduled.</p>
        <label className="mt-4 grid gap-1.5 text-[0.8125rem] font-semibold text-ink">
          Reason for cancelling (shown to the student)
          <textarea
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            maxLength={CANCEL_REASON_MAX}
            rows={3}
            aria-invalid={Boolean(cancelReasonError)}
            aria-describedby={cancelReasonError ? "cancel-reason-error" : undefined}
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[0.9375rem] font-normal text-ink focus:border-gold-dark focus:outline-none focus:ring-4 focus:ring-gold/25"
          />
        </label>
        {cancelReasonError && (
          <p id="cancel-reason-error" role="alert" className="mt-2 text-[0.8125rem] text-red-600">
            {cancelReasonError}
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
