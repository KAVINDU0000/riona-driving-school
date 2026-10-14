import { LessonScheduleStatus, MedicalAppointmentStatus, ExamStatus, PaymentStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { dateToString, parseDateOnly, schoolNow, timeToString } from "@/lib/student/time";

/**
 * Read models for the student portal. Every function takes the user ID from the verified session, and every
 * query filters on it. Nothing here accepts a student ID from the browser.
 *
 * Fields selected here are the only ones the UI may show. Password hashes, session and token data, reviewer
 * IDs and other administrative fields are never selected.
 */

/** Shows only the last four characters of a NIC. */
export function maskNic(nic: string): string {
  return nic.length <= 4 ? "••••" : `${"•".repeat(Math.max(4, nic.length - 4))}${nic.slice(-4)}`;
}

function todayDate(): Date {
  return parseDateOnly(schoolNow().date)!;
}

export async function getStudentProfile(userId: string) {
  const [user, profile, activeEnrollments] = await Promise.all([
    prisma.user.findUnique({ where: { userId }, select: { userId: true, email: true, status: true } }),
    prisma.studentProfile.findUnique({
      where: { userId },
      select: { fullName: true, address: true, birthday: true, nicNumber: true, phoneNumber: true, startDate: true },
    }),
    prisma.enrollment.count({ where: { studentUserId: userId, status: "ACTIVE" } }),
  ]);
  if (!user || !profile) return null;

  return {
    studentId: user.userId,
    email: user.email,
    accountStatus: user.status,
    fullName: profile.fullName,
    birthday: dateToString(profile.birthday),
    nicMasked: maskNic(profile.nicNumber),
    address: profile.address,
    phoneNumber: profile.phoneNumber,
    startDate: profile.startDate ? dateToString(profile.startDate) : null,
    activeEnrollments,
  };
}

/** The registration linked to this student. Applications are linked only after the school approves them. */
export async function getRegistration(userId: string) {
  return prisma.registrationRequest.findFirst({
    where: { approvedStudentUserId: userId },
    select: {
      referenceNumber: true,
      status: true,
      submittedAt: true,
      reviewedAt: true,
      packagePriceAtSubmission: true,
      selectedPackage: { select: { name: true, packageType: true } },
    },
  });
}

export async function getEnrollments(userId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentUserId: userId },
    orderBy: { enrollmentDate: "desc" },
    select: {
      id: true,
      status: true,
      enrollmentDate: true,
      agreedPrice: true,
      finalFee: true,
      completedAt: true,
      package: { select: { name: true, packageType: true, sessionDurationMinutes: true, durationDays: true } },
      trainingRequirements: {
        orderBy: [{ vehicleType: "asc" }, { trainingType: "asc" }],
        select: { id: true, vehicleType: true, trainingType: true, requiredSessions: true },
      },
      payments: { select: { amount: true, status: true } },
    },
  });

  // One query for every lesson in these enrollments, grouped in memory by requirement key.
  const lessons = await prisma.lessonSchedule.findMany({
    where: { studentUserId: userId, enrollmentId: { in: enrollments.map((e) => e.id) } },
    select: { enrollmentId: true, vehicleType: true, trainingType: true, status: true },
  });

  return enrollments.map((enrollment) => {
    const progress = enrollment.trainingRequirements.map((requirement) => {
      const mine = lessons.filter(
        (l) =>
          l.enrollmentId === enrollment.id &&
          l.vehicleType === requirement.vehicleType &&
          l.trainingType === requirement.trainingType,
      );
      const completed = mine.filter((l) => l.status === LessonScheduleStatus.COMPLETED).length;
      const scheduled = mine.filter((l) => l.status === LessonScheduleStatus.SCHEDULED).length;
      return {
        id: requirement.id,
        vehicleType: requirement.vehicleType,
        trainingType: requirement.trainingType,
        requiredSessions: requirement.requiredSessions,
        completed,
        scheduled,
        remaining: Math.max(0, requirement.requiredSessions - completed - scheduled),
      };
    });

    const approvedPaid = enrollment.payments
      .filter((p) => p.status === PaymentStatus.APPROVED)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      id: enrollment.id,
      status: enrollment.status,
      enrollmentDate: enrollment.enrollmentDate,
      completedAt: enrollment.completedAt,
      packageName: enrollment.package.name,
      packageType: enrollment.package.packageType,
      durationDays: enrollment.package.durationDays,
      sessionDurationMinutes: enrollment.package.sessionDurationMinutes,
      agreedPrice: Number(enrollment.agreedPrice),
      finalFee: Number(enrollment.finalFee),
      approvedPaid,
      progress,
    };
  });
}

