import { beforeEach, describe, expect, it } from "vitest";
import { LessonScheduleStatus, PaymentMethod, PaymentStatus, VehicleStatus } from "@/generated/prisma/enums";
import { POST as statusRoute } from "@/app/api/admin/vehicles/[vehicleId]/status/route";
import { POST as cancelRoute } from "@/app/api/instructor/lessons/[id]/cancel/route";
import { cancelLesson } from "@/lib/instructor/lessons";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getEnrollments, getLessons } from "@/lib/student/data";
import { parseDateOnly } from "@/lib/student/time";
import { postRequest } from "./helpers";
import { insertLesson, LESSON_DATE, seedStudentWorld } from "./student-fixtures";

let fixture: Awaited<ReturnType<typeof seedStudentWorld>>;

async function adminCookie() {
  const { token } = await createSession("ADMIN-1");
  return `riona_session=${token}`;
}

async function instructorCookie() {
  const { token } = await createSession("INS-1");
  return `riona_session=${token}`;
}

async function updatedAtOf(vehicleId: string) {
  return (await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId }, select: { updatedAt: true } })).updatedAt.toISOString();
}

/** Cancels one lesson on vehicle V1 through the admin vehicle-status change, the way an admin does it. */
async function adminCancelsLessonOnV1(lessonId: string, reason: unknown) {
  return statusRoute(
    postRequest(
      "/api/admin/vehicles/V1/status",
      {
        status: "INACTIVE",
        expectedUpdatedAt: await updatedAtOf("V1"),
        resolutions: [{ lessonId, action: "CANCEL", reason }],
      },
      { cookie: await adminCookie() },
    ),
    { params: Promise.resolve({ vehicleId: "V1" }) },
  );
}

/** Remaining sessions for STU-A's first enrollment (required 3 car sessions). */
async function remainingForA1() {
  const enrollments = await getEnrollments("STU-A");
  const enrollment = enrollments.find((item) => item.id === fixture.enrollments.A1)!;
  return enrollment.progress[0].remaining;
}

beforeEach(async () => {
  fixture = await seedStudentWorld();
});

describe("admin cancellation records the reason, the admin and the time", () => {
  it("stores the trimmed reason, the admin who cancelled and the time on the lesson", async () => {
    await insertLesson({ id: "L-admin", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "09:00", end: "10:00" });
    const before = Date.now();
    const response = await adminCancelsLessonOnV1("L-admin", "  Vehicle is being retired  ");
    expect(response.status).toBe(200);

    const row = await prisma.lessonSchedule.findUniqueOrThrow({ where: { id: "L-admin" } });
    expect(row.status).toBe(LessonScheduleStatus.CANCELLED);
    expect(row.cancellationReason).toBe("Vehicle is being retired");
    expect(row.cancelledByUserId).toBe("ADMIN-1");
    expect(row.cancelledAt!.getTime()).toBeGreaterThanOrEqual(before - 1000);
  });

  it("refuses a blank reason, and the lesson stays scheduled", async () => {
    await insertLesson({ id: "L-blank", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "09:00", end: "10:00" });
    const response = await adminCancelsLessonOnV1("L-blank", "    ");
    expect(response.status).toBe(400);
    const row = await prisma.lessonSchedule.findUniqueOrThrow({ where: { id: "L-blank" } });
    expect(row.status).toBe(LessonScheduleStatus.SCHEDULED);
    expect(row.cancellationReason).toBeNull();
    expect(await prisma.vehicle.findUniqueOrThrow({ where: { id: "V1" } })).toMatchObject({ status: VehicleStatus.ACTIVE });
  });

  it("refuses a missing reason", async () => {
    await insertLesson({ id: "L-missing", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "09:00", end: "10:00" });
    const response = await adminCancelsLessonOnV1("L-missing", undefined);
    expect(response.status).toBe(400);
    expect((await prisma.lessonSchedule.findUniqueOrThrow({ where: { id: "L-missing" } })).status).toBe(LessonScheduleStatus.SCHEDULED);
  });

  it("refuses a reason longer than 300 characters", async () => {
    await insertLesson({ id: "L-long", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "09:00", end: "10:00" });
    const response = await adminCancelsLessonOnV1("L-long", "x".repeat(301));
    expect(response.status).toBe(400);
  });
});

