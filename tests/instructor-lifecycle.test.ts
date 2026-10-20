import { beforeEach, describe, expect, it } from "vitest";
import { AttendanceStatus, LessonScheduleStatus, UserRole, VehicleStatus } from "@/generated/prisma/enums";
import { POST as faultRoute } from "@/app/api/instructor/vehicles/[vehicleId]/faults/route";
import { PUT as notesRoute } from "@/app/api/instructor/lessons/[id]/notes/route";
import { AuthError } from "@/lib/auth/http";
import { createSession } from "@/lib/auth/session";
import {
  cancelLesson,
  completeLesson,
  getDashboardSummary,
  getLessonDetail,
  listAssignedStudents,
  recordAttendance,
  saveLessonFeedback,
  saveLessonNotes,
} from "@/lib/instructor/lessons";
import { reportVehicleFault } from "@/lib/instructor/vehicle-faults";
import { prisma } from "@/lib/prisma";
import { getAttendance, getFeedback, getLessons } from "@/lib/student/data";
import { parseDateOnly, parseTimeOnly } from "@/lib/student/time";
import { createAccount } from "./helpers";
import { seedStudentWorld } from "./student-fixtures";

const PAST_DATE = "2020-01-05";
let fixture: Awaited<ReturnType<typeof seedStudentWorld>>;

async function statusOf(promise: Promise<unknown>): Promise<number | "ok"> {
  try {
    await promise;
    return "ok";
  } catch (error) {
    return error instanceof AuthError ? error.status : -1;
  }
}

/** A past lesson, so attendance can be recorded. Its window is created in the same way booking requires. */
async function pastLesson(id: string, instructorUserId = "INS-1", studentUserId = "STU-A", enrollmentKey: "A1" | "B1" = "A1") {
  const start = parseTimeOnly("09:00")!;
  const end = parseTimeOnly("09:30")!;
  await prisma.instructorAvailability.upsert({
    where: { id: `W-${instructorUserId}` },
    update: {},
    create: { id: `W-${instructorUserId}`, instructorUserId, availabilityDate: parseDateOnly(PAST_DATE)!, startTime: parseTimeOnly("08:00")!, endTime: parseTimeOnly("12:00")! },
  });
  return prisma.lessonSchedule.create({
    data: {
      id,
      lessonDate: parseDateOnly(PAST_DATE)!,
      startTime: start,
      endTime: end,
      durationMinutes: 30,
      instructorUserId,
      vehicleId: "V1",
      vehicleType: "CAR",
      studentUserId,
      enrollmentId: fixture.enrollments[enrollmentKey],
      trainingType: "REGULAR",
    },
  });
}

async function bookedSessions() {
  return prisma.lessonSchedule.count({ where: { enrollmentId: fixture.enrollments.A1, status: { not: LessonScheduleStatus.CANCELLED } } });
}

