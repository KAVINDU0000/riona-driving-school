import { Prisma } from "@/generated/prisma/client";
import { AccountStatus, LessonScheduleStatus, TrainingType, VehicleStatus, VehicleType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { AuthError } from "@/lib/auth/http";
import { formatMinutes, minutesOfDay, parseDateOnly, parseTimeOnly, schoolNow, timeToString, dateToString } from "@/lib/student/time";

/**
 * Practical lesson booking for students. Every lesson has exactly one student, one instructor and one vehicle.
 *
 * - The student chooses a date, a start time and a duration. The server works out the end time.
 * - The server picks an instructor and a vehicle that are free for the slot. The student never chooses them.
 * - Overlaps are refused by the database (exclusion constraints). This code only checks first, so the
 *   student gets a clear answer. A concurrent booking that wins the race is caught by the database, and the
 *   next candidate is tried.
 * - The number of lessons per training requirement is counted under a row lock, so two bookings cannot both
 *   take the last session.
 */

export const DEFAULT_LESSON_MINUTES = 30;
export const STANDARD_LESSON_MINUTES = [30, 60] as const;
/** Start times must sit on this grid, so the calendar stays readable. */
export const START_GRID_MINUTES = 15;
const MAX_CANDIDATE_ATTEMPTS = 8;

/** Durations a student may book: the standard lengths, plus the package's configured length when it has one. */
export function allowedDurations(packageMinutes: number | null | undefined): number[] {
  const values = new Set<number>(STANDARD_LESSON_MINUTES);
  if (packageMinutes && packageMinutes > 0) values.add(packageMinutes);
  return [...values].sort((a, b) => a - b);
}

export type BookingRequest = {
  studentUserId: string;
  enrollmentId: string;
  requirementId: string;
  lessonDate: string;
  startTime: string;
  durationMinutes: number;
};

type Interval = { start: number; end: number };
const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;

function requirementKey(requirement: { vehicleType: VehicleType; trainingType: TrainingType }, enrollmentId: string): RequirementKey {
  return { enrollmentId, vehicleType: requirement.vehicleType, trainingType: requirement.trainingType };
}

/** Loads the enrollment and requirement, and checks that the requirement belongs to the enrollment. */
async function loadContext(studentUserId: string, enrollmentId: string, requirementId: string) {
  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, studentUserId, status: "ACTIVE" },
    select: {
      id: true,
      package: { select: { sessionDurationMinutes: true } },
    },
  });
  if (!enrollment) {
    throw new AuthError(404, "That enrollment was not found or is not active.");
  }

  const requirement = await prisma.enrollmentTrainingRequirement.findFirst({
    where: { id: requirementId, enrollmentId: enrollment.id },
    select: { id: true, vehicleType: true, trainingType: true, requiredSessions: true },
  });
  if (!requirement) {
    throw new AuthError(400, "Choose a training requirement from this enrollment.");
  }

  return { enrollment, requirement, durations: allowedDurations(enrollment.package.sessionDurationMinutes) };
}

type RequirementKey = { enrollmentId: string; vehicleType: VehicleType; trainingType: TrainingType };

/** Lessons already booked for a requirement, excluding cancelled ones. A lesson links to its requirement by (enrollment, vehicle type, training type). */
async function countBookedSessions(key: RequirementKey, db: Prisma.TransactionClient | typeof prisma = prisma) {
  return db.lessonSchedule.count({
    where: { ...key, status: { not: LessonScheduleStatus.CANCELLED } },
  });
}

type Availability = {
  instructors: { userId: string; windows: Interval[]; lessons: Interval[] }[];
  vehicles: { id: string; lessons: Interval[] }[];
  studentLessons: Interval[];
};

