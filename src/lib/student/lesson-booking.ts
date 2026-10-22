import { Prisma } from "@/generated/prisma/client";
import { AccountStatus, LessonScheduleStatus, TrainingType, VehicleStatus, VehicleType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { AuthError } from "@/lib/auth/http";
import { activeSessionSlots, findActiveSlotByStart } from "@/lib/session-slots/store";
import { minutesOfDay, parseDateOnly, parseTimeOnly, schoolNow, timeToString, dateToString } from "@/lib/student/time";

/**
 * Practical lesson booking for students. A lesson belongs to a session group: one slot, one vehicle and one instructor, shared
 *   by students up to the seat count for the vehicle type. Each student still has their own lesson.
 *
 * - The student chooses a date and one of the fixed session slots (lib/session-slots). A lesson takes the whole slot,
 *   so the server takes the start and end times from the slot.
 * - The server picks an instructor and a vehicle that are free for the slot. The student never chooses them.
 * - Overlaps are refused by the database (exclusion constraints). This code only checks first, so the
 *   student gets a clear answer. A concurrent booking that wins the race is caught by the database, and the
 *   next candidate is tried.
 * - The number of lessons per training requirement is counted under a row lock, so two bookings cannot both
 *   take the last session.
 */

const MAX_CANDIDATE_ATTEMPTS = 8;

export type BookingRequest = {
  studentUserId: string;
  enrollmentId: string;
  requirementId: string;
  lessonDate: string;
  /** The start time of an open session slot. The slot sets the end time and the length. */
  startTime: string;
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
    select: { id: true },
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
  // A pending allocation is refused before any slot search or remaining-session count, so it is never shown as zero.
  if (requirement.requiredSessions == null) {
    throw new AuthError(409, "Your session allocation is pending. The school will confirm it before you can book.");
  }
  const confirmed = {
    id: requirement.id,
    vehicleType: requirement.vehicleType,
    trainingType: requirement.trainingType,
    requiredSessions: requirement.requiredSessions,
  };

  return { enrollment, requirement: confirmed };
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

export type BookingOption = { startTime: string; endTime: string };

export type BookingOptions = {
  date: string;
  remainingSessions: number;
  /** The open session slots that have a free seat in a session or a free instructor and vehicle, in display order. */
  slots: BookingOption[];
};

/** Students one vehicle of this type takes in one session. Admins set these in one place. */
async function seatsFor(vehicleType: VehicleType, db: Prisma.TransactionClient | typeof prisma = prisma): Promise<number> {
  const row = await db.vehicleTypeCapacity.findUnique({ where: { vehicleType }, select: { seats: true } });
  if (!row) throw new AuthError(409, "The seat limit for this vehicle type is not set yet. Ask the school to set it.");
  return row.seats;
}

type GroupSeats = { id: string; vehicleId: string; instructorUserId: string; capacity: number; studentIds: string[] };

/** Sessions on this date and slot for this vehicle type with a free seat, that do not already include this student. */
async function openGroups(date: Date, startTime: string, vehicleType: VehicleType, studentUserId: string): Promise<GroupSeats[]> {
  const groups = await prisma.sessionGroup.findMany({
    where: { lessonDate: date, startTime: parseTimeOnly(startTime)!, vehicleType },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      vehicleId: true,
      instructorUserId: true,
      capacity: true,
      lessons: { where: { status: { not: LessonScheduleStatus.CANCELLED } }, select: { studentUserId: true } },
    },
  });
  return groups
    .map((group) => ({
      id: group.id,
      vehicleId: group.vehicleId,
      instructorUserId: group.instructorUserId,
      capacity: group.capacity,
      studentIds: group.lessons.map((lesson) => lesson.studentUserId),
    }))
    .filter((group) => group.studentIds.length < group.capacity && !group.studentIds.includes(studentUserId));
}

/** Thrown inside a booking attempt when the session filled up or the student is already in it. The next option is tried. */
class GroupUnavailableError extends Error {}

/**
 * The start times a student can book for a requirement on a date. A slot is offered when it has a free seat in a session
 * already running, or a free instructor and vehicle to open a new session. Past slots are never offered.
 */
export async function findBookingOptions(input: {
  studentUserId: string;
  enrollmentId: string;
  requirementId: string;
  lessonDate: string;
}): Promise<BookingOptions> {
  const { requirement } = await loadContext(input.studentUserId, input.enrollmentId, input.requirementId);

  const date = parseDateOnly(input.lessonDate);
  if (!date) throw new AuthError(400, "Choose a valid date.");

  const now = schoolNow();
  if (input.lessonDate < now.date) {
    return { date: input.lessonDate, remainingSessions: 0, slots: [] };
  }

  const booked = await countBookedSessions(requirementKey(requirement, input.enrollmentId));
  const remaining = Math.max(0, requirement.requiredSessions - booked);
  if (remaining === 0) {
    return { date: input.lessonDate, remainingSessions: 0, slots: [] };
  }

  const day = await loadDay(date, requirement.vehicleType, input.studentUserId);
  const slots: BookingOption[] = [];
  for (const sessionSlot of await activeSessionSlots()) {
    const interval = toMinutes(sessionSlot);
    if (input.lessonDate === now.date && interval.start <= now.minutes) continue;
    if (day.studentLessons.some((l) => overlaps(l, interval))) continue;

    const hasSeat = (await openGroups(date, sessionSlot.startTime, requirement.vehicleType, input.studentUserId)).length > 0;
    if (hasSeat || candidatePairs(day, interval).length > 0) {
      slots.push({ startTime: sessionSlot.startTime, endTime: sessionSlot.endTime });
    }
  }

  return { date: input.lessonDate, remainingSessions: remaining, slots };
}

const toMinutes = (slot: { startTime: string; endTime: string }): Interval => ({
  start: minutesOfDay(slot.startTime),
  end: minutesOfDay(slot.endTime),
});

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
 * Books one practical lesson in an open session slot. The student joins a running session with a free seat first. If none
 * is free, the school opens a new session with a free vehicle and instructor. The end time, length, instructor and vehicle
 * come from the slot and the session, never from the request.
 */
export async function bookPracticalLesson(request: BookingRequest): Promise<BookedLesson> {
  const { requirement } = await loadContext(request.studentUserId, request.enrollmentId, request.requirementId);

  const date = parseDateOnly(request.lessonDate);
  if (!date) throw new AuthError(400, "Choose a valid date.");

  // Only an open slot can be booked. Its start and end times set the lesson's times and length.
  const sessionSlot = await findActiveSlotByStart(request.startTime);
  if (!sessionSlot) throw new AuthError(400, "Choose one of the session times that are open.");
  const startDate = parseTimeOnly(sessionSlot.startTime)!;
  const endDate = parseTimeOnly(sessionSlot.endTime)!;
  const startMinutes = minutesOfDay(sessionSlot.startTime);
  const endMinutes = minutesOfDay(sessionSlot.endTime);
  const durationMinutes = endMinutes - startMinutes;

  const now = schoolNow();
  if (request.lessonDate < now.date || (request.lessonDate === now.date && startMinutes <= now.minutes)) {
    throw new AuthError(400, "Choose a time that has not started yet.");
  }

  const slot = { start: startMinutes, end: endMinutes };
  const day = await loadDay(date, requirement.vehicleType, request.studentUserId);
  if (day.studentLessons.some((l) => overlaps(l, slot))) {
    throw new AuthError(409, "You already have a lesson at that time.");
  }

  const joinable = (await openGroups(date, sessionSlot.startTime, requirement.vehicleType, request.studentUserId)).slice(0, MAX_CANDIDATE_ATTEMPTS);
  const pairs = candidatePairs(day, slot).slice(0, MAX_CANDIDATE_ATTEMPTS);
  if (joinable.length === 0 && pairs.length === 0) {
    throw new AuthError(409, "That time is no longer available. Choose another time.");
  }
  const seats = pairs.length > 0 ? await seatsFor(requirement.vehicleType) : 0;

  type Placement = { kind: "join"; group: GroupSeats } | { kind: "open"; pair: { instructorUserId: string; vehicleId: string } };
  const placements: Placement[] = [
    ...joinable.map((group): Placement => ({ kind: "join", group })),
    ...pairs.map((pair): Placement => ({ kind: "open", pair })),
  ];

  for (const placement of placements) {
    try {
      const lesson = await prisma.$transaction(async (tx) => {
        // Serialises bookings for this requirement, so the session count below cannot be raced.
        await tx.$queryRaw`SELECT id FROM "EnrollmentTrainingRequirement" WHERE id = ${requirement.id} FOR UPDATE`;

        // Re-read the entitlement under the lock. The copy loaded before the transaction can be stale if an admin changed it.
        const current = await tx.enrollmentTrainingRequirement.findUnique({
          where: { id: requirement.id },
          select: { requiredSessions: true },
        });
        if (!current) {
          throw new AuthError(400, "Choose a training requirement from this enrollment.");
        }
        if (current.requiredSessions == null) {
          throw new AuthError(409, "Your session allocation is pending. The school will confirm it before you can book.");
        }

        const booked = await countBookedSessions(requirementKey(requirement, request.enrollmentId), tx);
        if (booked >= current.requiredSessions) {
          throw new AuthError(409, "All sessions for this requirement are already booked.");
        }

        let group: { id: string; vehicleId: string; instructorUserId: string };
        if (placement.kind === "join") {
          // Lock the session and count its members under the lock, so the last seat cannot be taken twice.
          await tx.$queryRaw`SELECT id FROM "SessionGroup" WHERE id = ${placement.group.id} FOR UPDATE`;
          const members = await tx.lessonSchedule.findMany({
            where: { sessionGroupId: placement.group.id, status: { not: LessonScheduleStatus.CANCELLED } },
            select: { studentUserId: true },
          });
          if (members.length >= placement.group.capacity || members.some((m) => m.studentUserId === request.studentUserId)) {
            throw new GroupUnavailableError("session full");
          }
          group = { id: placement.group.id, vehicleId: placement.group.vehicleId, instructorUserId: placement.group.instructorUserId };
        } else {
          // Opening a session takes the vehicle and instructor for this slot. The unique indexes stop a second session on either.
          group = await tx.sessionGroup.create({
            data: {
              lessonDate: date,
              startTime: startDate,
              endTime: endDate,
              vehicleId: placement.pair.vehicleId,
              vehicleType: requirement.vehicleType,
              instructorUserId: placement.pair.instructorUserId,
              capacity: seats,
            },
            select: { id: true, vehicleId: true, instructorUserId: true },
          });
        }

        return tx.lessonSchedule.create({
          data: {
            lessonDate: date,
            startTime: startDate,
            endTime: endDate,
            durationMinutes,
            instructorUserId: group.instructorUserId,
            vehicleId: group.vehicleId,
            vehicleType: requirement.vehicleType,
            studentUserId: request.studentUserId,
            enrollmentId: request.enrollmentId,
            trainingType: requirement.trainingType,
            status: LessonScheduleStatus.SCHEDULED,
            sessionGroupId: group.id,
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
      if (error instanceof GroupUnavailableError) continue;
      // A write conflict or deadlock rolls this attempt back, so no lesson was inserted. Report it as a retryable conflict.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        throw new AuthError(409, "Another booking or change is in progress for this requirement. Try again.");
      }
      // A unique index on a session means another instructor or vehicle took it first: try the next option.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      const message = error instanceof Error ? error.message : "";
      // The student is busy: no other instructor or vehicle can help, so stop now.
      if (message.includes("LessonSchedule_student_no_overlap")) {
        throw new AuthError(409, "You already have a lesson at that time.");
      }
      // The instructor, vehicle or availability changed under us. Try the next option.
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
