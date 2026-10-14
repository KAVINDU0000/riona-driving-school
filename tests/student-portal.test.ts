import { beforeEach, describe, expect, it } from "vitest";
import { ExamStatus, ExamType, LessonScheduleStatus, MedicalAppointmentStatus, PaymentMethod, PaymentStatus, UserRole } from "@/generated/prisma/enums";
import { POST as updateProfile } from "@/app/api/student/profile/route";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getAppointments, getAttendance, getDashboard, getEnrollments, getFeedback, getLessons, getPayments, getStudentProfile, maskNic } from "@/lib/student/data";
import { parseProfileUpdate } from "@/lib/student/profile";
import { createAccount, postRequest } from "./helpers";
import { insertLesson, seedStudentWorld } from "./student-fixtures";

let fixture: Awaited<ReturnType<typeof seedStudentWorld>>;

async function cookieFor(userId: string) {
  const { token } = await createSession(userId);
  return `riona_session=${token}`;
}

/** Two lessons for STU-A and one for STU-B, with feedback and attendance on some of them. */
async function seedLessons() {
  await insertLesson({ id: "LA-1", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "09:00", end: "09:30", status: LessonScheduleStatus.COMPLETED, attendance: "PRESENT" });
  await insertLesson({ id: "LA-2", studentUserId: "STU-A", enrollmentKey: "A2", fixture, start: "10:00", end: "10:30", attendance: null, vehicleId: "V2" });
  await insertLesson({ id: "LB-1", studentUserId: "STU-B", enrollmentKey: "B1", fixture, start: "11:00", end: "11:30", status: LessonScheduleStatus.COMPLETED, attendance: "ABSENT" });
  await prisma.lessonFeedback.create({ data: { id: "FB-A", lessonScheduleId: "LA-1", instructorUserId: "INS-1", feedback: "Good mirror checks", rating: 4 } });
  await prisma.lessonFeedback.create({ data: { id: "FB-B", lessonScheduleId: "LB-1", instructorUserId: "INS-1", feedback: "Private note about B", rating: 2 } });
}

describe("student portal data is scoped to the signed-in student", () => {
  beforeEach(async () => {
    fixture = await seedStudentWorld();
    await seedLessons();
  });

  it("lessons, attendance and feedback never include another student's records", async () => {
    const lessons = await getLessons("STU-A");
    const ids = [...lessons.upcoming, ...lessons.past].map((l) => l.id);
    expect(ids).toEqual(expect.arrayContaining(["LA-1", "LA-2"]));
    expect(ids).not.toContain("LB-1");

    const attendance = await getAttendance("STU-A");
    expect(attendance.rows.map((r) => r.id)).not.toContain("LB-1");
    expect(attendance.summary).toMatchObject({ present: 1, absent: 0 });

    const feedback = await getFeedback("STU-A");
    expect(feedback.map((f) => f.text)).toEqual(["Good mirror checks"]);
    expect(JSON.stringify(feedback)).not.toContain("Private note about B");
  });

  it("the dashboard for a student contains only that student's lessons and enrollments", async () => {
    const dashboard = await getDashboard("STU-B");
    expect(dashboard.enrollments.map((e) => e.id)).toEqual([fixture.enrollments.B1]);
    expect(dashboard.attendance).toMatchObject({ absent: 1, present: 0 });
    expect(dashboard.nextLesson).toBeNull();
  });

  it("a student with no records gets empty data, not invented figures", async () => {
    await createEmptyStudent("STU-C");
    const dashboard = await getDashboard("STU-C");
    expect(dashboard.enrollments).toEqual([]);
    expect(dashboard.progress).toEqual({ completed: 0, required: 0 });
    expect(dashboard.registration).toBeNull();
    expect(dashboard.upcomingAppointments).toEqual([]);
  });

  it("the profile exposes only the fields the portal needs, with the NIC masked", async () => {
    const profile = await getStudentProfile("STU-A");
    expect(profile).not.toBeNull();
    expect(profile!.studentId).toBe("STU-A");
    expect(profile!.nicMasked).toBe(maskNic("NIC-STU-A"));
    expect(JSON.stringify(profile)).not.toContain("NIC-STU-A");
    expect(JSON.stringify(profile)).not.toMatch(/passwordHash|tokenHash/);
  });

  it("two active enrollments in the same package keep their progress and fees separate", async () => {
    const enrollments = await getEnrollments("STU-A");
    expect(enrollments).toHaveLength(2);

    const first = enrollments.find((e) => e.id === fixture.enrollments.A1)!;
    const second = enrollments.find((e) => e.id === fixture.enrollments.A2)!;
    expect(first.progress[0]).toMatchObject({ requiredSessions: 3, completed: 1, scheduled: 0, remaining: 2 });
    expect(second.progress[0]).toMatchObject({ requiredSessions: 2, completed: 0, scheduled: 1, remaining: 1 });
    expect(first.finalFee).toBe(26000);
    expect(second.finalFee).toBe(26000);
  });

  it("appointments show only the student's own medical and exam records", async () => {
    await prisma.studentMedical.create({
      data: { id: "MED-A", studentUserId: "STU-A", appointmentDate: new Date("2099-07-01T09:00:00Z"), status: MedicalAppointmentStatus.SCHEDULED },
    });
    await prisma.studentMedical.create({
      data: { id: "MED-B", studentUserId: "STU-B", appointmentDate: new Date("2099-07-02T09:00:00Z"), status: MedicalAppointmentStatus.SCHEDULED },
    });
    await prisma.studentExam.create({
      data: { id: "EXAM-B", studentUserId: "STU-B", examType: ExamType.WRITTEN, scheduledDate: new Date("2099-07-03T09:00:00Z"), status: ExamStatus.SCHEDULED },
    });
    await prisma.appointmentDateHistory.create({
      data: {
        appointmentType: "MEDICAL",
        studentMedicalId: "MED-A",
        previousDate: new Date("2099-06-30T09:00:00Z"),
        newDate: new Date("2099-07-01T09:00:00Z"),
        reason: "Clinic rescheduled",
        changedByUserId: "ADMIN-1",
      },
    });

    const appointments = await getAppointments("STU-A");
    expect(appointments.medical.map((m) => m.id)).toEqual(["MED-A"]);
    expect(appointments.exams).toEqual([]);
    expect(appointments.medical[0].dateHistory).toHaveLength(1);
    expect(JSON.stringify(appointments)).not.toContain("ADMIN-1");
  });

  it("payments show only payments on the student's enrollments or on an application approved into the account", async () => {
    await prisma.payment.create({
      data: { id: "PAY-A", enrollmentId: fixture.enrollments.A1, amount: 13000, paymentMethod: PaymentMethod.BANK_TRANSFER, paymentDate: new Date("2099-05-01T00:00:00Z"), status: PaymentStatus.APPROVED, reviewedByUserId: "ADMIN-1", lastReviewedAt: new Date("2099-05-02T00:00:00Z") },
    });
    await prisma.payment.create({
      data: { id: "PAY-B", enrollmentId: fixture.enrollments.B1, amount: 26000, paymentMethod: PaymentMethod.BANK_DEPOSIT, paymentDate: new Date("2099-05-01T00:00:00Z") },
    });

    const payments = await getPayments("STU-A");
    expect(payments.map((p) => p.id)).toEqual(["PAY-A"]);
    expect(payments[0].status).toBe("APPROVED");
    expect(JSON.stringify(payments)).not.toContain("ADMIN-1");
  });
});

