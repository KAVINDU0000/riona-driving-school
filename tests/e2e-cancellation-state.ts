/**
 * Prints the state the lesson-cancellation browser tests check: the lesson, STU-A's remaining sessions for the first
 * enrollment, and every payment and enrollment total for that enrollment. Read-only. It refuses to run against any
 * database except localhost:15432/riona_fresh_test, and it prints no tokens or connection details.
 */
import { prisma } from "@/lib/prisma";
import { getEnrollments } from "@/lib/student/data";

const url = process.env.DATABASE_URL ?? "";
const parsed = new URL(url);
if (!(parsed.hostname === "localhost" && parsed.port === "15432" && parsed.pathname === "/riona_fresh_test")) {
  throw new Error("Refusing to read: target is not localhost:15432/riona_fresh_test.");
}

async function main() {
  const lessonId = process.argv[2];
  if (!lessonId) throw new Error("Pass a lesson ID.");

  const lesson = await prisma.lessonSchedule.findUniqueOrThrow({ where: { id: lessonId } });
  // The enrollment the lesson belongs to: its session balance and its payments are what the test checks.
  const enrollments = await getEnrollments(lesson.studentUserId);
  const own = enrollments.find((item) => item.id === lesson.enrollmentId)!;
  const enrollment = await prisma.enrollment.findUniqueOrThrow({ where: { id: own.id } });
  const payments = await prisma.payment.findMany({
    where: { enrollmentId: own.id },
    select: { id: true, amount: true, status: true, reviewedByUserId: true },
    orderBy: { id: "asc" },
  });

  console.log(
    JSON.stringify({
      lesson: {
        status: lesson.status,
        cancellationReason: lesson.cancellationReason,
        cancelledByUserId: lesson.cancelledByUserId,
        cancelledAtSet: lesson.cancelledAt !== null,
      },
      remainingSessions: own.progress[0].remaining,
      enrollment: { status: enrollment.status, agreedPrice: String(enrollment.agreedPrice), finalFee: String(enrollment.finalFee) },
      payments: payments.map((payment) => ({ ...payment, amount: String(payment.amount) })),
    }),
  );
}

main()
  .catch((error: unknown) => {
    console.error("read failed:", error instanceof Error ? error.name : "UnknownError");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
