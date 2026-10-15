import { beforeEach, describe, expect, it } from "vitest";
import { AttendanceStatus, LessonScheduleStatus, TrainingType, UserRole, VehicleStatus, VehicleType } from "@/generated/prisma/enums";
import { vehicleWarning } from "@/lib/instructor/lesson-rules";
import { GET as listLessons } from "@/app/api/instructor/lessons/route";
import { POST as cancelRoute } from "@/app/api/instructor/lessons/[id]/cancel/route";
import { createSession } from "@/lib/auth/session";
import { AuthError } from "@/lib/auth/http";
import { prisma } from "@/lib/prisma";
import {
  cancelLesson,
  completeLesson,
  getDashboardSummary,
  getLessonDetail,
  getStudentProgress,
  lessonsBetween,
  recordAttendance,
  saveLessonFeedback,
} from "@/lib/instructor/lessons";
import { parseDateOnly, parseTimeOnly } from "@/lib/student/time";
import { createAccount, getRequest, postRequest } from "./helpers";
import { LESSON_DATE, seedStudentWorld } from "./student-fixtures";

/** A past date, so attendance can be recorded. Availability is seeded for it as well. */
const PAST_DATE = "2020-01-05";

let fixture: Awaited<ReturnType<typeof seedStudentWorld>>;

async function cookieFor(userId: string) {
  const { token } = await createSession(userId);
  return `riona_session=${token}`;
}

async function statusOf(promise: Promise<unknown>): Promise<number | "ok"> {
  try {
    await promise;
    return "ok";
  } catch (error) {
    return error instanceof AuthError ? error.status : -1;
  }
}

async function insertAt(options: {
  id: string;
  date: string;
  instructorUserId: string;
  studentUserId: string;
  enrollmentKey: "A1" | "B1";
  vehicleId: string;
  start: string;
  end: string;
  status?: LessonScheduleStatus;
  attendance?: AttendanceStatus | null;
}) {
  const start = parseTimeOnly(options.start)!;
  const end = parseTimeOnly(options.end)!;
  return prisma.lessonSchedule.create({
    data: {
      id: options.id,
      lessonDate: parseDateOnly(options.date)!,
      startTime: start,
      endTime: end,
      durationMinutes: (end.getTime() - start.getTime()) / 60000,
      instructorUserId: options.instructorUserId,
      vehicleId: options.vehicleId,
      vehicleType: VehicleType.CAR,
      studentUserId: options.studentUserId,
      enrollmentId: fixture.enrollments[options.enrollmentKey],
      trainingType: TrainingType.REGULAR,
      status: options.status ?? LessonScheduleStatus.SCHEDULED,
      attendance: options.attendance ?? null,
    },
  });
}

