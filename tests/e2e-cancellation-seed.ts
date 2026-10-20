import { isApprovedTestUrl } from "./test-target";
/**
 * Seeds the lesson-cancellation browser world into the disposable test database, and prints the session tokens the
 * browser tests use (so they do not sign in through the form and use up the sign-in rate limit). Run by
 * e2e/lesson-cancellation.spec.ts through tsx. It refuses to run against any database except
 * localhost:15432/riona_fresh_test.
 */
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { parseDateOnly } from "@/lib/student/time";
import { LessonScheduleStatus, PaymentMethod, PaymentStatus } from "@/generated/prisma/enums";
import { insertLesson, LESSON_DATE, seedStudentWorld } from "./student-fixtures";

const url = process.env.DATABASE_URL ?? "";
const parsed = new URL(url);
if (!(isApprovedTestUrl(parsed))) {
  throw new Error("Refusing to seed: target is not localhost:15432/riona_fresh_test.");
}

async function main() {
  const fixture = await seedStudentWorld();

  // A payment for STU-A's first enrollment, approved by the admin. Cancelling a lesson must never change it.
  await prisma.payment.create({
    data: {
      enrollmentId: fixture.enrollments.A1,
      amount: 26000,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      paymentDate: parseDateOnly(LESSON_DATE)!,
      status: PaymentStatus.APPROVED,
      reviewedByUserId: "ADMIN-1",
      lastReviewedAt: new Date(),
    },
  });

  // The lesson the instructor cancels in the browser (scheduled, uses one of STU-A's sessions).
  await insertLesson({ id: "CX-SCHED", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "09:00", end: "09:30" });
  // A historical cancellation from before reasons were recorded: no reason, no actor, no time.
  await insertLesson({
    id: "CX-HIST",
    studentUserId: "STU-A",
    enrollmentKey: "A1",
    fixture,
    start: "10:00",
    end: "10:30",
    status: LessonScheduleStatus.CANCELLED,
  });
  // Cancelled by the school through a vehicle change: reason, admin and time are all recorded.
  // Inside INS-1's availability (09:00 to 12:00 on LESSON_DATE), and clear of the other lessons.
  await insertLesson({ id: "CX-SCHOOL", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "10:30", end: "11:00" });
  await prisma.lessonSchedule.update({
    where: { id: "CX-SCHOOL" },
    data: {
      status: LessonScheduleStatus.CANCELLED,
      cancellationReason: "Vehicle is being retired",
      cancelledAt: new Date(),
      cancelledByUserId: "ADMIN-1",
    },
  });
  // STU-B's lesson. STU-A must never see it, and must not be able to cancel it.
  await insertLesson({ id: "CX-OTHER", studentUserId: "STU-B", enrollmentKey: "B1", fixture, start: "11:00", end: "11:30", vehicleId: "V2" });

  const tokens = {
    instructor: (await createSession("INS-1")).token,
    student: (await createSession("STU-A")).token,
    otherStudent: (await createSession("STU-B")).token,
  };
  console.log(JSON.stringify({ tokens }));
}

main()
  .catch((error: unknown) => {
    console.error("seed failed:", error instanceof Error ? error.name : "UnknownError");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