/** Loads everything needed to decide who is free on one date. Only instructors and vehicles that can take lessons are loaded. */
async function loadDay(date: Date, vehicleType: VehicleType, studentUserId: string): Promise<Availability> {
  const windows = await prisma.instructorAvailability.findMany({
    where: {
      availabilityDate: date,
      instructor: { status: AccountStatus.ACTIVE, user: { status: AccountStatus.ACTIVE } },
    },
    select: { instructorUserId: true, startTime: true, endTime: true },
  });
  const instructorIds = [...new Set(windows.map((w) => w.instructorUserId))];

  const vehicles = await prisma.vehicle.findMany({
    where: { vehicleType, status: VehicleStatus.ACTIVE },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  const lessons = await prisma.lessonSchedule.findMany({
    where: {
      lessonDate: date,
      status: { not: LessonScheduleStatus.CANCELLED },
      OR: [
        { instructorUserId: { in: instructorIds } },
        { vehicleId: { in: vehicles.map((v) => v.id) } },
        { studentUserId },
      ],
    },
    select: { startTime: true, endTime: true, instructorUserId: true, vehicleId: true, studentUserId: true },
  });

  const toInterval = (start: Date, end: Date): Interval => ({
    start: minutesOfDay(timeToString(start)),
    end: minutesOfDay(timeToString(end)),
  });

  return {
    instructors: instructorIds.map((userId) => ({
      userId,
      windows: windows
        .filter((w) => w.instructorUserId === userId)
        .map((w) => toInterval(w.startTime, w.endTime)),
      lessons: lessons.filter((l) => l.instructorUserId === userId).map((l) => toInterval(l.startTime, l.endTime)),
    })),
    vehicles: vehicles.map((v) => ({
      id: v.id,
      lessons: lessons.filter((l) => l.vehicleId === v.id).map((l) => toInterval(l.startTime, l.endTime)),
    })),
    studentLessons: lessons.filter((l) => l.studentUserId === studentUserId).map((l) => toInterval(l.startTime, l.endTime)),
  };
}

/** Every (instructor, vehicle) pair that is free for the slot, in a stable order. Empty when the student is busy or nothing is free. */
function candidatePairs(day: Availability, slot: Interval): { instructorUserId: string; vehicleId: string }[] {
  if (day.studentLessons.some((l) => overlaps(l, slot))) return [];

  const freeInstructors = day.instructors.filter(
    (i) => i.windows.some((w) => w.start <= slot.start && w.end >= slot.end) && !i.lessons.some((l) => overlaps(l, slot)),
  );
  const freeVehicles = day.vehicles.filter((v) => !v.lessons.some((l) => overlaps(l, slot)));

  const pairs: { instructorUserId: string; vehicleId: string }[] = [];
  for (const instructor of freeInstructors) {
    for (const vehicle of freeVehicles) {
      pairs.push({ instructorUserId: instructor.userId, vehicleId: vehicle.id });
    }
  }
  return pairs;
}

export type BookingOptions = {
  date: string;
  durationMinutes: number;
  remainingSessions: number;
  startTimes: string[];
};

/**
 * The start times a student can book for a requirement on a date and duration. A start time is offered only
 * when a free instructor and vehicle exist for it, and the student is free. Past times are never offered.
 */
export async function findBookingOptions(input: {
  studentUserId: string;
  enrollmentId: string;
  requirementId: string;
  lessonDate: string;
  durationMinutes: number;
}): Promise<BookingOptions> {
  const { requirement, durations } = await loadContext(input.studentUserId, input.enrollmentId, input.requirementId);
  if (!durations.includes(input.durationMinutes)) {
    throw new AuthError(400, "That lesson length is not available for this package.");
  }

  const date = parseDateOnly(input.lessonDate);
  if (!date) throw new AuthError(400, "Choose a valid date.");

  const now = schoolNow();
  if (input.lessonDate < now.date) {
    return { date: input.lessonDate, durationMinutes: input.durationMinutes, remainingSessions: 0, startTimes: [] };
  }

  const booked = await countBookedSessions(requirementKey(requirement, input.enrollmentId));
  const remaining = Math.max(0, requirement.requiredSessions - booked);
  if (remaining === 0) {
    return { date: input.lessonDate, durationMinutes: input.durationMinutes, remainingSessions: 0, startTimes: [] };
  }

  const day = await loadDay(date, requirement.vehicleType, input.studentUserId);
  const startTimes: string[] = [];
  for (let start = 0; start + input.durationMinutes <= 24 * 60; start += START_GRID_MINUTES) {
    if (input.lessonDate === now.date && start <= now.minutes) continue;
    const slot = { start, end: start + input.durationMinutes };
    if (candidatePairs(day, slot).length > 0) startTimes.push(formatMinutes(start));
  }

  return { date: input.lessonDate, durationMinutes: input.durationMinutes, remainingSessions: remaining, startTimes };
}

export type BookedLesson = {
  id: string;
  lessonDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  vehicleType: string;
  trainingType: string;
};

/**
 * Books one practical lesson. Validates the request on the server, recalculates the end time, assigns an
 * instructor and vehicle, then inserts the lesson inside a transaction that also locks the requirement.
 */
export async function bookPracticalLesson(request: BookingRequest): Promise<BookedLesson> {
  const { requirement, durations } = await loadContext(request.studentUserId, request.enrollmentId, request.requirementId);

  if (!durations.includes(request.durationMinutes)) {
    throw new AuthError(400, "That lesson length is not available for this package.");
  }

  const date = parseDateOnly(request.lessonDate);
  const startDate = parseTimeOnly(request.startTime);
  if (!date || !startDate) throw new AuthError(400, "Choose a valid date and start time.");

  const startMinutes = minutesOfDay(request.startTime);
  if (startMinutes % START_GRID_MINUTES !== 0) {
    throw new AuthError(400, "Choose a start time on the 15-minute grid.");
  }
  const endMinutes = startMinutes + request.durationMinutes;
  if (endMinutes > 24 * 60) {
    throw new AuthError(400, "The lesson would finish after midnight.");
  }

  const now = schoolNow();
  if (request.lessonDate < now.date || (request.lessonDate === now.date && startMinutes <= now.minutes)) {
    throw new AuthError(400, "Choose a time that has not started yet.");
  }

  const slot = { start: startMinutes, end: endMinutes };
  const day = await loadDay(date, requirement.vehicleType, request.studentUserId);
  if (day.studentLessons.some((l) => overlaps(l, slot))) {
    throw new AuthError(409, "You already have a lesson at that time.");
  }
  const pairs = candidatePairs(day, slot).slice(0, MAX_CANDIDATE_ATTEMPTS);
  if (pairs.length === 0) {
    throw new AuthError(409, "That time is no longer available. Choose another time.");
  }

  const endTime = formatMinutes(endMinutes);
  for (const pair of pairs) {
    try {
      const lesson = await prisma.$transaction(async (tx) => {
        // Serialises bookings for this requirement, so the session count below cannot be raced.
        await tx.$queryRaw`SELECT id FROM "EnrollmentTrainingRequirement" WHERE id = ${requirement.id} FOR UPDATE`;

        const booked = await countBookedSessions(requirementKey(requirement, request.enrollmentId), tx);
        if (booked >= requirement.requiredSessions) {
          throw new AuthError(409, "All sessions for this requirement are already booked.");
        }

        return tx.lessonSchedule.create({
          data: {
            lessonDate: date,
            startTime: startDate,
            endTime: parseTimeOnly(endTime)!,
            durationMinutes: request.durationMinutes,
            instructorUserId: pair.instructorUserId,
            vehicleId: pair.vehicleId,
            vehicleType: requirement.vehicleType,
            studentUserId: request.studentUserId,
            enrollmentId: request.enrollmentId,
            trainingType: requirement.trainingType,
            status: LessonScheduleStatus.SCHEDULED,
          },
          select: { id: true, lessonDate: true, startTime: true, endTime: true, durationMinutes: true, vehicleType: true, trainingType: true },
        });
      });

      return {
        id: lesson.id,
        lessonDate: dateToString(lesson.lessonDate),
        startTime: timeToString(lesson.startTime),
        endTime: timeToString(lesson.endTime),
        durationMinutes: lesson.durationMinutes,
        vehicleType: lesson.vehicleType,
        trainingType: lesson.trainingType,
      };
    } catch (error) {
      if (error instanceof AuthError) throw error;
      const message = error instanceof Error ? error.message : "";
      // The student is busy: no other instructor or vehicle can help, so stop now.
      if (message.includes("LessonSchedule_student_no_overlap")) {
        throw new AuthError(409, "You already have a lesson at that time.");
      }
      // The instructor, vehicle or availability changed under us. Try the next free pair.
      if (
        message.includes("LessonSchedule_instructor_no_overlap") ||
        message.includes("LessonSchedule_vehicle_no_overlap") ||
        message.includes("availability window") ||
        message.includes("Instructor is not active") ||
        message.includes("Vehicle is not active")
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new AuthError(409, "That time is no longer available. Choose another time.");
}