export type LessonRow = {
  id: string;
  lessonDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: LessonScheduleStatus;
  attendance: string | null;
  vehicleType: string;
  trainingType: string;
  instructorName: string;
  vehicleLabel: string;
  feedback: { text: string; rating: number | null } | null;
};

function lessonRow(lesson: {
  id: string;
  lessonDate: Date;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  status: LessonScheduleStatus;
  attendance: string | null;
  vehicleType: string;
  trainingType: string;
  instructor: { fullName: string };
  vehicle: { make: string | null; model: string | null };
  feedback: { feedback: string; rating: number | null } | null;
}): LessonRow {
  return {
    id: lesson.id,
    lessonDate: dateToString(lesson.lessonDate),
    startTime: timeToString(lesson.startTime),
    endTime: timeToString(lesson.endTime),
    durationMinutes: lesson.durationMinutes,
    status: lesson.status,
    attendance: lesson.attendance,
    vehicleType: lesson.vehicleType,
    trainingType: lesson.trainingType,
    instructorName: lesson.instructor.fullName,
    vehicleLabel: [lesson.vehicle.make, lesson.vehicle.model].filter(Boolean).join(" ") || lesson.vehicleType,
    feedback: lesson.feedback ? { text: lesson.feedback.feedback, rating: lesson.feedback.rating } : null,
  };
}

const lessonSelect = {
  id: true,
  lessonDate: true,
  startTime: true,
  endTime: true,
  durationMinutes: true,
  status: true,
  attendance: true,
  vehicleType: true,
  trainingType: true,
  instructor: { select: { fullName: true } },
  vehicle: { select: { make: true, model: true } },
  feedback: { select: { feedback: true, rating: true } },
} as const;

/** The student's own lessons. Upcoming first, then the most recent past lessons. */
export async function getLessons(userId: string) {
  const today = todayDate();
  const [upcoming, past] = await Promise.all([
    prisma.lessonSchedule.findMany({
      where: { studentUserId: userId, lessonDate: { gte: today }, status: { not: LessonScheduleStatus.CANCELLED } },
      orderBy: [{ lessonDate: "asc" }, { startTime: "asc" }],
      take: 100,
      select: lessonSelect,
    }),
    prisma.lessonSchedule.findMany({
      where: { studentUserId: userId, lessonDate: { lt: today } },
      orderBy: [{ lessonDate: "desc" }, { startTime: "desc" }],
      take: 50,
      select: lessonSelect,
    }),
  ]);
  return { upcoming: upcoming.map(lessonRow), past: past.map(lessonRow) };
}

export async function getAttendance(userId: string) {
  const lessons = await prisma.lessonSchedule.findMany({
    where: { studentUserId: userId, status: { not: LessonScheduleStatus.CANCELLED } },
    orderBy: [{ lessonDate: "desc" }, { startTime: "desc" }],
    take: 200,
    select: lessonSelect,
  });
  const rows = lessons.map(lessonRow);
  const summary = { present: 0, absent: 0, late: 0, notRecorded: 0 };
  for (const row of rows) {
    if (row.attendance === "PRESENT") summary.present += 1;
    else if (row.attendance === "ABSENT") summary.absent += 1;
    else if (row.attendance === "LATE") summary.late += 1;
    else summary.notRecorded += 1;
  }
  return { rows, summary };
}

/** Feedback on the student's own lessons only. The student never sees feedback written for another student. */
export async function getFeedback(userId: string) {
  const feedback = await prisma.lessonFeedback.findMany({
    where: { lesson: { studentUserId: userId } },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      feedback: true,
      rating: true,
      createdAt: true,
      lesson: { select: { lessonDate: true, startTime: true, vehicleType: true, instructor: { select: { fullName: true } } } },
    },
  });
  return feedback.map((item) => ({
    text: item.feedback,
    rating: item.rating,
    givenAt: item.createdAt,
    lessonDate: dateToString(item.lesson.lessonDate),
    lessonStart: timeToString(item.lesson.startTime),
    vehicleType: item.lesson.vehicleType,
    instructorName: item.lesson.instructor.fullName,
  }));
}

/**
 * Payments that belong to this student: those on their enrollments, and those on an application that was
 * approved into their account. Slip file keys are never returned, and reviewer identities are not selected.
 */