describe("instructor cancellation records the reason, the instructor and the time", () => {
  it("stores the reason, the instructor who cancelled and the time", async () => {
    await insertLesson({ id: "L-ins", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "09:00", end: "10:00" });
    const before = Date.now();
    await cancelLesson("INS-1", "L-ins", "Instructor is unwell");
    const row = await prisma.lessonSchedule.findUniqueOrThrow({ where: { id: "L-ins" } });
    expect(row.status).toBe(LessonScheduleStatus.CANCELLED);
    expect(row.cancellationReason).toBe("Instructor is unwell");
    expect(row.cancelledByUserId).toBe("INS-1");
    expect(row.cancelledAt!.getTime()).toBeGreaterThanOrEqual(before - 1000);
  });

  it("refuses a blank or missing reason through the API, and changes nothing", async () => {
    await insertLesson({ id: "L-ins-blank", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "09:00", end: "10:00" });
    const blank = await cancelRoute(postRequest("/api/instructor/lessons/L-ins-blank/cancel", { reason: "  " }, { cookie: await instructorCookie() }), {
      params: Promise.resolve({ id: "L-ins-blank" }),
    });
    expect(blank.status).toBe(400);
    const missing = await cancelRoute(postRequest("/api/instructor/lessons/L-ins-blank/cancel", {}, { cookie: await instructorCookie() }), {
      params: Promise.resolve({ id: "L-ins-blank" }),
    });
    expect(missing.status).toBe(400);
    const row = await prisma.lessonSchedule.findUniqueOrThrow({ where: { id: "L-ins-blank" } });
    expect(row.status).toBe(LessonScheduleStatus.SCHEDULED);
    expect(row.cancellationReason).toBeNull();
  });

  it("the API accepts a reason and cancels the lesson", async () => {
    await insertLesson({ id: "L-ins-api", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "09:00", end: "10:00" });
    const response = await cancelRoute(
      postRequest("/api/instructor/lessons/L-ins-api/cancel", { reason: "Instructor is unwell" }, { cookie: await instructorCookie() }),
      { params: Promise.resolve({ id: "L-ins-api" }) },
    );
    expect(response.status).toBe(200);
    expect((await prisma.lessonSchedule.findUniqueOrThrow({ where: { id: "L-ins-api" } })).cancellationReason).toBe("Instructor is unwell");
  });
});

describe("historical cancellations with no reason stay valid", () => {
  it("accepts a cancelled lesson with no reason, and the database does not reject it", async () => {
    await insertLesson({
      id: "L-historic",
      studentUserId: "STU-A",
      enrollmentKey: "A1",
      fixture,
      start: "09:00",
      end: "10:00",
      status: LessonScheduleStatus.CANCELLED,
    });
    const row = await prisma.lessonSchedule.findUniqueOrThrow({ where: { id: "L-historic" } });
    expect(row.status).toBe(LessonScheduleStatus.CANCELLED);
    expect(row.cancellationReason).toBeNull();
    expect(row.cancelledAt).toBeNull();
    expect(row.cancelledByUserId).toBeNull();
  });

  it("the database refuses a blank stored reason", async () => {
    await insertLesson({ id: "L-db", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "09:00", end: "10:00" });
    await expect(prisma.lessonSchedule.update({ where: { id: "L-db" }, data: { cancellationReason: "   " } })).rejects.toThrow();
  });

  it("the student sees that no reason was recorded, not a guessed one", async () => {
    await insertLesson({
      id: "L-historic-view",
      studentUserId: "STU-A",
      enrollmentKey: "A1",
      fixture,
      start: "09:00",
      end: "10:00",
      status: LessonScheduleStatus.CANCELLED,
    });
    const lessons = await getLessons("STU-A");
    const row = lessons.upcoming.find((lesson) => lesson.id === "L-historic-view")!;
    expect(row.cancellation).toEqual({ reason: null, cancelledAt: null, cancelledBy: null });
  });
});

