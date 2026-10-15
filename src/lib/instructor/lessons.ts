import { AttendanceStatus, LessonScheduleStatus, VehicleStatus } from "@/generated/prisma/enums";
import { AuthError } from "@/lib/auth/http";
import { prisma } from "@/lib/prisma";
import { dateToString, minutesOfDay, parseDateOnly, schoolNow, timeToString } from "@/lib/student/time";
import {
  canCancel,
  canComplete,
  canRecordAttendance,
  canWriteFeedback,
  type FeedbackInput,
  type StatusFilter,
} from "@/lib/instructor/lesson-rules";

/*
 * Instructor-facing lesson queries and writes. Every function takes the instructor's userId from the verified
 * session. Nothing here accepts an instructor ID from the request. Each query and write filters by
 * instructorUserId, so an instructor can only reach their own lessons.
 *
 * Writes are conditional updates that repeat the status check in the WHERE clause. Two requests racing on the
 * same lesson cannot both succeed.
 */

const CHANGED_MESSAGE = "This lesson changed while you were viewing it. Reload it and try again.";

export type InstructorLessonRow = {
  id: string;
  lessonDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: LessonScheduleStatus;
  attendance: AttendanceStatus | null;
  trainingType: string;
  vehicleType: string;
  student: { userId: string; fullName: string };
  vehicle: { id: string; registrationNumber: string; label: string; status: VehicleStatus };
  hasFeedback: boolean;
};

const rowSelect = {
  id: true,
  lessonDate: true,
  startTime: true,
  endTime: true,
  durationMinutes: true,
  status: true,
  attendance: true,
  trainingType: true,
  vehicleType: true,
  student: { select: { userId: true, fullName: true } },
  vehicle: { select: { id: true, registrationNumber: true, make: true, model: true, status: true } },
  feedback: { select: { id: true } },
} as const;

type RawRow = {
  id: string;
  lessonDate: Date;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  status: LessonScheduleStatus;
  attendance: AttendanceStatus | null;
  trainingType: string;
  vehicleType: string;
  student: { userId: string; fullName: string };
  vehicle: { id: string; registrationNumber: string; make: string | null; model: string | null; status: VehicleStatus };
  feedback: { id: string } | null;
};

function toRow(raw: RawRow): InstructorLessonRow {
  return {
    id: raw.id,
    lessonDate: dateToString(raw.lessonDate),
    startTime: timeToString(raw.startTime),
    endTime: timeToString(raw.endTime),
    durationMinutes: raw.durationMinutes,
    status: raw.status,
    attendance: raw.attendance,
    trainingType: raw.trainingType,
    vehicleType: raw.vehicleType,
    student: raw.student,
    vehicle: {
      id: raw.vehicle.id,
      registrationNumber: raw.vehicle.registrationNumber,
      label: [raw.vehicle.make, raw.vehicle.model].filter(Boolean).join(" ") || raw.vehicle.registrationNumber,
      status: raw.vehicle.status,
    },
    hasFeedback: raw.feedback !== null,
  };
}

/**
 * The instructor's lessons between two dates, inclusive, in schedule order. The range is validated by the caller.
 * The status filter is one of the schema's lesson statuses, or "ALL".
 */
export async function lessonsBetween(
  instructorUserId: string,
  from: string,
  to: string,
  status: StatusFilter = "ALL",
): Promise<InstructorLessonRow[]> {
  const rows = await prisma.lessonSchedule.findMany({
    where: {
      instructorUserId,
      lessonDate: { gte: parseDateOnly(from) ?? undefined, lte: parseDateOnly(to) ?? undefined },
      ...(status === "ALL" ? {} : { status: status as LessonScheduleStatus }),
    },
    orderBy: [{ lessonDate: "asc" }, { startTime: "asc" }],
    take: 500,
    select: rowSelect,
  });
  return rows.map(toRow);
}

export type DashboardSummary = {
  today: string;
  todayCount: number;
  upcomingCount: number;
  completedToday: number;
  todaysLessons: InstructorLessonRow[];
  upcoming: InstructorLessonRow[];
  pendingActions: { lesson: InstructorLessonRow; needs: "attendance" | "outcome" }[];
  vehicles: { id: string; registrationNumber: string; label: string; status: VehicleStatus }[];
};

