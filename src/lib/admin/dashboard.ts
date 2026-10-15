import {
  AccountStatus,
  ExamStatus,
  LessonScheduleStatus,
  MedicalAppointmentStatus,
  PaymentStatus,
  RegistrationStatus,
  UserRole,
  VehicleStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { dateToString, minutesOfDay, parseDateOnly, schoolNow, timeToString } from "@/lib/student/time";

/*
 * Dashboard statistics for the admin portal. Each figure is a count over existing records, using the status
 * and date rules written next to it. Day-based figures use the school's timezone (Asia/Colombo).
 *
 * Not included: outstanding balances. The project has no rule for the amount owed on an enrolment or application
 * (enrolment fees and payments are recorded, but nothing defines what is still due), so no figure is shown.
 */

export type AdminDashboardStats = {
  /** Local calendar date the day-based figures refer to, as YYYY-MM-DD. */
  today: string;
  /** RegistrationRequest.status = PENDING. */
  pendingApplications: number;
  /** Student users who are ACTIVE and have a student profile. */
  activeStudents: number;
  /** Instructor users who are ACTIVE and whose instructor profile is ACTIVE. */
  activeInstructors: number;
  /** Scheduled lessons dated today (school time). Cancelled and completed lessons are not counted. */
  todaysScheduledLessons: number;
  /**
   * Scheduled lessons whose date has passed, or whose end time has passed today. They still need attendance or an
   * outcome. This is the same rule the instructor dashboard uses.
   */
  lessonsNeedingAction: number;
  /** Medical appointments with status SCHEDULED whose date is now or later. */
  upcomingMedicalAppointments: number;
  /** Exams with status SCHEDULED whose date is now or later. */
  upcomingExams: number;
  /** Payment.status = PENDING. Bank slips that are waiting for review. */
  pendingPaymentReviews: number;
  /** Vehicles whose status is MAINTENANCE or INACTIVE. */
  vehiclesNeedingAttention: number;
};

/** Counts for the admin dashboard, computed from the database at request time. */
export async function getAdminDashboardStats(now: Date = new Date()): Promise<AdminDashboardStats> {
  const school = schoolNow(now);
  const today = school.date;
  const todayDate = parseDateOnly(today) ?? undefined;

  const [
    pendingApplications,
    activeStudents,
    activeInstructors,
    todaysScheduledLessons,
    overdueCandidates,
    upcomingMedicalAppointments,
    upcomingExams,
    pendingPaymentReviews,
    vehiclesNeedingAttention,
  ] = await Promise.all([
    prisma.registrationRequest.count({ where: { status: RegistrationStatus.PENDING } }),
    prisma.user.count({
      where: { role: UserRole.STUDENT, status: AccountStatus.ACTIVE, studentProfile: { isNot: null } },
    }),
    prisma.user.count({
      where: {
        role: UserRole.INSTRUCTOR,
        status: AccountStatus.ACTIVE,
        instructorProfile: { status: AccountStatus.ACTIVE },
      },
    }),
    prisma.lessonSchedule.count({ where: { lessonDate: todayDate, status: LessonScheduleStatus.SCHEDULED } }),
    // Every scheduled lesson dated today or earlier. The end-time test for today is applied below.
    prisma.lessonSchedule.findMany({
      where: { status: LessonScheduleStatus.SCHEDULED, lessonDate: { lte: todayDate } },
      select: { lessonDate: true, endTime: true },
    }),
    prisma.studentMedical.count({
      where: { status: MedicalAppointmentStatus.SCHEDULED, appointmentDate: { gte: now } },
    }),
    prisma.studentExam.count({ where: { status: ExamStatus.SCHEDULED, scheduledDate: { gte: now } } }),
    prisma.payment.count({ where: { status: PaymentStatus.PENDING } }),
    prisma.vehicle.count({ where: { status: { in: [VehicleStatus.MAINTENANCE, VehicleStatus.INACTIVE] } } }),
  ]);

  const lessonsNeedingAction = overdueCandidates.filter((lesson) => {
    const day = dateToString(lesson.lessonDate);
    if (day < today) return true;
    return minutesOfDay(timeToString(lesson.endTime)) <= school.minutes;
  }).length;

  return {
    today,
    pendingApplications,
    activeStudents,
    activeInstructors,
    todaysScheduledLessons,
    lessonsNeedingAction,
    upcomingMedicalAppointments,
    upcomingExams,
    pendingPaymentReviews,
    vehiclesNeedingAttention,
  };
}
