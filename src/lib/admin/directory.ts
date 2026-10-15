import { AccountStatus, EnrollmentStatus, ExamStatus, LessonScheduleStatus, MedicalAppointmentStatus, UserRole } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { ADMIN_PAGE_SIZE, SEARCH_MAX_LENGTH, pageCount } from "@/lib/admin/query";
import { prisma } from "@/lib/prisma";
import { getEnrollments } from "@/lib/student/data";
import { dateToString, parseDateOnly, schoolNow, timeToString } from "@/lib/student/time";

/*
 * Read-only directories for the admin portal: students and instructors. Nothing here writes. Filters apply in
 * the database, and every list is paged. Lists show the least personal data needed to find someone (the NIC
 * is masked in lists, shown in full on the profile). Profiles show what the school's records hold: registration,
 * enrollments, lessons and appointments. Medical appointment notes are never selected.
 */

export type DirectoryStatus = "ACTIVE" | "INACTIVE" | "ALL";

export type DirectoryQuery = { q: string; status: DirectoryStatus; page: number };

/**
 * Reads the directory's URL parameters. Unlike the registration API this is lenient: an unknown status or a bad
 * page number falls back to the default, so a shared link never shows an error page.
 */
export function directoryQuery(input: { q?: string; status?: string; page?: string }): DirectoryQuery {
  const q = (input.q ?? "").trim().slice(0, SEARCH_MAX_LENGTH);
  const status: DirectoryStatus = input.status === "ACTIVE" || input.status === "INACTIVE" ? input.status : "ALL";
  const page = /^[1-9][0-9]{0,5}$/.test(input.page ?? "") ? Number(input.page) : 1;
  return { q, status, page };
}

/** Masks a NIC for lists. Only the last four characters remain visible. */
function maskNic(nic: string) {
  return nic.length <= 4 ? "••••" : `${"•".repeat(Math.max(4, nic.length - 4))}${nic.slice(-4)}`;
}

/** Student IDs and instructor IDs are short codes such as STU-001. Anything else cannot match a profile. */
export function isDirectoryId(value: string) {
  return /^[A-Za-z0-9-]{1,32}$/.test(value);
}

function paged(total: number, page: number) {
  return { total, page, pageSize: ADMIN_PAGE_SIZE, pageCount: pageCount(total) };
}

function todayDate() {
  return parseDateOnly(schoolNow().date)!;
}

// ---------- Students ----------

/** Student accounts with a student profile, filtered by the account's status and searched by ID, name, email, NIC or phone. */
export async function listStudents(query: DirectoryQuery) {
  const conditions: Prisma.UserWhereInput[] = [{ role: UserRole.STUDENT, studentProfile: { isNot: null } }];
  if (query.status !== "ALL") conditions.push({ status: query.status as AccountStatus });
  if (query.q) {
    conditions.push({
      OR: [
        { userId: { contains: query.q, mode: "insensitive" } },
        { email: { contains: query.q, mode: "insensitive" } },
        {
          studentProfile: {
            is: {
              OR: [
                { fullName: { contains: query.q, mode: "insensitive" } },
                { nicNumber: { contains: query.q, mode: "insensitive" } },
                { phoneNumber: { contains: query.q, mode: "insensitive" } },
              ],
            },
          },
        },
      ],
    });
  }
  const where: Prisma.UserWhereInput = { AND: conditions };

  const [total, rows] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { userId: "asc" },
      skip: (query.page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: {
        userId: true,
        email: true,
        status: true,
        studentProfile: {
          select: {
            fullName: true,
            nicNumber: true,
            phoneNumber: true,
            _count: { select: { enrollments: { where: { status: EnrollmentStatus.ACTIVE } } } },
          },
        },
      },
    }),
  ]);

  return {
    students: rows
      .filter((row) => row.studentProfile !== null)
      .map((row) => ({
        studentId: row.userId,
        fullName: row.studentProfile!.fullName,
        email: row.email,
        phoneNumber: row.studentProfile!.phoneNumber,
        nicMasked: maskNic(row.studentProfile!.nicNumber),
        accountStatus: row.status,
        activeEnrollments: row.studentProfile!._count.enrollments,
      })),
    ...paged(total, query.page),
  };
}