describe("profile updates cannot change protected fields", () => {
  beforeEach(async () => {
    fixture = await seedStudentWorld();
  });

  it("updates address and mobile only, and ignores role, status, email, identifier and fees", async () => {
    const response = await updateProfile(
      postRequest(
        "/api/student/profile",
        {
          address: "  12 New Road,   Kandy  ",
          phoneNumber: "077 111 2233",
          role: "ADMIN",
          status: "INACTIVE",
          email: "hacker@example.com",
          userId: "STU-X",
          finalFee: 1,
          studentUserId: "STU-B",
        },
        { cookie: await cookieFor("STU-A") },
      ),
    );
    expect(response.status).toBe(200);

    const user = await prisma.user.findUniqueOrThrow({ where: { userId: "STU-A" } });
    expect(user).toMatchObject({ role: UserRole.STUDENT, status: "ACTIVE", email: "a@riona.test" });
    const profile = await prisma.studentProfile.findUniqueOrThrow({ where: { userId: "STU-A" } });
    expect(profile.address).toBe("12 New Road, Kandy");
    expect(profile.phoneNumber).toBe("0771112233");
    expect(await prisma.user.findUnique({ where: { userId: "STU-X" } })).toBeNull();
  });

  it("rejects an invalid mobile number or address without changing anything", async () => {
    await expect(() => parseProfileUpdate({ address: "12 New Road", phoneNumber: "12345" })).toThrow();
    const response = await updateProfile(
      postRequest("/api/student/profile", { address: "", phoneNumber: "0771112233" }, { cookie: await cookieFor("STU-A") }),
    );
    expect(response.status).toBe(400);
    const profile = await prisma.studentProfile.findUniqueOrThrow({ where: { userId: "STU-A" } });
    expect(profile.address).toBe("Colombo");
  });

  it("requires a student session", async () => {
    expect((await updateProfile(postRequest("/api/student/profile", { address: "12 New Road", phoneNumber: "0771112233" }))).status).toBe(401);
    expect(
      (await updateProfile(postRequest("/api/student/profile", { address: "12 New Road", phoneNumber: "0771112233" }, { cookie: await cookieFor("INS-1") }))).status,
    ).toBe(403);
  });
});

async function createEmptyStudent(userId: string) {
  await createAccount({ userId, email: `${userId.toLowerCase()}@riona.test`, role: UserRole.STUDENT });
}
