import type { Prisma } from "@/generated/prisma/client";
import { LessonScheduleStatus } from "@/generated/prisma/enums";
import { AuthError } from "@/lib/auth/http";
import { prisma } from "@/lib/prisma";
import { dateToString, minutesOfDay, parseDateOnly, parseTimeOnly, schoolNow, timeToString } from "@/lib/student/time";
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

/** Adds a window. It cannot be in the past and cannot overlap or touch another window of the same date. */
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
 * Changes a window's times or notes. The window keeps its date: to move it to another date, remove it and add a new one,
 * so the lesson check always looks at a single date. A window on a past date is history and is not changed.
 */
export async function updateAvailability(instructorUserId: string, id: string, input: AvailabilityInput): Promise<AvailabilityWindow> {
  const now = schoolNow();
  assertNotInPast(input, now);

  return prisma.$transaction(async (tx) => {
    await lockInstructor(tx, instructorUserId);
    const existing = await tx.instructorAvailability.findFirst({ where: { id, instructorUserId } });
    if (!existing) throw new AuthError(404, "Availability window not found.");
    if (dateToString(existing.availabilityDate) !== input.date) {
      throw new AuthError(400, "The date of a window cannot be changed. Remove it and add a new window.");
    }
    if (input.date < now.date) throw new AuthError(409, "A window on a past date cannot be changed.");

    const others = await windowsOnDate(tx, instructorUserId, existing.availabilityDate, id);
    assertNoWindowOverlap(toInterval(input), others.map(toInterval));
    await assertLessonsStillFit(tx, instructorUserId, existing.availabilityDate, [...others, { startTime: input.startTime, endTime: input.endTime }]);

    const updated = await tx.instructorAvailability.update({
      where: { id },
      data: { startTime: parseTimeOnly(input.startTime)!, endTime: parseTimeOnly(input.endTime)!, notes: input.notes },
    });
    return toWindow(updated, 0);
  });
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