/** Dashboard counts and lists, all derived from the instructor's lesson records. Nothing is hardcoded. */
export async function getDashboardSummary(instructorUserId: string): Promise<DashboardSummary> {
  const now = schoolNow();
  const today = now.date;
  const todayDate = parseDateOnly(today) ?? undefined;

  const [todayRows, upcomingRows, upcomingCount, completedToday, overdueRows, vehicleRows] = await Promise.all([
    prisma.lessonSchedule.findMany({
      where: { instructorUserId, lessonDate: todayDate },
      orderBy: { startTime: "asc" },
      take: 100,
      select: rowSelect,
    }),
    prisma.lessonSchedule.findMany({
      where: { instructorUserId, status: LessonScheduleStatus.SCHEDULED, lessonDate: { gt: todayDate } },
      orderBy: [{ lessonDate: "asc" }, { startTime: "asc" }],
      take: 5,
      select: rowSelect,
    }),
    prisma.lessonSchedule.count({
      where: { instructorUserId, status: LessonScheduleStatus.SCHEDULED, lessonDate: { gt: todayDate } },
    }),
    prisma.lessonSchedule.count({
      where: { instructorUserId, status: LessonScheduleStatus.COMPLETED, lessonDate: todayDate },
    }),
    prisma.lessonSchedule.findMany({
      where: { instructorUserId, status: LessonScheduleStatus.SCHEDULED, lessonDate: { lte: todayDate } },
      orderBy: [{ lessonDate: "asc" }, { startTime: "asc" }],
      take: 50,
      select: rowSelect,
    }),
    prisma.lessonSchedule.findMany({
      where: { instructorUserId, status: { not: LessonScheduleStatus.CANCELLED }, lessonDate: { gte: todayDate } },
      distinct: ["vehicleId"],
      orderBy: [{ lessonDate: "asc" }],
      take: 50,
      select: { vehicle: { select: { id: true, registrationNumber: true, make: true, model: true, status: true } } },
    }),
  ]);

  // A scheduled lesson on an earlier day, or earlier today, has ended and still needs attendance or an outcome.
  const overdue = overdueRows.map(toRow).filter((row) => {
    if (row.lessonDate < today) return true;
    return minutesOfDay(row.endTime) <= now.minutes;
  });

  const todaysLessons = todayRows.map(toRow);
  return {
    today,
    todayCount: todaysLessons.filter((row) => row.status !== LessonScheduleStatus.CANCELLED).length,
    upcomingCount,
    completedToday,
    todaysLessons,
    upcoming: upcomingRows.map(toRow),
    pendingActions: overdue.map((lesson) => ({
      lesson,
      needs: lesson.attendance === null ? "attendance" : "outcome",
    })),
    vehicles: uniqueVehicles(vehicleRows.map((row) => row.vehicle)),
  };
}

function uniqueVehicles(
  vehicles: { id: string; registrationNumber: string; make: string | null; model: string | null; status: VehicleStatus }[],
) {
  const seen = new Map<string, { id: string; registrationNumber: string; label: string; status: VehicleStatus }>();
  for (const vehicle of vehicles) {
    if (seen.has(vehicle.id)) continue;
    seen.set(vehicle.id, {
      id: vehicle.id,
      registrationNumber: vehicle.registrationNumber,
      status: vehicle.status,
      label: [vehicle.make, vehicle.model].filter(Boolean).join(" ") || vehicle.registrationNumber,
    });
  }
  return [...seen.values()];
}

export type LessonDetail = InstructorLessonRow & {
  enrollmentId: string;
  student: InstructorLessonRow["student"] & { phoneNumber: string };
  progress: { completedSessions: number; requiredSessions: number };
  feedback: { feedback: string; rating: number | null } | null;
  permissions: {
    canRecordAttendance: boolean;
    canComplete: boolean;
    canCancel: boolean;
    canWriteFeedback: boolean;
  };
};

/**
 * One lesson the instructor is assigned to. The student's phone number is included because the instructor
 * needs it on the lesson. Addresses, NIC numbers, birthdays and email addresses are not included.
 * Progress counts completed lessons of this student's requirement. It does not list other lessons.
 */
