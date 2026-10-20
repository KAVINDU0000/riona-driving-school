import { AttendanceStatus, LessonScheduleStatus, VehicleStatus } from "@/generated/prisma/enums";
import { parseCancellationReason } from "@/lib/lessons/cancellation";
import { AuthError } from "@/lib/auth/http";
import { ADMIN_PAGE_SIZE, pageCount } from "@/lib/admin/query";
import { prisma } from "@/lib/prisma";
import { dateToString, formatMinutes, minutesOfDay, parseDateOnly, parseTimeOnly, schoolNow, timeToString } from "@/lib/student/time";

/*
 * Admin view and actions for practical lessons. The list uses the same rules as the dashboard counts:
 * - "Today's scheduled lessons": SCHEDULED lessons dated today (school time).
 * - "Lessons needing action": SCHEDULED lessons whose date has passed, or whose end time has passed today.
 * Instructor notes and feedback are never selected here.
 */

const TIME_PATTERN = /^\d{2}:\d{2}$/;
const ID_PATTERN = /^[a-z0-9]{1,64}$/i;

export type LessonListItem = {
  id: string;
  lessonDate: string;
  startTime: string;
  endTime: string;
  studentId: string;
  studentName: string;
  instructorName: string;
  vehicleLabel: string;
};

function listSelect() {
  return {
    id: true,
    lessonDate: true,
    startTime: true,
    endTime: true,
    student: { select: { userId: true, fullName: true } },
    instructor: { select: { fullName: true } },
    vehicle: { select: { registrationNumber: true, make: true, model: true } },
  } as const;
}

type ListRow = {
  id: string;
  lessonDate: Date;
  startTime: Date;
  endTime: Date;
  student: { userId: string; fullName: string };
  instructor: { fullName: string };
  vehicle: { registrationNumber: string; make: string | null; model: string | null };
};

function toItem(row: ListRow): LessonListItem {
  return {
    id: row.id,
    lessonDate: dateToString(row.lessonDate),
    startTime: timeToString(row.startTime),
    endTime: timeToString(row.endTime),
    studentId: row.student.userId,
    studentName: row.student.fullName,
    instructorName: row.instructor.fullName,
    vehicleLabel: [row.vehicle.registrationNumber, row.vehicle.make, row.vehicle.model].filter(Boolean).join(" · "),
  };
}

/** Scheduled lessons on one school date, earliest first. */
export async function listScheduledForDate(date: string, page: number) {
  const day = parseDateOnly(date);
  if (!day) throw new AuthError(400, "Choose a valid date.");
  const where = { lessonDate: day, status: LessonScheduleStatus.SCHEDULED };
  const [total, rows] = await prisma.$transaction([
    prisma.lessonSchedule.count({ where }),
    prisma.lessonSchedule.findMany({
      where,
      orderBy: [{ startTime: "asc" }, { id: "asc" }],
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: listSelect(),
    }),
  ]);
  return { total, page, pageCount: pageCount(total), items: rows.map(toItem) };
}

/** Scheduled lessons that still need action: dated before today, or ended earlier today. Same rule as the dashboard. */
export async function listNeedingAction(page: number, now: Date = new Date()) {
  const school = schoolNow(now);
  const today = parseDateOnly(school.date);
  const candidates = await prisma.lessonSchedule.findMany({
    where: { status: LessonScheduleStatus.SCHEDULED, lessonDate: { lte: today ?? undefined } },
    orderBy: [{ lessonDate: "asc" }, { startTime: "asc" }, { id: "asc" }],
    select: listSelect(),
  });
  const due = candidates.filter((row) => {
    const day = dateToString(row.lessonDate);
    if (day < school.date) return true;
    return minutesOfDay(timeToString(row.endTime)) <= school.minutes;
  });
  const start = (page - 1) * ADMIN_PAGE_SIZE;
  return {
    total: due.length,
    page,
    pageCount: pageCount(due.length),
    items: due.slice(start, start + ADMIN_PAGE_SIZE).map(toItem),
  };
}

/** One lesson for the admin page. Notes and feedback are not included. */
export async function getAdminLesson(lessonId: string) {
  if (!ID_PATTERN.test(lessonId)) throw new AuthError(404, "That lesson was not found.");
  const row = await prisma.lessonSchedule.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      lessonDate: true,
      startTime: true,
      endTime: true,
      durationMinutes: true,
      status: true,
      attendance: true,
      cancellationReason: true,
      cancelledAt: true,
      cancelledBy: { select: { role: true } },
      trainingType: true,
      vehicleType: true,
      student: { select: { userId: true, fullName: true } },
      instructor: { select: { fullName: true } },
      vehicle: { select: { registrationNumber: true, make: true, model: true } },
    },
  });
  if (!row) throw new AuthError(404, "That lesson was not found.");
  return {
    id: row.id,
    lessonDate: dateToString(row.lessonDate),
    startTime: timeToString(row.startTime),
    endTime: timeToString(row.endTime),
    durationMinutes: row.durationMinutes,
    status: row.status,
    attendance: row.attendance,
    trainingType: row.trainingType,
    vehicleType: row.vehicleType,
    cancellationReason: row.cancellationReason,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    cancelledByRole: row.cancelledBy?.role ?? null,
    studentId: row.student.userId,
    studentName: row.student.fullName,
    instructorName: row.instructor.fullName,
    vehicle: {
      registrationNumber: row.vehicle.registrationNumber,
      make: row.vehicle.make,
      model: row.vehicle.model,
    },
  };
}

function checkId(lessonId: string) {
  if (!ID_PATTERN.test(lessonId)) throw new AuthError(404, "That lesson was not found.");
}