/** One student's record for the admin profile. Returns null when the ID is not a student with a profile. */
export async function getStudentProfile(studentId: string) {
  const user = await prisma.user.findFirst({
    where: { userId: studentId, role: UserRole.STUDENT },
    select: {
      userId: true,
      email: true,
      status: true,
      createdAt: true,
      studentProfile: {
        select: { fullName: true, address: true, birthday: true, nicNumber: true, phoneNumber: true, startDate: true },
      },
    },
  });
  if (!user?.studentProfile) return null;

  const today = todayDate();
  const [enrollments, lessonCounts, upcomingLessons, medical, exams, registration] = await Promise.all([
    getEnrollments(studentId),
    prisma.lessonSchedule.groupBy({ by: ["status"], where: { studentUserId: studentId }, _count: { _all: true } }),
    prisma.lessonSchedule.findMany({
      where: { studentUserId: studentId, lessonDate: { gte: today }, status: LessonScheduleStatus.SCHEDULED },
      orderBy: [{ lessonDate: "asc" }, { startTime: "asc" }],
      take: 10,
      select: {
        id: true,
        lessonDate: true,
        startTime: true,
        endTime: true,
        vehicleType: true,
        trainingType: true,
        instructor: { select: { fullName: true } },
      },
    }),
    // Only the date and status are read. The appointment note is medical text and is not shown to the admin list.
    prisma.studentMedical.findMany({
      where: { studentUserId: studentId, status: MedicalAppointmentStatus.SCHEDULED, appointmentDate: { gte: new Date() } },
      orderBy: { appointmentDate: "asc" },
      take: 5,
      select: { appointmentDate: true, status: true },
    }),
    prisma.studentExam.findMany({
      where: { studentUserId: studentId, status: ExamStatus.SCHEDULED, scheduledDate: { gte: new Date() } },
      orderBy: { scheduledDate: "asc" },
      take: 5,
      select: { examType: true, vehicleType: true, scheduledDate: true, status: true },
    }),
    prisma.registrationRequest.findFirst({
      where: { approvedStudentUserId: studentId },
      select: {
        referenceNumber: true,
        status: true,
        submittedAt: true,
        reviewedAt: true,
        selectedPackage: { select: { name: true } },
      },
    }),
  ]);

  const counts = { SCHEDULED: 0, COMPLETED: 0, CANCELLED: 0 };
  for (const row of lessonCounts) counts[row.status as keyof typeof counts] = row._count._all;

  return {
    student: {
      studentId: user.userId,
      email: user.email,
      accountStatus: user.status,
      createdAt: user.createdAt.toISOString(),
      fullName: user.studentProfile.fullName,
      address: user.studentProfile.address,
      birthday: dateToString(user.studentProfile.birthday),
      nicNumber: user.studentProfile.nicNumber,
      phoneNumber: user.studentProfile.phoneNumber,
      startDate: user.studentProfile.startDate ? dateToString(user.studentProfile.startDate) : null,
    },
    registration: registration
      ? {
          referenceNumber: registration.referenceNumber,
          status: registration.status,
          packageName: registration.selectedPackage.name,
          submittedAt: registration.submittedAt.toISOString(),
          reviewedAt: registration.reviewedAt?.toISOString() ?? null,
        }
      : null,
    enrollments,
    lessonCounts: counts,
    upcomingLessons: upcomingLessons.map((lesson) => ({
      id: lesson.id,
      lessonDate: dateToString(lesson.lessonDate),
      startTime: timeToString(lesson.startTime),
      endTime: timeToString(lesson.endTime),
      vehicleType: lesson.vehicleType,
      trainingType: lesson.trainingType,
      instructorName: lesson.instructor.fullName,
    })),
    upcomingMedical: medical.map((item) => ({ appointmentDate: item.appointmentDate.toISOString(), status: item.status })),
    upcomingExams: exams.map((exam) => ({
      examType: exam.examType,
      vehicleType: exam.vehicleType,
      scheduledDate: exam.scheduledDate.toISOString(),
      status: exam.status,
    })),
  };
}

// ---------- Instructors ----------

/**
 * Instructor accounts with an instructor profile. "Active" means the account and the profile are both active,
 * the same rule the dashboard count uses. "Inactive" means either one is not.
 */