export async function getLessonDetail(instructorUserId: string, lessonId: string): Promise<LessonDetail> {
  const lesson = await prisma.lessonSchedule.findFirst({
    where: { id: lessonId, instructorUserId },
    select: {
      ...rowSelect,
      enrollmentId: true,
      student: { select: { userId: true, fullName: true, phoneNumber: true } },
      requirement: { select: { requiredSessions: true } },
      feedback: { select: { id: true, feedback: true, rating: true } },
    },
  });
  if (!lesson) {
    throw new AuthError(404, "Lesson not found.");
  }

  const completedSessions = await prisma.lessonSchedule.count({
    where: {
      enrollmentId: lesson.enrollmentId,
      vehicleType: lesson.vehicleType,
      trainingType: lesson.trainingType,
      status: LessonScheduleStatus.COMPLETED,
    },
  });

  const base = toRow(lesson);
  const today = schoolNow().date;
  const status = { status: lesson.status, attendance: lesson.attendance };
  return {
    ...base,
    enrollmentId: lesson.enrollmentId,
    student: { ...base.student, phoneNumber: lesson.student.phoneNumber },
    progress: { completedSessions, requiredSessions: lesson.requirement.requiredSessions },
    feedback: lesson.feedback ? { feedback: lesson.feedback.feedback, rating: lesson.feedback.rating } : null,
    permissions: {
      canRecordAttendance: canRecordAttendance({ status: lesson.status, lessonDate: base.lessonDate }, today),
      canComplete: canComplete(status),
      canCancel: canCancel(status),
      canWriteFeedback: canWriteFeedback(status),
    },
  };
}

/** Records or corrects attendance. It never changes the lesson status. The record shows who recorded it and when. */
export async function recordAttendance(instructorUserId: string, lessonId: string, attendance: AttendanceStatus) {
  const lesson = await prisma.lessonSchedule.findFirst({
    where: { id: lessonId, instructorUserId },
    select: { status: true, lessonDate: true },
  });
  if (!lesson) throw new AuthError(404, "Lesson not found.");

  const today = schoolNow().date;
  if (!canRecordAttendance({ status: lesson.status, lessonDate: dateToString(lesson.lessonDate) }, today)) {
    throw new AuthError(409, "Attendance can only be recorded for a lesson that is not cancelled and has started.");
  }

  const result = await prisma.lessonSchedule.updateMany({
    where: {
      id: lessonId,
      instructorUserId,
      status: { not: LessonScheduleStatus.CANCELLED },
      lessonDate: { lte: parseDateOnly(today) ?? undefined },
    },
    data: { attendance, attendanceMarkedAt: new Date(), attendanceMarkedByUserId: instructorUserId },
  });
  if (result.count !== 1) throw new AuthError(409, CHANGED_MESSAGE);
  return { attendance };
}

/** Marks a scheduled lesson completed. Attendance must already be recorded. Nothing completes a lesson automatically. */
export async function completeLesson(instructorUserId: string, lessonId: string) {
  const lesson = await prisma.lessonSchedule.findFirst({
    where: { id: lessonId, instructorUserId },
    select: { status: true, attendance: true },
  });
  if (!lesson) throw new AuthError(404, "Lesson not found.");

  if (!canComplete(lesson)) {
    if (lesson.status === LessonScheduleStatus.CANCELLED) throw new AuthError(409, "A cancelled lesson cannot be completed.");
    if (lesson.status === LessonScheduleStatus.COMPLETED) throw new AuthError(409, "This lesson is already completed.");
    throw new AuthError(409, "Record attendance before completing the lesson.");
  }

  const result = await prisma.lessonSchedule.updateMany({
    where: {
      id: lessonId,
      instructorUserId,
      status: LessonScheduleStatus.SCHEDULED,
      attendance: { not: null },
    },
    data: { status: LessonScheduleStatus.COMPLETED },
  });
  if (result.count !== 1) throw new AuthError(409, CHANGED_MESSAGE);
  return { status: LessonScheduleStatus.COMPLETED };
}

/**
 * Cancels a scheduled lesson. The row is kept, so the history stays intact. No replacement lesson is created
 * and the student is not rescheduled.
 */
export async function cancelLesson(instructorUserId: string, lessonId: string) {
  const lesson = await prisma.lessonSchedule.findFirst({
    where: { id: lessonId, instructorUserId },
    select: { status: true },
  });
  if (!lesson) throw new AuthError(404, "Lesson not found.");

  if (!canCancel(lesson)) {
    throw new AuthError(409, "Only a scheduled lesson can be cancelled.");
  }

  const result = await prisma.lessonSchedule.updateMany({
    where: { id: lessonId, instructorUserId, status: LessonScheduleStatus.SCHEDULED },
    data: { status: LessonScheduleStatus.CANCELLED },
  });
  if (result.count !== 1) throw new AuthError(409, CHANGED_MESSAGE);
  return { status: LessonScheduleStatus.CANCELLED };
}

