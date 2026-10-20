import { AttendanceStatus, LessonScheduleStatus, VehicleStatus } from "@/generated/prisma/enums";
import { AuthError } from "@/lib/auth/http";

/**
 * Lesson rules for instructors, in one place so the API and the UI agree. Every function here is pure, so the
 * rules can be unit tested without a database. The server calls them again before each write.
 *
 * Assumptions, because the project does not define them yet:
 * - Attendance can be recorded or corrected only on a lesson that is not cancelled and whose date is today or earlier.
 * - A lesson can be completed only when it is scheduled and its attendance is recorded.
 * - A lesson can be cancelled only while it is scheduled. Cancellation keeps the record. No lead-time rule is enforced.
 * - Feedback can be written or edited only on a completed lesson, and a rating is optional, from 1 to 5.
 */

export const FEEDBACK_MAX_LENGTH = 2000;
export const MAX_RANGE_DAYS = 62;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function canRecordAttendance(lesson: { status: LessonScheduleStatus; lessonDate: string }, today: string): boolean {
  return lesson.status !== LessonScheduleStatus.CANCELLED && lesson.lessonDate <= today;
}

export function canComplete(lesson: { status: LessonScheduleStatus; attendance: AttendanceStatus | null }): boolean {
  return lesson.status === LessonScheduleStatus.SCHEDULED && lesson.attendance !== null;
}

export function canCancel(lesson: { status: LessonScheduleStatus }): boolean {
  return lesson.status === LessonScheduleStatus.SCHEDULED;
}

export function canWriteFeedback(lesson: { status: LessonScheduleStatus }): boolean {
  return lesson.status === LessonScheduleStatus.COMPLETED;
}

/** Accepts only the three attendance values the schema defines. */
export function parseAttendance(value: unknown): AttendanceStatus {
  if (value === AttendanceStatus.PRESENT || value === AttendanceStatus.ABSENT || value === AttendanceStatus.LATE) {
    return value;
  }
  throw new AuthError(400, "Choose Present, Absent or Late.");
}

export type FeedbackInput = { feedback: string; rating: number | null };

/** Validates the feedback text and optional rating. The text is trimmed and must fit the length limit. */
export function parseFeedback(body: Record<string, unknown>): FeedbackInput {
  const text = typeof body.feedback === "string" ? body.feedback.trim() : "";
  if (!text) {
    throw new AuthError(400, "Write feedback for the student before saving.");
  }
  if (text.length > FEEDBACK_MAX_LENGTH) {
    throw new AuthError(400, `Feedback must be ${FEEDBACK_MAX_LENGTH} characters or fewer.`);
  }

  if (body.rating === undefined || body.rating === null || body.rating === "") {
    return { feedback: text, rating: null };
  }
  const rating = typeof body.rating === "number" ? body.rating : Number.NaN;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new AuthError(400, "The rating must be a whole number from 1 to 5.");
  }
  return { feedback: text, rating };
}

/** Parses an inclusive YYYY-MM-DD range and rejects reversed or oversized ranges. */
export function parseDateRange(from: string, to: string): { from: string; to: string } {
  if (!DATE_PATTERN.test(from) || !DATE_PATTERN.test(to)) {
    throw new AuthError(400, "Dates must be in YYYY-MM-DD format.");
  }
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    throw new AuthError(400, "The end date must be on or after the start date.");
  }
  const days = (end - start) / 86_400_000 + 1;
  if (days > MAX_RANGE_DAYS) {
    throw new AuthError(400, `Choose a range of ${MAX_RANGE_DAYS} days or fewer.`);
  }
  return { from, to };
}