/** Records attendance on a lesson that has started. An admin can record or correct it. */
export async function recordAdminAttendance(lessonId: string, adminUserId: string, value: unknown) {
  checkId(lessonId);
  const attendance = Object.values(AttendanceStatus).find((item) => item === value);
  if (!attendance) throw new AuthError(400, "Choose Present, Late or Absent.");
  const today = schoolNow().date;
  const result = await prisma.lessonSchedule.updateMany({
    where: { id: lessonId, status: { not: LessonScheduleStatus.CANCELLED }, lessonDate: { lte: parseDateOnly(today) ?? undefined } },
    data: { attendance, attendanceMarkedAt: new Date(), attendanceMarkedByUserId: adminUserId },
  });
  if (result.count !== 1) {
    throw new AuthError(409, "Attendance can only be recorded for a lesson that is not cancelled and has started.");
  }
  return { attendance };
}

/** Cancels a scheduled lesson with a reason. The student's session is released, because cancelled lessons are not counted. */
export async function cancelAdminLesson(lessonId: string, adminUserId: string, reasonInput: unknown) {
  checkId(lessonId);
  const reason = parseCancellationReason(reasonInput);
  const result = await prisma.lessonSchedule.updateMany({
    where: { id: lessonId, status: LessonScheduleStatus.SCHEDULED },
    data: {
      status: LessonScheduleStatus.CANCELLED,
      cancellationReason: reason,
      cancelledAt: new Date(),
      cancelledByUserId: adminUserId,
    },
  });
  if (result.count !== 1) throw new AuthError(409, "Only a scheduled lesson can be cancelled.");
  return { status: LessonScheduleStatus.CANCELLED };
}

/**
 * Moves a scheduled lesson to a new date and start time, keeping its length, instructor and vehicle. Refused unless the
 * instructor is available for the whole new slot, and the instructor, vehicle and student are free in it.
 * Records and the cancellation rules are untouched; only the time moves.
 */
export async function rescheduleAdminLesson(lessonId: string, dateInput: unknown, timeInput: unknown) {
  checkId(lessonId);
  const date = typeof dateInput === "string" ? parseDateOnly(dateInput) : null;
  if (!date) throw new AuthError(400, "Choose a valid date.");
  const time = typeof timeInput === "string" && TIME_PATTERN.test(timeInput) ? timeInput : null;
  if (!time) throw new AuthError(400, "Choose a valid start time.");

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "LessonSchedule" WHERE id = ${lessonId} FOR UPDATE`;
    const lesson = await tx.lessonSchedule.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        status: true,
        durationMinutes: true,
        studentUserId: true,
        instructorUserId: true,
        vehicleId: true,
      },
    });
    if (!lesson) throw new AuthError(404, "That lesson was not found.");
    if (lesson.status !== LessonScheduleStatus.SCHEDULED) {
      throw new AuthError(409, "Only a scheduled lesson can be moved.");
    }

    const dayText = dateInput as string;
    const school = schoolNow();
    const start = minutesOfDay(time);
    const end = start + lesson.durationMinutes;
    if (end > 24 * 60) throw new AuthError(400, "The lesson would end after midnight. Choose an earlier start time.");
    if (dayText < school.date || (dayText === school.date && start <= school.minutes)) {
      throw new AuthError(400, "The new date and time must be in the future.");
    }

    const windows = await tx.instructorAvailability.findMany({
      where: { instructorUserId: lesson.instructorUserId, availabilityDate: date },
      select: { startTime: true, endTime: true },
    });
    const covered = windows.some(
      (window) => minutesOfDay(timeToString(window.startTime)) <= start && minutesOfDay(timeToString(window.endTime)) >= end,
    );
    if (!covered) throw new AuthError(409, "The instructor is not available for the whole of that time.");

    const vehicle = await tx.vehicle.findFirst({ where: { id: lesson.vehicleId }, select: { status: true } });
    if (!vehicle || vehicle.status !== VehicleStatus.ACTIVE) {
      throw new AuthError(409, "The vehicle is not active, so the lesson cannot be moved to it.");
    }

    const others = await tx.lessonSchedule.findMany({
      where: {
        id: { not: lesson.id },
        status: { not: LessonScheduleStatus.CANCELLED },
        lessonDate: date,
        OR: [{ instructorUserId: lesson.instructorUserId }, { vehicleId: lesson.vehicleId }, { studentUserId: lesson.studentUserId }],
      },
      select: { startTime: true, endTime: true, instructorUserId: true, vehicleId: true, studentUserId: true },
    });
    const clashes = (other: { startTime: Date; endTime: Date }) => {
      const otherStart = minutesOfDay(timeToString(other.startTime));
      const otherEnd = minutesOfDay(timeToString(other.endTime));
      return start < otherEnd && otherStart < end;
    };
    if (others.some((other) => other.instructorUserId === lesson.instructorUserId && clashes(other))) {
      throw new AuthError(409, "The instructor already has a lesson at that time.");
    }
    if (others.some((other) => other.vehicleId === lesson.vehicleId && clashes(other))) {
      throw new AuthError(409, "The vehicle already has a lesson at that time.");
    }
    if (others.some((other) => other.studentUserId === lesson.studentUserId && clashes(other))) {
      throw new AuthError(409, "The student already has a lesson at that time.");
    }

    const startTime = parseTimeOnly(time);
    const endTime = parseTimeOnly(formatMinutes(end));
    if (!startTime || !endTime) throw new AuthError(400, "Choose a valid start time.");
    await tx.lessonSchedule.update({ where: { id: lesson.id }, data: { lessonDate: date, startTime, endTime } });
    return { id: lesson.id, lessonDate: dayText, startTime: time, endTime: formatMinutes(end) };
  });
}
