import { AuthError } from "@/lib/auth/http";
import { formatMinutes, minutesOfDay, parseTimeOnly } from "@/lib/student/time";

/**
 * Rules for the fixed session times. A lesson takes one whole slot, and students and instructors can only use slots.
 * Every function here is pure, so the rules can be unit tested without a database.
 *
 * - Slots start and end on a 15-minute grid and last at least 30 minutes.
 * - Two slots cannot overlap. Slots that only touch (8:00–10:00 and 10:00–12:00) are fine.
 */

export const SLOT_GRID_MINUTES = 15;
export const SLOT_MIN_MINUTES = 30;

export type SlotUpdate = { startTime: string; endTime: string; isActive: boolean };
export type Interval = { start: number; end: number };

export const toInterval = (slot: { startTime: string; endTime: string }): Interval => ({
  start: minutesOfDay(slot.startTime),
  end: minutesOfDay(slot.endTime),
});

/** Validates the body of a slot change. Times are HH:MM and isActive must be a real boolean. */
export function parseSlotUpdate(body: Record<string, unknown>): SlotUpdate {
  const startTime = typeof body.startTime === "string" ? body.startTime : "";
  const endTime = typeof body.endTime === "string" ? body.endTime : "";
  if (!parseTimeOnly(startTime) || !parseTimeOnly(endTime)) throw new AuthError(400, "Choose a valid start and end time.");
  if (typeof body.isActive !== "boolean") throw new AuthError(400, "Choose whether the slot is open or closed.");

  const start = minutesOfDay(startTime);
  const end = minutesOfDay(endTime);
  if (start % SLOT_GRID_MINUTES !== 0 || end % SLOT_GRID_MINUTES !== 0) {
    throw new AuthError(400, "Times must be on the 15-minute grid.");
  }
  if (end <= start) throw new AuthError(400, "The end time must be after the start time.");
  if (end - start < SLOT_MIN_MINUTES) throw new AuthError(400, `A session must be at least ${SLOT_MIN_MINUTES} minutes long.`);

  return { startTime: formatMinutes(start), endTime: formatMinutes(end), isActive: body.isActive };
}

/** Refuses a slot that overlaps another slot. `others` must exclude the slot being changed. */
export function assertNoSlotOverlap(candidate: Interval, others: Interval[]): void {
  if (others.some((other) => candidate.start < other.end && other.start < candidate.end)) {
    throw new AuthError(409, "This session time overlaps another session time. Change the times so the sessions do not overlap.");
  }
}