export async function listInstructors(query: DirectoryQuery) {
  const conditions: Prisma.UserWhereInput[] = [{ role: UserRole.INSTRUCTOR, instructorProfile: { isNot: null } }];
  if (query.status === "ACTIVE") {
    conditions.push({ status: AccountStatus.ACTIVE, instructorProfile: { is: { status: AccountStatus.ACTIVE } } });
  } else if (query.status === "INACTIVE") {
    conditions.push({
      OR: [{ status: AccountStatus.INACTIVE }, { instructorProfile: { is: { status: AccountStatus.INACTIVE } } }],
    });
  }
  if (query.q) {
    conditions.push({
      OR: [
        { userId: { contains: query.q, mode: "insensitive" } },
        { email: { contains: query.q, mode: "insensitive" } },
        {
          instructorProfile: {
            is: {
              OR: [
                { fullName: { contains: query.q, mode: "insensitive" } },
                { phoneNumber: { contains: query.q, mode: "insensitive" } },
              ],
            },
          },
        },
      ],
    });
  }
  const where: Prisma.UserWhereInput = { AND: conditions };
  const today = todayDate();

  const [total, rows] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { userId: "asc" },
      skip: (query.page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: {
        userId: true,
        email: true,
        status: true,
        instructorProfile: {
          select: {
            fullName: true,
            phoneNumber: true,
            status: true,
            _count: {
              select: { lessonSchedules: { where: { status: LessonScheduleStatus.SCHEDULED, lessonDate: { gte: today } } } },
            },
          },
        },
      },
    }),
  ]);

  return {
    instructors: rows
      .filter((row) => row.instructorProfile !== null)
      .map((row) => ({
        instructorId: row.userId,
        fullName: row.instructorProfile!.fullName,
        email: row.email,
        phoneNumber: row.instructorProfile!.phoneNumber,
        accountStatus: row.status,
        profileStatus: row.instructorProfile!.status,
        upcomingScheduledLessons: row.instructorProfile!._count.lessonSchedules,
      })),
    ...paged(total, query.page),
  };
}

/**
 * One instructor's record for the admin profile. Workload counts cover the current school month. Upcoming
 * lessons and availability are from today. Returns null when the ID is not an instructor with a profile.
 */
export async function getInstructorProfile(instructorId: string) {
  const user = await prisma.user.findFirst({
    where: { userId: instructorId, role: UserRole.INSTRUCTOR },
    select: {
      userId: true,
      email: true,
      status: true,
      createdAt: true,
      instructorProfile: { select: { fullName: true, phoneNumber: true, hireDate: true, status: true } },
    },
  });
  if (!user?.instructorProfile) return null;

  const today = todayDate();
  const monthStart = parseDateOnly(`${schoolNow().date.slice(0, 8)}01`)!;
  const [monthCounts, upcomingLessons, upcomingAvailability, feedbackCount] = await Promise.all([
    prisma.lessonSchedule.groupBy({
      by: ["status"],
      where: { instructorUserId: instructorId, lessonDate: { gte: monthStart, lte: today } },
      _count: { _all: true },
    }),
    prisma.lessonSchedule.findMany({
      where: { instructorUserId: instructorId, lessonDate: { gte: today }, status: LessonScheduleStatus.SCHEDULED },
      orderBy: [{ lessonDate: "asc" }, { startTime: "asc" }],
      take: 10,
      select: {
        id: true,
        lessonDate: true,
        startTime: true,
        endTime: true,
        vehicleType: true,
        trainingType: true,
        student: { select: { fullName: true } },
      },
    }),
    prisma.instructorAvailability.count({ where: { instructorUserId: instructorId, availabilityDate: { gte: today } } }),
    prisma.lessonFeedback.count({ where: { instructorUserId: instructorId } }),
  ]);

  const counts = { SCHEDULED: 0, COMPLETED: 0, CANCELLED: 0 };
  for (const row of monthCounts) counts[row.status as keyof typeof counts] = row._count._all;

  return {
    instructor: {
      instructorId: user.userId,
      email: user.email,
      accountStatus: user.status,
      createdAt: user.createdAt.toISOString(),
      fullName: user.instructorProfile.fullName,
      phoneNumber: user.instructorProfile.phoneNumber,
      hireDate: dateToString(user.instructorProfile.hireDate),
      profileStatus: user.instructorProfile.status,
    },
    monthLabel: schoolNow().date.slice(0, 7),
    monthCounts: counts,
    upcomingLessons: upcomingLessons.map((lesson) => ({
      id: lesson.id,
      lessonDate: dateToString(lesson.lessonDate),
      startTime: timeToString(lesson.startTime),
      endTime: timeToString(lesson.endTime),
      vehicleType: lesson.vehicleType,
      trainingType: lesson.trainingType,
      studentName: lesson.student.fullName,
    })),
    upcomingAvailabilityWindows: upcomingAvailability,
    feedbackCount,
  };
}
