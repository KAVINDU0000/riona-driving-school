/**
 * Seeds the instructor browser-test world into the disposable test database. Run by e2e/instructor-portal.spec.ts
 * through tsx, which resolves the app's @/ import aliases. It refuses to run against any database except
 * localhost:15432/riona_fresh_test, and it prints only the lesson IDs the browser tests use.
 */
import { createAccount } from "./helpers";
import { seedStudentWorld } from "./student-fixtures";
import { prisma } from "@/lib/prisma";
import { shiftDate } from "@/lib/instructor/lesson-rules";
import { parseDateOnly, parseTimeOnly, schoolNow } from "@/lib/student/time";
import { AttendanceStatus, LessonScheduleStatus, TrainingType, UserRole, VehicleType } from "@/generated/prisma/enums";

const url = process.env.DATABASE_URL ?? "";
const parsed = new URL(url);
if (!(parsed.hostname === "localhost" && parsed.port === "15432" && parsed.pathname === "/riona_fresh_test")) {
  throw new Error("Refusing to seed: target is not localhost:15432/riona_fresh_test.");
}

async function main() {
  const fixture = await seedStudentWorld();
  await createAccount({ userId: "INS-2", email: "ins2@riona.test", role: UserRole.INSTRUCTOR });

  // Lessons go on today's school date, so the dashboard and the week grid show them without fixed dates.
  const today = schoolNow().date;
  const yesterday = shiftDate(today, -1);
  for (const instructorUserId of ["INS-1", "INS-2"]) {
    for (const date of [today, yesterday]) {
      await prisma.instructorAvailability.create({
        data: {
          instructorUserId,
          availabilityDate: parseDateOnly(date)!,
          startTime: parseTimeOnly("09:00")!,
          endTime: parseTimeOnly("12:00")!,
        },
      });
    }
  }

  const lesson = (data: {
    id: string;
    date: string;
    start: string;
    end: string;
    instructorUserId: string;
    studentUserId: string;
    enrollmentKey: "A1" | "B1";
    vehicleId: string;
    status?: LessonScheduleStatus;
    attendance?: AttendanceStatus | null;
  }) => {
    const start = parseTimeOnly(data.start)!;
    const end = parseTimeOnly(data.end)!;
    return prisma.lessonSchedule.create({
      data: {
        id: data.id,
        lessonDate: parseDateOnly(data.date)!,
        startTime: start,
        endTime: end,
        durationMinutes: (end.getTime() - start.getTime()) / 60000,
        instructorUserId: data.instructorUserId,
        vehicleId: data.vehicleId,
        vehicleType: VehicleType.CAR,
        studentUserId: data.studentUserId,
        enrollmentId: fixture.enrollments[data.enrollmentKey],
        trainingType: TrainingType.REGULAR,
        status: data.status ?? LessonScheduleStatus.SCHEDULED,
        attendance: data.attendance ?? null,
      },
    });
  };

  await lesson({ id: "E2E-TODAY", date: today, start: "09:00", end: "09:30", instructorUserId: "INS-1", studentUserId: "STU-A", enrollmentKey: "A1", vehicleId: "V1" });
  await lesson({ id: "E2E-PAST", date: yesterday, start: "09:00", end: "09:30", instructorUserId: "INS-1", studentUserId: "STU-A", enrollmentKey: "A1", vehicleId: "V1" });
  await lesson({ id: "E2E-OTHER", date: today, start: "10:00", end: "10:30", instructorUserId: "INS-2", studentUserId: "STU-B", enrollmentKey: "B1", vehicleId: "V2" });

  console.log(JSON.stringify({ todayLessonId: "E2E-TODAY", otherLessonId: "E2E-OTHER" }));
}

main()
  .catch((error: unknown) => {
    console.error("seed failed:", error instanceof Error ? error.name : "UnknownError");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