describe("instructor lessons", () => {
  beforeEach(async () => {
    fixture = await seedStudentWorld();
    await createAccount({ userId: "INS-2", email: "ins2@riona.test", role: UserRole.INSTRUCTOR });

    for (const instructorUserId of ["INS-1", "INS-2"]) {
      for (const date of [LESSON_DATE, PAST_DATE]) {
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

    // INS-1's future lesson, INS-1's past lesson awaiting attendance, and INS-2's lessons that INS-1 must not see.
    await insertAt({ id: "L1", date: LESSON_DATE, instructorUserId: "INS-1", studentUserId: "STU-A", enrollmentKey: "A1", vehicleId: "V1", start: "09:00", end: "09:30" });
    await insertAt({ id: "PAST-1", date: PAST_DATE, instructorUserId: "INS-1", studentUserId: "STU-A", enrollmentKey: "A1", vehicleId: "V1", start: "09:00", end: "09:30" });
    await insertAt({ id: "L2", date: LESSON_DATE, instructorUserId: "INS-2", studentUserId: "STU-B", enrollmentKey: "B1", vehicleId: "V2", start: "10:00", end: "10:30" });
    await insertAt({ id: "PAST-2", date: PAST_DATE, instructorUserId: "INS-2", studentUserId: "STU-B", enrollmentKey: "B1", vehicleId: "V2", start: "10:00", end: "10:30" });
  });

  describe("ownership", () => {
    it("lists only the instructor's own lessons in a date range", async () => {
      const lessons = await lessonsBetween("INS-1", LESSON_DATE, LESSON_DATE);
      expect(lessons.map((lesson) => lesson.id)).toEqual(["L1"]);
    });

    it("keeps other instructors' lessons out of the dashboard", async () => {
      const summary = await getDashboardSummary("INS-1");
      expect(summary.upcoming.map((lesson) => lesson.id)).toEqual(["L1"]);
      expect(summary.pendingActions.map((item) => item.lesson.id)).toEqual(["PAST-1"]);
      expect(summary.vehicles.map((vehicle) => vehicle.id)).not.toContain("V2");
    });

    it("reports another instructor's lesson as not found, for detail, attendance, completion and cancellation", async () => {
      expect(await statusOf(getLessonDetail("INS-1", "L2"))).toBe(404);
      expect(await statusOf(recordAttendance("INS-1", "PAST-2", AttendanceStatus.PRESENT))).toBe(404);
      expect(await statusOf(completeLesson("INS-1", "PAST-2"))).toBe(404);
      expect(await statusOf(cancelLesson("INS-1", "L2"))).toBe(404);
    });

    it("rejects a schedule request from a student and one with no session", async () => {
      const studentCookie = await cookieFor("STU-A");
      const asStudent = await listLessons(getRequest(`/api/instructor/lessons?from=${LESSON_DATE}&to=${LESSON_DATE}`, studentCookie));
      expect(asStudent.status).toBe(403);
      const anonymous = await listLessons(getRequest(`/api/instructor/lessons?from=${LESSON_DATE}&to=${LESSON_DATE}`));
      expect(anonymous.status).toBe(401);
    });

    it("never returns another instructor's lesson through the API, even with its ID", async () => {
      const cookie = await cookieFor("INS-1");
      const response = await cancelRoute(postRequest("/api/instructor/lessons/L2/cancel", {}, { cookie }), {
        params: Promise.resolve({ id: "L2" }),
      });
      expect(response.status).toBe(404);
      const unchanged = await prisma.lessonSchedule.findUnique({ where: { id: "L2" } });
      expect(unchanged?.status).toBe(LessonScheduleStatus.SCHEDULED);
    });

    it("rejects a state-changing request from another origin", async () => {
      const cookie = await cookieFor("INS-1");
      const response = await cancelRoute(postRequest("/api/instructor/lessons/L1/cancel", {}, { cookie, origin: "https://evil.example" }), {
        params: Promise.resolve({ id: "L1" }),
      });
      expect(response.status).toBe(403);
      expect((await prisma.lessonSchedule.findUnique({ where: { id: "L1" } }))?.status).toBe(LessonScheduleStatus.SCHEDULED);
    });
  });

  describe("attendance", () => {
    it("records attendance with the marker and time, and leaves the status unchanged", async () => {
      await recordAttendance("INS-1", "PAST-1", AttendanceStatus.LATE);
      const row = await prisma.lessonSchedule.findUnique({ where: { id: "PAST-1" } });
      expect(row?.attendance).toBe(AttendanceStatus.LATE);
      expect(row?.attendanceMarkedByUserId).toBe("INS-1");
      expect(row?.attendanceMarkedAt).not.toBeNull();
      expect(row?.status).toBe(LessonScheduleStatus.SCHEDULED);
    });

    it("refuses attendance for a future lesson and for a cancelled lesson", async () => {
      expect(await statusOf(recordAttendance("INS-1", "L1", AttendanceStatus.PRESENT))).toBe(409);
      await cancelLesson("INS-1", "PAST-1");
      expect(await statusOf(recordAttendance("INS-1", "PAST-1", AttendanceStatus.PRESENT))).toBe(409);
    });
  });

  describe("completion and cancellation", () => {
    it("requires attendance before completion", async () => {
      expect(await statusOf(completeLesson("INS-1", "PAST-1"))).toBe(409);
      await recordAttendance("INS-1", "PAST-1", AttendanceStatus.PRESENT);
      await completeLesson("INS-1", "PAST-1");
      expect((await prisma.lessonSchedule.findUnique({ where: { id: "PAST-1" } }))?.status).toBe(LessonScheduleStatus.COMPLETED);
    });

    it("lets only one of two concurrent completions succeed", async () => {
      await insertAt({ id: "RACE", date: PAST_DATE, instructorUserId: "INS-1", studentUserId: "STU-A", enrollmentKey: "A1", vehicleId: "V1", start: "11:00", end: "11:30", attendance: AttendanceStatus.PRESENT });
      const results = await Promise.allSettled([completeLesson("INS-1", "RACE"), completeLesson("INS-1", "RACE")]);
      expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      expect((await prisma.lessonSchedule.findUnique({ where: { id: "RACE" } }))?.status).toBe(LessonScheduleStatus.COMPLETED);
    });

    it("cancels a scheduled lesson but keeps the record, and refuses a second cancellation", async () => {
      await cancelLesson("INS-1", "L1");
      const row = await prisma.lessonSchedule.findUnique({ where: { id: "L1" } });
      expect(row?.status).toBe(LessonScheduleStatus.CANCELLED);
      expect(await statusOf(cancelLesson("INS-1", "L1"))).toBe(409);
    });
  });

  describe("feedback and progress", () => {
    it("writes feedback only on a completed lesson, and keeps one record per lesson", async () => {
      expect(await statusOf(saveLessonFeedback("INS-1", "L1", { feedback: "Too early", rating: null }))).toBe(409);

      await recordAttendance("INS-1", "PAST-1", AttendanceStatus.PRESENT);
      await completeLesson("INS-1", "PAST-1");
      await saveLessonFeedback("INS-1", "PAST-1", { feedback: "Good mirror checks", rating: 4 });
      await saveLessonFeedback("INS-1", "PAST-1", { feedback: "Good mirror checks, improve gears", rating: 3 });

      const count = await prisma.lessonFeedback.count({ where: { lessonScheduleId: "PAST-1" } });
      expect(count).toBe(1);
      const saved = await prisma.lessonFeedback.findUnique({ where: { lessonScheduleId: "PAST-1" } });
      expect(saved?.rating).toBe(3);
    });

    it("derives training progress from completed lessons of the same requirement", async () => {
      expect((await getLessonDetail("INS-1", "L1")).progress).toEqual({ completedSessions: 0, requiredSessions: 3 });
      await recordAttendance("INS-1", "PAST-1", AttendanceStatus.PRESENT);
      await completeLesson("INS-1", "PAST-1");
      expect((await getLessonDetail("INS-1", "L1")).progress).toEqual({ completedSessions: 1, requiredSessions: 3 });
    });

    it("shows the student's phone only, not address, NIC or birthday", async () => {
      const detail = await getLessonDetail("INS-1", "L1");
      expect(detail.student.phoneNumber).toBe("0771234567");
      expect(Object.keys(detail.student).sort()).toEqual(["fullName", "phoneNumber", "userId"]);
    });
  });

  describe("student progress and status filter", () => {
    it("shows only this instructor's lessons and only the requirements they have taught", async () => {
      const progress = await getStudentProgress("INS-1", "STU-A");
      expect(progress.lessons.map((lesson) => lesson.id).sort()).toEqual(["L1", "PAST-1"]);
      expect(progress.requirements).toEqual([
        { vehicleType: VehicleType.CAR, trainingType: TrainingType.REGULAR, requiredSessions: 3, completedSessions: 0 },
      ]);
    });

    it("reports a student the instructor has never taught as not found", async () => {
      expect(await statusOf(getStudentProgress("INS-1", "STU-B"))).toBe(404);
    });

    it("counts completed sessions for the requirement after a lesson is completed", async () => {
      await recordAttendance("INS-1", "PAST-1", AttendanceStatus.PRESENT);
      await completeLesson("INS-1", "PAST-1");
      const progress = await getStudentProgress("INS-1", "STU-A");
      expect(progress.requirements[0].completedSessions).toBe(1);
    });

    it("filters the schedule by schema status and leaves other instructors out", async () => {
      const scheduled = await lessonsBetween("INS-1", LESSON_DATE, LESSON_DATE, "SCHEDULED");
      expect(scheduled.map((lesson) => lesson.id)).toEqual(["L1"]);
      expect(await lessonsBetween("INS-1", LESSON_DATE, LESSON_DATE, "CANCELLED")).toEqual([]);
    });

    it("rejects an unknown status filter at the API", async () => {
      const cookie = await cookieFor("INS-1");
      const response = await listLessons(getRequest(`/api/instructor/lessons?from=${LESSON_DATE}&to=${LESSON_DATE}&status=DELETED`, cookie));
      expect(response.status).toBe(400);
    });
  });

  describe("vehicle status", () => {
    it("reports a maintenance vehicle on the lesson and the dashboard, with a warning", async () => {
      await prisma.vehicle.update({ where: { id: "V1" }, data: { status: VehicleStatus.MAINTENANCE } });
      const detail = await getLessonDetail("INS-1", "L1");
      expect(detail.vehicle.status).toBe(VehicleStatus.MAINTENANCE);
      expect(vehicleWarning(detail.vehicle.status)).toContain("maintenance");
      const summary = await getDashboardSummary("INS-1");
      expect(summary.vehicles.find((vehicle) => vehicle.id === "V1")?.status).toBe(VehicleStatus.MAINTENANCE);
    });

    it("reports an inactive vehicle with a warning, and an active one with none", async () => {
      await prisma.vehicle.update({ where: { id: "V1" }, data: { status: VehicleStatus.INACTIVE } });
      const detail = await getLessonDetail("INS-1", "L1");
      expect(vehicleWarning(detail.vehicle.status)).toContain("inactive");
      await prisma.vehicle.update({ where: { id: "V1" }, data: { status: VehicleStatus.ACTIVE } });
      expect(vehicleWarning((await getLessonDetail("INS-1", "L1")).vehicle.status)).toBeNull();
    });
  });
});
