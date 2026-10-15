import { beforeEach, describe, expect, it } from "vitest";
import { PaymentMethod, PaymentStatus, RegistrationStatus, TrainingType, VehicleStatus, VehicleType, AccountStatus, LessonScheduleStatus } from "@/generated/prisma/enums";
import { getAdminDashboardStats } from "@/lib/admin/dashboard";
import { prisma } from "@/lib/prisma";
import { shiftDate } from "@/lib/instructor/lesson-rules";
import { parseDateOnly, parseTimeOnly, schoolNow } from "@/lib/student/time";
import { seedStudentWorld } from "./student-fixtures";

let fixture: Awaited<ReturnType<typeof seedStudentWorld>>;

async function availability(instructorUserId: string, date: string) {
  await prisma.instructorAvailability.create({
    data: {
      instructorUserId,
      availabilityDate: parseDateOnly(date)!,
      startTime: parseTimeOnly("09:00")!,
      endTime: parseTimeOnly("12:00")!,
    },
  });
}

async function lesson(id: string, date: string, start: string, end: string, instructorUserId = "INS-1") {
  return prisma.lessonSchedule.create({
    data: {
      id,
      lessonDate: parseDateOnly(date)!,
      startTime: parseTimeOnly(start)!,
      endTime: parseTimeOnly(end)!,
      durationMinutes: 30,
      instructorUserId,
      vehicleId: "V1",
      vehicleType: VehicleType.CAR,
      studentUserId: "STU-A",
      enrollmentId: fixture.enrollments.A1,
      trainingType: TrainingType.REGULAR,
      status: LessonScheduleStatus.SCHEDULED,
    },
  });
}

describe("admin dashboard statistics", () => {
  beforeEach(async () => {
    fixture = await seedStudentWorld();
  });

  it("counts the seeded school: active students and instructors, and the vehicle in maintenance", async () => {
    const stats = await getAdminDashboardStats();
    expect(stats.activeStudents).toBe(2);
    expect(stats.activeInstructors).toBe(1);
    expect(stats.pendingApplications).toBe(0);
    expect(stats.vehiclesNeedingAttention).toBe(1);
    expect(stats.pendingPaymentReviews).toBe(0);
    expect(stats.upcomingMedicalAppointments).toBe(0);
  });

  it("counts only pending applications", async () => {
    const base = {
      birthday: new Date("2000-01-01"),
      nicNumber: "NIC-PENDING-1",
      phoneNumber: "0771234567",
      address: "Colombo",
      email: "applicant@riona.test",
      passwordHash: "not-used-by-this-test",
      selectedPackageId: fixture.packageId,
      packagePriceAtSubmission: 26000,
    };
    await prisma.registrationRequest.create({ data: { ...base, referenceNumber: "RDS-DASH0001", fullName: "Pending One" } });
    await prisma.registrationRequest.create({
      data: {
        ...base,
        referenceNumber: "RDS-DASH0002",
        fullName: "Rejected One",
        nicNumber: "NIC-PENDING-2",
        status: RegistrationStatus.REJECTED,
        // A rejected application must record who reviewed it and when (RegistrationRequest_status_consistency_check).
        reviewedAt: new Date(),
        reviewedByUserId: "ADMIN-1",
        rejectionReason: "Test rejection",
      },
    });

    expect((await getAdminDashboardStats()).pendingApplications).toBe(1);
  });

  it("counts a deactivated student out of active students", async () => {
    await prisma.user.update({ where: { userId: "STU-B" }, data: { status: AccountStatus.INACTIVE } });
    expect((await getAdminDashboardStats()).activeStudents).toBe(1);
  });

  it("counts today's scheduled lessons and lessons that have ended but are still scheduled, in school time", async () => {
    const today = schoolNow().date;
    const yesterday = shiftDate(today, -1);
    await availability("INS-1", today);
    await availability("INS-1", yesterday);
    await lesson("DASH-TODAY", today, "09:00", "09:30");
    await lesson("DASH-PAST", yesterday, "09:00", "09:30");

    const stats = await getAdminDashboardStats();
    expect(stats.today).toBe(today);
    expect(stats.todaysScheduledLessons).toBe(1);
    expect(stats.lessonsNeedingAction).toBeGreaterThanOrEqual(1);
  });

  it("counts pending payment reviews, not approved or rejected ones", async () => {
    const registration = await prisma.registrationRequest.create({
      data: {
        referenceNumber: "RDS-DASH0003",
        fullName: "Payer",
        birthday: new Date("2000-01-01"),
        nicNumber: "NIC-PAY-1",
        phoneNumber: "0771234567",
        address: "Colombo",
        email: "payer@riona.test",
        passwordHash: "not-used-by-this-test",
        selectedPackageId: fixture.packageId,
        packagePriceAtSubmission: 26000,
      },
    });
    const base = { registrationRequestId: registration.id, amount: 26000, paymentMethod: PaymentMethod.BANK_TRANSFER, paymentDate: new Date() };
    await prisma.payment.create({ data: { ...base, status: PaymentStatus.PENDING } });
    await prisma.payment.create({ data: { ...base, status: PaymentStatus.REJECTED } });

    expect((await getAdminDashboardStats()).pendingPaymentReviews).toBe(1);
  });

  it("counts upcoming medical appointments only when they are scheduled and in the future", async () => {
    const future = new Date(Date.now() + 2 * 86_400_000);
    const past = new Date(Date.now() - 2 * 86_400_000);
    await prisma.studentMedical.create({ data: { studentUserId: "STU-A", appointmentDate: future } });
    await prisma.studentMedical.create({ data: { studentUserId: "STU-A", appointmentDate: past } });

    expect((await getAdminDashboardStats()).upcomingMedicalAppointments).toBe(1);
  });

  it("counts vehicles in maintenance or inactive together", async () => {
    await prisma.vehicle.update({ where: { id: "V1" }, data: { status: VehicleStatus.INACTIVE } });
    expect((await getAdminDashboardStats()).vehiclesNeedingAttention).toBe(2);
  });
});