export const STATUS_FILTERS = ["ALL", "SCHEDULED", "COMPLETED", "CANCELLED"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

/** "ALL" when no filter is chosen. Any other value must be one of the lesson statuses in the schema. */
export function parseStatusFilter(value: string | null | undefined): StatusFilter {
  if (!value) return "ALL";
  if ((STATUS_FILTERS as readonly string[]).includes(value)) return value as StatusFilter;
  throw new AuthError(400, "Choose All, Scheduled, Completed or Cancelled.");
}

/**
 * A warning for a vehicle whose stored status is not ACTIVE. Returns null when the vehicle is active. The booking
 * trigger only blocks new bookings, so an existing lesson can still have a non-active vehicle.
 */
export function vehicleWarning(status: VehicleStatus): string | null {
  if (status === VehicleStatus.ACTIVE) return null;
  if (status === VehicleStatus.MAINTENANCE) return "This vehicle is under maintenance. Check it with the school before the lesson.";
  return "This vehicle is marked inactive. Contact the school before the lesson.";
}

/** Shifts a YYYY-MM-DD date by a number of days. Used for previous and next navigation. */
export function shiftDate(date: string, days: number): string {
  const time = Date.parse(`${date}T00:00:00Z`) + days * 86_400_000;
  return new Date(time).toISOString().slice(0, 10);
}

export const LESSON_NOTES_MAX_LENGTH = 1000;

/** Notes are internal: the student portal never selects them. Empty or missing text clears the note. */
export function parseLessonNotes(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new AuthError(400, "Notes must be text.");
  const text = value.trim();
  if (text.length > LESSON_NOTES_MAX_LENGTH) {
    throw new AuthError(400, `Notes must be ${LESSON_NOTES_MAX_LENGTH} characters or fewer.`);
  }
  return text || null;
}

/** Notes can be written until the lesson is cancelled. A cancelled lesson is a closed record. */
export function canEditNotes(lesson: { status: LessonScheduleStatus }): boolean {
  return lesson.status !== LessonScheduleStatus.CANCELLED;
}

export type HistoryEvent = {
  kind: "BOOKED" | "ATTENDANCE" | "COMPLETED" | "CANCELLED" | "FEEDBACK";
  /** ISO time, or null when the schema does not record when it happened. */
  at: string | null;
  text: string;
};

type HistorySource = {
  status: LessonScheduleStatus;
  attendance: AttendanceStatus | null;
  createdAt: Date;
  attendanceMarkedAt: Date | null;
  attendanceMarkedByRole: "ADMIN" | "INSTRUCTOR" | "STUDENT" | null;
  cancelledAt: Date | null;
  cancelledByRole: "ADMIN" | "INSTRUCTOR" | "STUDENT" | null;
  cancellationReason: string | null;
  feedbackAt: Date | null;
};

const ACTOR: Record<string, string> = { ADMIN: "the school", INSTRUCTOR: "an instructor", STUDENT: "the student" };
const ATTENDANCE_TEXT: Record<AttendanceStatus, string> = { PRESENT: "Present", ABSENT: "Absent", LATE: "Late" };

/**
 * The state changes the schema records for a lesson, in the order they can happen. The schema keeps only the latest attendance and has
 * no completion timestamp, so a completion is listed without a time rather than with a guessed one.
 */
export function buildHistory(lesson: HistorySource): HistoryEvent[] {
  const events: HistoryEvent[] = [{ kind: "BOOKED", at: lesson.createdAt.toISOString(), text: "Lesson booked." }];
  if (lesson.attendance) {
    const by = lesson.attendanceMarkedByRole ? ` by ${ACTOR[lesson.attendanceMarkedByRole]}` : "";
    events.push({
      kind: "ATTENDANCE",
      at: lesson.attendanceMarkedAt?.toISOString() ?? null,
      text: `Attendance recorded as ${ATTENDANCE_TEXT[lesson.attendance]}${by}.`,
    });
  }
  if (lesson.status === LessonScheduleStatus.COMPLETED) {
    events.push({ kind: "COMPLETED", at: null, text: "Marked completed." });
  }
  if (lesson.feedbackAt) {
    events.push({ kind: "FEEDBACK", at: lesson.feedbackAt.toISOString(), text: "Feedback saved for the student." });
  }
  if (lesson.status === LessonScheduleStatus.CANCELLED) {
    const by = lesson.cancelledByRole ? ` by ${ACTOR[lesson.cancelledByRole]}` : "";
    const reason = lesson.cancellationReason ? ` Reason: ${lesson.cancellationReason}` : "";
    events.push({ kind: "CANCELLED", at: lesson.cancelledAt?.toISOString() ?? null, text: `Lesson cancelled${by}.${reason}` });
  }
  return events;
}