export async function getPayments(userId: string) {
  const payments = await prisma.payment.findMany({
    where: {
      OR: [{ enrollment: { studentUserId: userId } }, { registrationRequest: { approvedStudentUserId: userId } }],
    },
    orderBy: { paymentDate: "desc" },
    take: 200,
    select: {
      id: true,
      amount: true,
      paymentMethod: true,
      paymentDate: true,
      status: true,
      transactionReference: true,
      bankName: true,
      branch: true,
      accountNumberLast4: true,
      lastReviewedAt: true,
      enrollment: { select: { id: true, package: { select: { name: true } } } },
      registrationRequest: { select: { referenceNumber: true, selectedPackage: { select: { name: true } } } },
      slips: { orderBy: { uploadedAt: "desc" }, select: { id: true, originalFileName: true, uploadedAt: true } },
      reviewHistory: { orderBy: { reviewedAt: "desc" }, take: 1, select: { decision: true, reason: true, reviewedAt: true } },
    },
  });

  return payments.map((payment) => {
    const latestReview = payment.reviewHistory[0] ?? null;
    return {
      id: payment.id,
      amount: Number(payment.amount),
      method: payment.paymentMethod,
      paymentDate: payment.paymentDate,
      status: payment.status,
      transactionReference: payment.transactionReference,
      bankName: payment.bankName,
      branch: payment.branch,
      accountLast4: payment.accountNumberLast4,
      appliesTo: payment.enrollment
        ? { kind: "enrollment" as const, label: payment.enrollment.package.name }
        : payment.registrationRequest
          ? { kind: "registration" as const, label: payment.registrationRequest.selectedPackage.name }
          : null,
      reviewedAt: payment.lastReviewedAt,
      rejectionReason: payment.status === PaymentStatus.REJECTED ? (latestReview?.reason ?? null) : null,
      slips: payment.slips.map((slip) => ({ id: slip.id, fileName: slip.originalFileName, uploadedAt: slip.uploadedAt })),
    };
  });
}

/** The payment-slip upload is available only for bank-transfer or bank-deposit payments that are still pending. */
export function canUploadSlip(payment: { status: PaymentStatus }): boolean {
  return payment.status === PaymentStatus.PENDING;
}

export async function getAppointments(userId: string) {
  const [medical, exams] = await Promise.all([
    prisma.studentMedical.findMany({
      where: { studentUserId: userId },
      orderBy: { appointmentDate: "desc" },
      take: 50,
      select: {
        id: true,
        appointmentDate: true,
        status: true,
        description: true,
        dateHistory: {
          orderBy: { changedAt: "desc" },
          select: { previousDate: true, newDate: true, reason: true, changedAt: true },
        },
      },
    }),
    prisma.studentExam.findMany({
      where: { studentUserId: userId },
      orderBy: { scheduledDate: "desc" },
      take: 50,
      select: {
        id: true,
        examType: true,
        vehicleType: true,
        scheduledDate: true,
        status: true,
        result: true,
        description: true,
        dateHistory: {
          orderBy: { changedAt: "desc" },
          select: { previousDate: true, newDate: true, reason: true, changedAt: true },
        },
      },
    }),
  ]);

  const now = new Date();
  const isUpcoming = (date: Date, status: string) =>
    date.getTime() >= now.getTime() - 24 * 60 * 60 * 1000 &&
    (status === MedicalAppointmentStatus.SCHEDULED || status === ExamStatus.SCHEDULED || status === ExamStatus.RESCHEDULED || status === MedicalAppointmentStatus.RESCHEDULED);

  return {
    medical: medical.map((item) => ({ ...item, upcoming: isUpcoming(item.appointmentDate, item.status) })),
    exams: exams.map((item) => ({ ...item, upcoming: isUpcoming(item.scheduledDate, item.status) })),
  };
}

/** Dashboard summary built from the same reads as the detail pages. Each figure comes from stored records. */
export async function getDashboard(userId: string) {
  const [profile, registration, enrollments, lessons, attendance, appointments] = await Promise.all([
    getStudentProfile(userId),
    getRegistration(userId),
    getEnrollments(userId),
    getLessons(userId),
    getAttendance(userId),
    getAppointments(userId),
  ]);

  const requirements = enrollments.flatMap((e) => e.progress);
  const completed = requirements.reduce((sum, r) => sum + r.completed, 0);
  const required = requirements.reduce((sum, r) => sum + r.requiredSessions, 0);
  const now = schoolNow();

  const nextLesson =
    lessons.upcoming.find((l) => l.status === LessonScheduleStatus.SCHEDULED && (l.lessonDate > now.date || (l.lessonDate === now.date && minutesFrom(l.startTime) > now.minutes))) ?? null;

  return {
    profile,
    registration,
    enrollments,
    nextLesson,
    recentLessons: lessons.past.slice(0, 5),
    attendance: attendance.summary,
    progress: { completed, required },
    upcomingAppointments: [
      ...appointments.medical.filter((a) => a.upcoming).map((a) => ({ kind: "medical" as const, date: a.appointmentDate, status: a.status })),
      ...appointments.exams.filter((e) => e.upcoming).map((e) => ({ kind: "exam" as const, date: e.scheduledDate, status: e.status, examType: e.examType })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime()),
  };
}

function minutesFrom(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}