/**
 * Creates or updates the feedback for a completed lesson. There is one record per lesson. The database trigger
 * also rejects feedback written by anyone other than the assigned instructor.
 */
export async function saveLessonFeedback(instructorUserId: string, lessonId: string, input: FeedbackInput) {
  return prisma.$transaction(async (tx) => {
    const lesson = await tx.lessonSchedule.findFirst({
      where: { id: lessonId, instructorUserId },
      select: { status: true },
    });
    if (!lesson) throw new AuthError(404, "Lesson not found.");
    if (!canWriteFeedback(lesson)) {
      throw new AuthError(409, "Feedback can be written once the lesson is completed.");
    }

    const saved = await tx.lessonFeedback.upsert({
      where: { lessonScheduleId: lessonId },
      create: { lessonScheduleId: lessonId, instructorUserId, feedback: input.feedback, rating: input.rating },
      update: { feedback: input.feedback, rating: input.rating },
      select: { feedback: true, rating: true },
    });
    return saved;
  });
}

export type StudentProgress = {
  student: { userId: string; fullName: string; phoneNumber: string };
  requirements: { vehicleType: string; trainingType: string; requiredSessions: number; completedSessions: number }[];
  lessons: {
    id: string;
    lessonDate: string;
    startTime: string;
    endTime: string;
    status: LessonScheduleStatus;
    attendance: AttendanceStatus | null;
    feedback: { feedback: string; rating: number | null } | null;
  }[];
};

/**
 * A student's training progress as this instructor may see it. It covers only the requirements this instructor has
 * taught the student, and only this instructor's lessons with that student. The completed count for a requirement
 * includes every instructor's completed lessons for it, as a number only, so it matches the lesson detail page.
 * A student this instructor has never taught is reported as not found.
 */
export async function getStudentProgress(instructorUserId: string, studentUserId: string): Promise<StudentProgress> {
  const lessons = await prisma.lessonSchedule.findMany({
    where: { instructorUserId, studentUserId },
    orderBy: [{ lessonDate: "desc" }, { startTime: "desc" }],
    take: 200,
    select: {
      id: true,
      lessonDate: true,
      startTime: true,
      endTime: true,
      status: true,
      attendance: true,
      enrollmentId: true,
      vehicleType: true,
      trainingType: true,
      feedback: { select: { feedback: true, rating: true } },
    },
  });
  if (lessons.length === 0) {
    throw new AuthError(404, "Student not found.");
  }

  const keyOf = (lesson: { enrollmentId: string; vehicleType: string; trainingType: string }) =>
    `${lesson.enrollmentId}|${lesson.vehicleType}|${lesson.trainingType}`;
  const keys = [...new Map(lessons.map((lesson) => [keyOf(lesson), lesson])).values()];
  const keyFilter = keys.map((lesson) => ({
    enrollmentId: lesson.enrollmentId,
    vehicleType: lesson.vehicleType,
    trainingType: lesson.trainingType,
  }));

  const [requirements, completedGroups, student] = await Promise.all([
    prisma.enrollmentTrainingRequirement.findMany({
      where: { OR: keyFilter },
      select: { enrollmentId: true, vehicleType: true, trainingType: true, requiredSessions: true },
    }),
    prisma.lessonSchedule.groupBy({
      by: ["enrollmentId", "vehicleType", "trainingType"],
      where: { studentUserId, status: LessonScheduleStatus.COMPLETED, OR: keyFilter },
      _count: { _all: true },
    }),
    prisma.studentProfile.findUnique({
      where: { userId: studentUserId },
      select: { userId: true, fullName: true, phoneNumber: true },
    }),
  ]);
  if (!student) {
    throw new AuthError(404, "Student not found.");
  }

  const completedByKey = new Map(completedGroups.map((group) => [keyOf(group), group._count._all]));
  return {
    student,
    requirements: requirements.map((requirement) => ({
      vehicleType: requirement.vehicleType,
      trainingType: requirement.trainingType,
      requiredSessions: requirement.requiredSessions,
      completedSessions: completedByKey.get(keyOf(requirement)) ?? 0,
    })),
    lessons: lessons.map((lesson) => ({
      id: lesson.id,
      lessonDate: dateToString(lesson.lessonDate),
      startTime: timeToString(lesson.startTime),
      endTime: timeToString(lesson.endTime),
      status: lesson.status,
      attendance: lesson.attendance,
      feedback: lesson.feedback ? { feedback: lesson.feedback.feedback, rating: lesson.feedback.rating } : null,
    })),
  };
}
