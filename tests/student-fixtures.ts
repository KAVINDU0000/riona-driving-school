import { prisma } from "@/lib/prisma";
import { UserRole, PackageType, VehicleType, TrainingType, VehicleStatus, LessonScheduleStatus } from "@/generated/prisma/enums";
import { parseDateOnly, parseTimeOnly } from "@/lib/student/time";
import { createAccount, resetDatabase } from "./helpers";

/** A fixed future date, so bookings are never in the past and the tests stay stable. */
export const LESSON_DATE = "2099-06-01";

/**
 * Seeds one practical training world: a package, two cars and one maintenance car, one instructor available
 * 09:00 to 12:00 on LESSON_DATE, and two students. STU-A has two active enrollments in the same package, which
 * exercises independent progress. STU-B has one enrollment.
 */
export async function seedStudentWorld() {
  await resetDatabase();

  await createAccount({ userId: "INS-1", email: "ins1@riona.test", role: UserRole.INSTRUCTOR });
  await createAccount({ userId: "STU-A", email: "a@riona.test", role: UserRole.STUDENT });
  await createAccount({ userId: "STU-B", email: "b@riona.test", role: UserRole.STUDENT });
  await createAccount({ userId: "ADMIN-1", email: "admin@riona.test", role: UserRole.ADMIN });

  const pkg = await prisma.trainingPackage.create({
    data: { name: "Car Training", packageType: PackageType.REGULAR, price: 26000 },
  });

  await prisma.vehicle.createMany({
    data: [
      { id: "V1", vehicleType: VehicleType.CAR, registrationNumber: "CAB-1", status: VehicleStatus.ACTIVE, make: "Toyota", model: "Vitz" },
      { id: "V2", vehicleType: VehicleType.CAR, registrationNumber: "CAB-2", status: VehicleStatus.ACTIVE },
      { id: "V3", vehicleType: VehicleType.CAR, registrationNumber: "CAB-3", status: VehicleStatus.MAINTENANCE },
    ],
  });

  await prisma.instructorAvailability.create({
    data: {
      instructorUserId: "INS-1",
      availabilityDate: parseDateOnly(LESSON_DATE)!,
      startTime: parseTimeOnly("09:00")!,
      endTime: parseTimeOnly("12:00")!,
    },
  });

  const enrollments: Record<string, string> = {};
  const requirements: Record<string, string> = {};
  const seed = [
    { key: "A1", student: "STU-A", required: 3 },
    { key: "A2", student: "STU-A", required: 2 },
    { key: "B1", student: "STU-B", required: 3 },
  ];
  for (const item of seed) {
    const enrollment = await prisma.enrollment.create({
      data: {
        studentUserId: item.student,
        packageId: pkg.id,
        agreedPrice: 26000,
        finalFee: 26000,
      },
    });
    const requirement = await prisma.enrollmentTrainingRequirement.create({
      data: {
        enrollmentId: enrollment.id,
        vehicleType: VehicleType.CAR,
        trainingType: TrainingType.REGULAR,
        requiredSessions: item.required,
      },
    });
    enrollments[item.key] = enrollment.id;
    requirements[item.key] = requirement.id;
  }

  return { packageId: pkg.id, enrollments, requirements };
}

/** Inserts a lesson directly, for setting up states the booking flow cannot create (for example, a completed lesson). */
export async function insertLesson(options: {
  id: string;
  studentUserId: string;
  enrollmentKey: string;
  fixture: { enrollments: Record<string, string> };
  start: string;
  end: string;
  instructorUserId?: string;
  vehicleId?: string;
  status?: LessonScheduleStatus;
  attendance?: "PRESENT" | "ABSENT" | "LATE" | null;
}) {
  const start = parseTimeOnly(options.start)!;
  const end = parseTimeOnly(options.end)!;
  return prisma.lessonSchedule.create({
    data: {
      id: options.id,
      lessonDate: parseDateOnly(LESSON_DATE)!,
      startTime: start,
      endTime: end,
      durationMinutes: (end.getTime() - start.getTime()) / 60000,
      instructorUserId: options.instructorUserId ?? "INS-1",
      vehicleId: options.vehicleId ?? "V1",
      vehicleType: VehicleType.CAR,
      studentUserId: options.studentUserId,
      enrollmentId: options.fixture.enrollments[options.enrollmentKey],
      trainingType: TrainingType.REGULAR,
      status: options.status ?? LessonScheduleStatus.SCHEDULED,
      attendance: options.attendance ?? null,
    },
  });
}