describe("instructor lesson lifecycle", () => {
  beforeEach(async () => {
    fixture = await seedStudentWorld();
    await createAccount({ userId: "INS-2", email: "ins2@riona.test", role: UserRole.INSTRUCTOR });
    await pastLesson("L1");
  });

  it("completes once with outcome notes, and a repeat is refused without changing anything", async () => {
    await recordAttendance("INS-1", "L1", AttendanceStatus.PRESENT);
    await completeLesson("INS-1", "L1", "Good reversing");
    expect((await getLessonDetail("INS-1", "L1")).notes).toBe("Good reversing");

    expect(await statusOf(completeLesson("INS-1", "L1", "Overwritten"))).toBe(409);
    expect((await getLessonDetail("INS-1", "L1")).notes).toBe("Good reversing");
  });

  it("two simultaneous completions: exactly one succeeds", async () => {
    await recordAttendance("INS-1", "L1", AttendanceStatus.PRESENT);
    const results = await Promise.allSettled([completeLesson("INS-1", "L1"), completeLesson("INS-1", "L1")]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });

  it("does not change the booked session count or the entitlement when a lesson is completed", async () => {
    const before = await bookedSessions();
    const requirementBefore = await prisma.enrollmentTrainingRequirement.findUniqueOrThrow({ where: { id: fixture.requirements.A1 } });
    await recordAttendance("INS-1", "L1", AttendanceStatus.PRESENT);
    await completeLesson("INS-1", "L1");
    await expect(completeLesson("INS-1", "L1")).rejects.toBeInstanceOf(AuthError);
    expect(await bookedSessions()).toBe(before);
    const requirementAfter = await prisma.enrollmentTrainingRequirement.findUniqueOrThrow({ where: { id: fixture.requirements.A1 } });
    expect(requirementAfter.requiredSessions).toBe(requirementBefore.requiredSessions);
    expect((await getLessonDetail("INS-1", "L1")).progress.completedSessions).toBe(1);
  });

  it("will not complete without attendance, or a cancelled lesson", async () => {
    expect(await statusOf(completeLesson("INS-1", "L1"))).toBe(409);
    await cancelLesson("INS-1", "L1", "Rain");
    expect(await statusOf(completeLesson("INS-1", "L1"))).toBe(409);
  });

  it("rejects over-long notes with 400 and leaves the lesson scheduled", async () => {
    await recordAttendance("INS-1", "L1", AttendanceStatus.PRESENT);
    expect(await statusOf(completeLesson("INS-1", "L1", "x".repeat(1001)))).toBe(400);
    expect((await getLessonDetail("INS-1", "L1")).status).toBe(LessonScheduleStatus.SCHEDULED);
  });

  it("saves notes on a scheduled or completed lesson, but not a cancelled one", async () => {
    await saveLessonNotes("INS-1", "L1", "Student nervous");
    expect((await getLessonDetail("INS-1", "L1")).notes).toBe("Student nervous");
    await saveLessonNotes("INS-1", "L1", "");
    expect((await getLessonDetail("INS-1", "L1")).notes).toBeNull();
    await cancelLesson("INS-1", "L1", "Rain");
    expect(await statusOf(saveLessonNotes("INS-1", "L1", "late note"))).toBe(409);
  });

  it("denies another instructor every lesson action with 404", async () => {
    await recordAttendance("INS-1", "L1", AttendanceStatus.PRESENT);
    expect(await statusOf(getLessonDetail("INS-2", "L1"))).toBe(404);
    expect(await statusOf(recordAttendance("INS-2", "L1", AttendanceStatus.ABSENT))).toBe(404);
    expect(await statusOf(completeLesson("INS-2", "L1"))).toBe(404);
    expect(await statusOf(cancelLesson("INS-2", "L1", "no"))).toBe(404);
    expect(await statusOf(saveLessonNotes("INS-2", "L1", "x"))).toBe(404);
    expect(await statusOf(saveLessonFeedback("INS-2", "L1", { feedback: "x", rating: null }))).toBe(404);
    expect((await getLessonDetail("INS-1", "L1")).status).toBe(LessonScheduleStatus.SCHEDULED);
  });

  it("shows a history of recorded state changes, with the actor as a role only", async () => {
    await recordAttendance("INS-1", "L1", AttendanceStatus.LATE);
    await completeLesson("INS-1", "L1");
    await saveLessonFeedback("INS-1", "L1", { feedback: "Improving", rating: 4 });
    const { history } = await getLessonDetail("INS-1", "L1");
    expect(history.map((event) => event.kind)).toEqual(["BOOKED", "ATTENDANCE", "COMPLETED", "FEEDBACK"]);
    expect(history[1].text).toContain("by an instructor");
    expect(JSON.stringify(history)).not.toContain("INS-1");
  });

  it("flows to the student: attendance, feedback and the lesson list, without the private notes", async () => {
    await recordAttendance("INS-1", "L1", AttendanceStatus.PRESENT);
    await saveLessonNotes("INS-1", "L1", "Private remark");
    await completeLesson("INS-1", "L1");
    await saveLessonFeedback("INS-1", "L1", { feedback: "Well done", rating: 5 });

    const lessons = await getLessons("STU-A");
    const row = [...lessons.upcoming, ...lessons.past].find((lesson) => lesson.id === "L1");
    expect(row?.status).toBe(LessonScheduleStatus.COMPLETED);
    expect(row?.attendance).toBe(AttendanceStatus.PRESENT);
    expect(JSON.stringify(await getAttendance("STU-A"))).toContain("PRESENT");
    expect(JSON.stringify(await getFeedback("STU-A"))).toContain("Well done");
    expect(JSON.stringify([lessons, await getFeedback("STU-A")])).not.toContain("Private remark");
  });

  it("lists assigned students from this instructor's lessons only", async () => {
    await pastLesson("L2", "INS-2", "STU-B", "B1");
    const mine = await listAssignedStudents("INS-1");
    expect(mine.map((student) => student.userId)).toEqual(["STU-A"]);
    expect(mine[0]).toMatchObject({ lessonCount: 1, completedCount: 0 });
    expect(JSON.stringify(mine)).not.toMatch(/nicNumber|address|birthday|email/i);
  });

  it("dashboard reports availability and students", async () => {
    const summary = await getDashboardSummary("INS-1");
    expect(summary.availability.upcomingWindowCount).toBeGreaterThan(0);
    expect(summary.students).toBeDefined();
  });

  describe("vehicle fault reports", () => {
    /** A future lesson on V1 inside the seeded 09:00 to 12:00 window, so V1 counts as "on the instructor's lessons". */
    async function futureLessonOnV1() {
      await prisma.lessonSchedule.create({
        data: {
          id: "FUT",
          lessonDate: parseDateOnly("2099-06-01")!,
          startTime: parseTimeOnly("09:00")!,
          endTime: parseTimeOnly("09:30")!,
          durationMinutes: 30,
          instructorUserId: "INS-1",
          vehicleId: "V1",
          vehicleType: "CAR",
          studentUserId: "STU-A",
          enrollmentId: fixture.enrollments.A1,
          trainingType: "REGULAR",
        },
      });
    }

    it("creates a REPORTED fault on a vehicle from the instructor's lessons, without changing the vehicle", async () => {
      await futureLessonOnV1();
      const result = await reportVehicleFault("INS-1", "V1", { severity: "CRITICAL", description: "Brakes feel soft", makesUnavailable: true, workshop: "X", repairCost: 5 });
      const fault = await prisma.vehicleFault.findUniqueOrThrow({ where: { id: result.id } });
      expect(fault).toMatchObject({ status: "REPORTED", severity: "CRITICAL", makesUnavailable: false, workshop: null, repairCost: null, reportedByUserId: "INS-1" });
      expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: "V1" } })).status).toBe(VehicleStatus.ACTIVE);
      expect(await prisma.vehicleMaintenanceAuditLog.count({ where: { entityId: result.id, actorUserId: "INS-1" } })).toBe(1);
    });

    it("refuses a vehicle that is not on the instructor's lessons (404) and bad input (400)", async () => {
      expect(await statusOf(reportVehicleFault("INS-2", "V1", { severity: "LOW", description: "x" }))).toBe(404);
      expect(await statusOf(reportVehicleFault("INS-1", "V2", { severity: "LOW", description: "x" }))).toBe(404);
      expect(await statusOf(reportVehicleFault("INS-1", "V1", { severity: "SEVERE", description: "x" }))).toBe(400);
      expect(await statusOf(reportVehicleFault("INS-1", "V1", { severity: "LOW", description: "" }))).toBe(400);
    });

    it("a fault report never reactivates or alters a maintenance vehicle", async () => {
      await futureLessonOnV1();
      await prisma.vehicle.update({ where: { id: "V1" }, data: { status: VehicleStatus.MAINTENANCE } });
      await reportVehicleFault("INS-1", "V1", { severity: "LOW", description: "Scratch on bumper" });
      expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: "V1" } })).status).toBe(VehicleStatus.MAINTENANCE);
    });
  });

  describe("routes", () => {
    it("notes: 401 without a session, 403 for a student", async () => {
      const call = (cookie?: string) =>
        notesRoute(
          new Request("http://localhost:3000/api/instructor/lessons/L1/notes", {
            method: "PUT",
            headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
            body: JSON.stringify({ notes: "x" }),
          }),
          { params: Promise.resolve({ id: "L1" }) },
        );
      expect((await call()).status).toBe(401);
      const { token } = await createSession("STU-A");
      expect((await call(`riona_session=${token}`)).status).toBe(403);
    });

    it("faults: a student cannot report through the instructor endpoint", async () => {
      const { token } = await createSession("STU-A");
      const response = await faultRoute(
        new Request("http://localhost:3000/api/instructor/vehicles/V1/faults", {
          method: "POST",
          headers: { "content-type": "application/json", cookie: `riona_session=${token}` },
          body: JSON.stringify({ severity: "LOW", description: "x" }),
        }),
        { params: Promise.resolve({ vehicleId: "V1" }) },
      );
      expect(response.status).toBe(403);
    });
  });
});
