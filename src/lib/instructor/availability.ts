import type { Prisma } from "@/generated/prisma/client";
import { LessonScheduleStatus } from "@/generated/prisma/enums";
import { AuthError } from "@/lib/auth/http";
import { prisma } from "@/lib/prisma";
import { dateToString, minutesOfDay, parseDateOnly, parseTimeOnly, schoolNow, timeToString } from "@/lib/student/time";
import { findActiveSlotByStart } from "@/lib/session-slots/store";
import {
  assertNoWindowOverlap,
  assertNotInPast,
  lessonsOutsideWindows,
  toInterval,
  type AvailabilityInput,
} from "@/lib/instructor/availability-rules";

/*
 * Instructor availability writes. Every function takes the instructor's userId from the verified session. Nothing here
 * accepts an instructor ID from the request, and every query filters by it, so an instructor can only change their own
 * windows.
 *
 * Booking reads these windows (lesson-booking.ts) and the database trigger refuses a lesson outside them. To stop a
 * window being removed while a student is booking into it, each change locks the instructor's profile row. Booking takes
 * a shared lock on the same row before it inserts the lesson, so the two cannot interleave.
 */

export type AvailabilityWindow = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string | null;
  /** Scheduled or completed lessons that sit inside this window. */
  lessonCount: number;
};

type Tx = Prisma.TransactionClient;

async function lockInstructor(tx: Tx, instructorUserId: string) {
  const rows = await tx.$queryRaw<{ userId: string }[]>`SELECT "userId" FROM "InstructorProfile" WHERE "userId" = ${instructorUserId} FOR UPDATE`;
  if (rows.length === 0) throw new AuthError(404, "Account not found.");
}

function toWindow(row: { id: string; availabilityDate: Date; startTime: Date; endTime: Date; notes: string | null }, lessonCount: number): AvailabilityWindow {
  return {
    id: row.id,
    date: dateToString(row.availabilityDate),
    startTime: timeToString(row.startTime),
    endTime: timeToString(row.endTime),
    notes: row.notes,
    lessonCount,
  };
}

/** The instructor's windows between two dates, inclusive, in date order. The range is validated by the caller. */
export async function listAvailability(instructorUserId: string, from: string, to: string): Promise<AvailabilityWindow[]> {
  const range = { gte: parseDateOnly(from) ?? undefined, lte: parseDateOnly(to) ?? undefined };
  const [windows, lessons] = await Promise.all([
    prisma.instructorAvailability.findMany({
      where: { instructorUserId, availabilityDate: range },
      orderBy: [{ availabilityDate: "asc" }, { startTime: "asc" }],
      take: 500,
    }),
    prisma.lessonSchedule.findMany({
      where: { instructorUserId, lessonDate: range, status: { not: LessonScheduleStatus.CANCELLED } },
      select: { lessonDate: true, startTime: true, endTime: true },
    }),
  ]);

  return windows.map((window) => {
    const date = dateToString(window.availabilityDate);
    const start = minutesOfDay(timeToString(window.startTime));
    const end = minutesOfDay(timeToString(window.endTime));
    const count = lessons.filter(
      (lesson) =>
        dateToString(lesson.lessonDate) === date &&
        minutesOfDay(timeToString(lesson.startTime)) >= start &&
        minutesOfDay(timeToString(lesson.endTime)) <= end,
    ).length;
    return toWindow(window, count);
  });
}

/** Everything on one date inside the lock: the windows after the change must still cover every active lesson. */
async function assertLessonsStillFit(tx: Tx, instructorUserId: string, date: Date, windowsAfter: { startTime: string; endTime: string }[]) {
  const lessons = await tx.lessonSchedule.findMany({
    where: { instructorUserId, lessonDate: date, status: { not: LessonScheduleStatus.CANCELLED } },
    select: { startTime: true, endTime: true },
  });
  const orphaned = lessonsOutsideWindows(
    windowsAfter.map(toInterval),
    lessons.map((lesson) => toInterval({ startTime: timeToString(lesson.startTime), endTime: timeToString(lesson.endTime) })),
  );
  if (orphaned.length > 0) {
    throw new AuthError(409, "A lesson is booked in that time. Cancel the lesson first, or keep the window covering it.");
  }
}

async function windowsOnDate(tx: Tx, instructorUserId: string, date: Date, exceptId?: string) {
  const rows = await tx.instructorAvailability.findMany({
    where: { instructorUserId, availabilityDate: date, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { startTime: true, endTime: true },
  });
  return rows.map((row) => ({ startTime: timeToString(row.startTime), endTime: timeToString(row.endTime) }));
}

/** Adds a window. It cannot be in the past and cannot overlap another window of the same date. */
export async function createAvailability(instructorUserId: string, input: AvailabilityInput): Promise<AvailabilityWindow> {
  assertNotInPast(input, schoolNow());
  const date = parseDateOnly(input.date)!;

  return prisma.$transaction(async (tx) => {
    await lockInstructor(tx, instructorUserId);
    const others = await windowsOnDate(tx, instructorUserId, date);
    assertNoWindowOverlap(toInterval(input), others.map(toInterval));

    const created = await tx.instructorAvailability.create({
      data: {
        instructorUserId,
        availabilityDate: date,
        startTime: parseTimeOnly(input.startTime)!,
        endTime: parseTimeOnly(input.endTime)!,
        notes: input.notes,
      },
    });
    return toWindow(created, 0);
  });
}

/**
 * Takes an open session slot for one date. The slot's own times become the instructor's window, so students can only
 * book that exact slot. The slot must be open, and the instructor cannot take the same slot twice on one date.
 */
export async function assignSessionSlot(instructorUserId: string, date: string, startTime: string): Promise<AvailabilityWindow> {
  const slot = await findActiveSlotByStart(startTime);
  if (!slot) throw new AuthError(409, "That session time is closed. Choose one that is open.");

  const day = parseDateOnly(date);
  if (!day) throw new AuthError(400, "Choose a valid date.");
  const taken = await prisma.instructorAvailability.findFirst({
    where: { instructorUserId, availabilityDate: day, startTime: parseTimeOnly(slot.startTime)!, endTime: parseTimeOnly(slot.endTime)! },
    select: { id: true },
  });
  if (taken) throw new AuthError(409, "You have already taken this session on that date.");

  return createAvailability(instructorUserId, { date, startTime: slot.startTime, endTime: slot.endTime, notes: null });
}

/** Removes a window. Refused when a scheduled or completed lesson would be left outside every window. */
export async function deleteAvailability(instructorUserId: string, id: string): Promise<void> {
  const now = schoolNow();
  await prisma.$transaction(async (tx) => {
    await lockInstructor(tx, instructorUserId);
    const existing = await tx.instructorAvailability.findFirst({ where: { id, instructorUserId } });
    if (!existing) throw new AuthError(404, "Availability window not found.");
    if (dateToString(existing.availabilityDate) < now.date) throw new AuthError(409, "A window on a past date cannot be removed.");

    const others = await windowsOnDate(tx, instructorUserId, existing.availabilityDate, id);
    await assertLessonsStillFit(tx, instructorUserId, existing.availabilityDate, others);
    await tx.instructorAvailability.delete({ where: { id } });
  });
}