describe("what a student can see about a cancellation", () => {
  it("shows the reason, the time and that the school cancelled, without any staff ID", async () => {
    await insertLesson({ id: "L-visible", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "09:00", end: "10:00" });
    await adminCancelsLessonOnV1("L-visible", "Vehicle is being retired");

    const lessons = await getLessons("STU-A");
    const row = lessons.upcoming.find((lesson) => lesson.id === "L-visible")!;
    expect(row.status).toBe(LessonScheduleStatus.CANCELLED);
    expect(row.cancellation).toEqual({
      reason: "Vehicle is being retired",
      cancelledAt: expect.any(String),
      cancelledBy: "SCHOOL",
    });
    expect(Object.keys(row.cancellation!).sort()).toEqual(["cancelledAt", "cancelledBy", "reason"]);
    // The cancellation details carry no staff ID. (The instructor's display name is shown on every lesson, as before.)
    expect(JSON.stringify(row.cancellation)).not.toContain("ADMIN-1");
    expect(JSON.stringify(row.cancellation)).not.toContain("INS-1");
  });

  it("shows that the instructor cancelled, by role only", async () => {
    await insertLesson({ id: "L-by-ins", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "09:00", end: "10:00" });
    await cancelLesson("INS-1", "L-by-ins", "Instructor is unwell");
    const row = (await getLessons("STU-A")).upcoming.find((lesson) => lesson.id === "L-by-ins")!;
    expect(row.cancellation?.cancelledBy).toBe("INSTRUCTOR");
    expect(row.cancellation?.reason).toBe("Instructor is unwell");
  });

  it("another student never sees this cancellation", async () => {
    await insertLesson({ id: "L-private", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "09:00", end: "10:00" });
    await cancelLesson("INS-1", "L-private", "Instructor is unwell");
    const other = await getLessons("STU-B");
    expect(other.upcoming.map((lesson) => lesson.id)).not.toContain("L-private");
    expect(other.past.map((lesson) => lesson.id)).not.toContain("L-private");
  });

  it("a scheduled lesson has no cancellation details", async () => {
    await insertLesson({ id: "L-open", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "09:00", end: "10:00" });
    const row = (await getLessons("STU-A")).upcoming.find((lesson) => lesson.id === "L-open")!;
    expect(row.cancellation).toBeNull();
  });
});

describe("session balance and payments on cancellation", () => {
  it("a scheduled lesson uses a session, and an instructor cancellation gives it back", async () => {
    expect(await remainingForA1()).toBe(3);
    await insertLesson({ id: "L-bal-1", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "09:00", end: "10:00" });
    expect(await remainingForA1()).toBe(2);
    await cancelLesson("INS-1", "L-bal-1", "Instructor is unwell");
    expect(await remainingForA1()).toBe(3);
  });

  it("an admin cancellation gives the session back too", async () => {
    await insertLesson({ id: "L-bal-2", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "09:00", end: "10:00" });
    expect(await remainingForA1()).toBe(2);
    expect((await adminCancelsLessonOnV1("L-bal-2", "Vehicle is being retired")).status).toBe(200);
    expect(await remainingForA1()).toBe(3);
  });

  it("a historical cancellation with no reason never used a session, so it changes nothing", async () => {
    await insertLesson({
      id: "L-bal-3",
      studentUserId: "STU-A",
      enrollmentKey: "A1",
      fixture,
      start: "09:00",
      end: "10:00",
      status: LessonScheduleStatus.CANCELLED,
    });
    expect(await remainingForA1()).toBe(3);
  });

  it("cancelling never changes payments, and creates no refund or credit", async () => {
    const enrollmentId = fixture.enrollments.A1;
    await prisma.payment.create({
      data: {
        enrollmentId,
        amount: 26000,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        paymentDate: parseDateOnly(LESSON_DATE)!,
        status: PaymentStatus.APPROVED,
        reviewedByUserId: "ADMIN-1",
        lastReviewedAt: new Date(),
      },
    });
    const paymentsBefore = await prisma.payment.findMany({ where: { enrollmentId }, orderBy: { id: "asc" } });
    const enrollmentBefore = await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollmentId } });

    await insertLesson({ id: "L-pay", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "09:00", end: "10:00" });
    await cancelLesson("INS-1", "L-pay", "Instructor is unwell");

    const paymentsAfter = await prisma.payment.findMany({ where: { enrollmentId }, orderBy: { id: "asc" } });
    expect(paymentsAfter).toEqual(paymentsBefore);
    expect(await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollmentId } })).toEqual(enrollmentBefore);
    expect(await prisma.payment.count()).toBe(paymentsBefore.length);
  });

  it("the cancelled lesson stays in the record with its status", async () => {
    await insertLesson({ id: "L-kept", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "09:00", end: "10:00" });
    await cancelLesson("INS-1", "L-kept", "Instructor is unwell");
    expect(await prisma.lessonSchedule.count({ where: { id: "L-kept" } })).toBe(1);
    expect((await prisma.lessonSchedule.findUniqueOrThrow({ where: { id: "L-kept" } })).status).toBe(LessonScheduleStatus.CANCELLED);
  });
});
