// Database-backed. Real lesson booking (bookPracticalLesson) with maintenance faults and vehicle status.
// Safety-critical faults are warnings only: a fault never removes a vehicle from booking. Only the vehicle status does.
// Runs only on the guarded disposable target (see tests/setup.ts). Resets the test tables first.
import { beforeEach, describe, expect, it } from "vitest";
import { LessonScheduleStatus, VehicleStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { bookPracticalLesson } from "@/lib/student/lesson-booking";
import { createFault, getMaintenanceOverview } from "@/lib/vehicles/maintenance-data";
import { parseFaultInput } from "@/lib/vehicles/maintenance-input";
import { LESSON_DATE, seedStudentWorld } from "./student-fixtures";

let fixture: Awaited<ReturnType<typeof seedStudentWorld>>;

const TODAY = "2099-05-01";
/** The booking refusal when no instructor and vehicle combination is free (src/lib/student/lesson-booking.ts). */
const NO_VEHICLE_MESSAGE = "That time is no longer available. Choose another time.";

function booking() {
  return {
    studentUserId: "STU-A",
    enrollmentId: fixture.enrollments.A1,
    requirementId: fixture.requirements.A1,
    lessonDate: LESSON_DATE,
    startTime: "09:00",
    durationMinutes: 30,
  };
}

async function criticalFault(vehicleId: string) {
  const parsed = parseFaultInput({ severity: "CRITICAL", description: "Brake fluid leak", reportedOn: TODAY, makesUnavailable: false }, TODAY);
  if (!parsed.ok) throw new Error(parsed.message);
  return createFault(vehicleId, "ADMIN-1", parsed.value);
}

beforeEach(async () => {
  fixture = await seedStudentWorld();
});

describe("booking eligibility with maintenance faults", () => {
  it("books an ACTIVE vehicle that has an open safety-critical fault, and the administrator sees a warning only", async () => {
    await criticalFault("V1");
    const lesson = await bookPracticalLesson(booking());
    const row = await prisma.lessonSchedule.findUniqueOrThrow({ where: { id: lesson.id } });
    expect(row.vehicleId).toBe("V1");
    expect(row.status).toBe(LessonScheduleStatus.SCHEDULED);

    const vehicle = await prisma.vehicle.findUniqueOrThrow({ where: { id: "V1" } });
    expect(vehicle.status).toBe(VehicleStatus.ACTIVE);
    const overview = await getMaintenanceOverview("V1", TODAY);
    expect(overview.lessonAvailability.available).toBe(true);
    expect(overview.faultWarnings).toHaveLength(1);
  });

  it("does not book a vehicle in MAINTENANCE, even with no fault recorded", async () => {
    await prisma.vehicle.update({ where: { id: "V1" }, data: { status: VehicleStatus.MAINTENANCE } });
    await prisma.vehicle.update({ where: { id: "V2" }, data: { status: VehicleStatus.MAINTENANCE } });
    await expect(bookPracticalLesson(booking())).rejects.toMatchObject({ status: 409, message: NO_VEHICLE_MESSAGE });
    expect(await prisma.lessonSchedule.count({ where: { studentUserId: "STU-A" } })).toBe(0);
  });

  it("does not book a vehicle that is INACTIVE, even when it has an open critical fault", async () => {
    await criticalFault("V1");
    await prisma.vehicle.update({ where: { id: "V1" }, data: { status: VehicleStatus.INACTIVE } });
    await prisma.vehicle.update({ where: { id: "V2" }, data: { status: VehicleStatus.MAINTENANCE } });
    await expect(bookPracticalLesson(booking())).rejects.toMatchObject({ status: 409, message: NO_VEHICLE_MESSAGE });
    expect(await prisma.lessonSchedule.count({ where: { studentUserId: "STU-A" } })).toBe(0);
  });

  it("books the other ACTIVE vehicle when one vehicle is in MAINTENANCE, even if that one has a critical fault", async () => {
    await criticalFault("V1");
    await prisma.vehicle.update({ where: { id: "V1" }, data: { status: VehicleStatus.MAINTENANCE } });
    const lesson = await bookPracticalLesson(booking());
    const row = await prisma.lessonSchedule.findUniqueOrThrow({ where: { id: lesson.id } });
    expect(row.vehicleId).toBe("V2");
  });
});
