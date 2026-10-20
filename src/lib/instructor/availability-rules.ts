import { AuthError } from "@/lib/auth/http";
import { minutesOfDay, parseDateOnly, parseTimeOnly } from "@/lib/student/time";

/**
 * Availability rules for instructors, in one place so the API and the UI agree. Every function here is pure, so the
 * rules can be unit tested without a database.
 *
 * The schema stores date-specific windows (InstructorAvailability). A break or an unavailable period is the gap
 * between two windows on the same date, and a day with no window is a day off. Student booking only offers a slot that
 * fits entirely inside one window, so these windows are the single source of truth for instructor availability.
 *
 * Assumptions, because the project does not define them yet:
 * - Windows start and end on the same 15-minute grid as booking start times, and last at least 30 minutes.
 * - A window cannot be created for a date that has passed. Today is allowed, but not a window that has already ended.
 * - Windows on one date cannot overlap. Touching windows are refused too, because they are one window.
 * - A window can be changed or removed only if every scheduled or completed lesson on that date still fits inside a window.
 */

export const AVAILABILITY_GRID_MINUTES = 15;
export const MIN_WINDOW_MINUTES = 30;
export const AVAILABILITY_NOTES_MAX = 200;
export const MAX_AVAILABILITY_RANGE_DAYS = 62;

export type Interval = { start: number; end: number };

export type AvailabilityInput = {
  date: string;
  startTime: string;
  endTime: string;
  notes: string | null;
};

/** Validates a window from a request body. Date and times are strict YYYY-MM-DD and HH:MM strings. */
export function parseAvailabilityInput(body: Record<string, unknown>): AvailabilityInput {
  const date = typeof body.date === "string" ? body.date : "";
  const startTime = typeof body.startTime === "string" ? body.startTime : "";
  const endTime = typeof body.endTime === "string" ? body.endTime : "";
  if (!parseDateOnly(date)) throw new AuthError(400, "Choose a valid date.");
  if (!parseTimeOnly(startTime) || !parseTimeOnly(endTime)) throw new AuthError(400, "Choose a valid start and end time.");

  const start = minutesOfDay(startTime);
  const end = minutesOfDay(endTime);
  if (start % AVAILABILITY_GRID_MINUTES !== 0 || end % AVAILABILITY_GRID_MINUTES !== 0) {
    throw new AuthError(400, "Times must be on the 15-minute grid.");
  }
  if (end <= start) throw new AuthError(400, "The end time must be after the start time.");
  if (end - start < MIN_WINDOW_MINUTES) throw new AuthError(400, `A window must be at least ${MIN_WINDOW_MINUTES} minutes long.`);

  let notes: string | null = null;
  if (body.notes !== undefined && body.notes !== null && body.notes !== "") {
    if (typeof body.notes !== "string") throw new AuthError(400, "Notes must be text.");
    const trimmed = body.notes.trim();
    if (trimmed.length > AVAILABILITY_NOTES_MAX) {
      throw new AuthError(400, `Notes must be ${AVAILABILITY_NOTES_MAX} characters or fewer.`);
    }
    notes = trimmed || null;
  }
  return { date, startTime, endTime, notes };
}

/** Refuses a window on a past date, or one that has already ended today. `now` is the school's current date and minutes. */
export function assertNotInPast(input: Pick<AvailabilityInput, "date" | "endTime">, now: { date: string; minutes: number }): void {
  if (input.date < now.date || (input.date === now.date && minutesOfDay(input.endTime) <= now.minutes)) {
    throw new AuthError(400, "Availability cannot be set for a time that has already passed.");
  }
}

export const toInterval = (window: { startTime: string; endTime: string }): Interval => ({
  start: minutesOfDay(window.startTime),
  end: minutesOfDay(window.endTime),
});

/** True when the two intervals share any time, or touch. Touching windows are one window and are refused. */
export function overlapsOrTouches(a: Interval, b: Interval): boolean {
  return a.start <= b.end && b.start <= a.end;
}

/** Refuses a window that overlaps or touches another window of the same date. `others` must exclude the window being edited. */
export function assertNoWindowOverlap(candidate: Interval, others: Interval[]): void {
  if (others.some((other) => overlapsOrTouches(candidate, other))) {
    throw new AuthError(409, "This overlaps another availability window on the same date. Edit that window instead.");
  }
}

/** The lessons that would no longer fit inside any window. Both lists are for one date. */
export function lessonsOutsideWindows<T extends Interval>(windows: Interval[], lessons: T[]): T[] {
  return lessons.filter((lesson) => !windows.some((window) => window.start <= lesson.start && window.end >= lesson.end));
}

/** Parses an inclusive YYYY-MM-DD range for listing, rejecting reversed or oversized ranges. */
export function parseAvailabilityRange(from: string, to: string): { from: string; to: string } {
  const start = parseDateOnly(from);
  const end = parseDateOnly(to);
  if (!start || !end) throw new AuthError(400, "Dates must be in YYYY-MM-DD format.");
  if (end < start) throw new AuthError(400, "The end date must be on or after the start date.");
  if ((end.getTime() - start.getTime()) / 86_400_000 + 1 > MAX_AVAILABILITY_RANGE_DAYS) {
    throw new AuthError(400, `Choose a range of ${MAX_AVAILABILITY_RANGE_DAYS} days or fewer.`);
  }
  return { from, to };
}
