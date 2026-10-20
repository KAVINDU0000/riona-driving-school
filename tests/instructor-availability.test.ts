import { beforeEach, describe, expect, it } from "vitest";
import { LessonScheduleStatus, UserRole } from "@/generated/prisma/enums";
import { GET as listRoute, POST as createRoute } from "@/app/api/instructor/availability/route";
import { AuthError } from "@/lib/auth/http";
import { createSession } from "@/lib/auth/session";
import { createAvailability, deleteAvailability, listAvailability, updateAvailability } from "@/lib/instructor/availability";
import { prisma } from "@/lib/prisma";
import { bookPracticalLesson, findBookingOptions } from "@/lib/student/lesson-booking";
import { parseDateOnly } from "@/lib/student/time";
import { createAccount, getRequest, postRequest } from "./helpers";
import { insertLesson, LESSON_DATE, seedStudentWorld } from "./student-fixtures";

let fixture: Awaited<ReturnType<typeof seedStudentWorld>>;

async function statusOf(promise: Promise<unknown>): Promise<number | "ok"> {
  try {
    await promise;
    return "ok";
  } catch (error) {
    return error instanceof AuthError ? error.status : -1;
  }
}

async function cookieFor(userId: string) {
  const { token } = await createSession(userId);
  return `riona_session=${token}`;
}

const window = (overrides: Partial<{ date: string; startTime: string; endTime: string; notes: string | null }> = {}) => ({
  date: "2099-07-01",
  startTime: "09:00",
  endTime: "12:00",
  notes: null,
  ...overrides,
});

// seedStudentWorld gives INS-1 one 09:00 to 12:00 window on LESSON_DATE.
describe("instructor availability", () => {
  beforeEach(async () => {
    fixture = await seedStudentWorld();
    await createAccount({ userId: "INS-2", email: "ins2@riona.test", role: UserRole.INSTRUCTOR });
  });

  it("creates and lists a window, with a break shown as the gap between two windows", async () => {
    await createAvailability("INS-1", window({ endTime: "11:00" }));
    await createAvailability("INS-1", window({ startTime: "13:00", endTime: "16:00", notes: "Afternoon" }));
    const windows = await listAvailability("INS-1", "2099-07-01", "2099-07-01");
    expect(windows.map((w) => `${w.startTime}-${w.endTime}`)).toEqual(["09:00-11:00", "13:00-16:00"]);
    expect(windows[1].notes).toBe("Afternoon");
  });

  it("refuses overlapping or touching windows on the same date, and past dates", async () => {
    await createAvailability("INS-1", window());
    expect(await statusOf(createAvailability("INS-1", window({ startTime: "11:00", endTime: "14:00" })))).toBe(409);
    expect(await statusOf(createAvailability("INS-1", window({ startTime: "12:00", endTime: "14:00" })))).toBe(409);
    expect(await statusOf(createAvailability("INS-1", window({ date: "2020-01-01" })))).toBe(400);
  });

  it("lets two instructors have the same hours, because overlap is checked per instructor", async () => {
    await createAvailability("INS-1", window());
    expect(await statusOf(createAvailability("INS-2", window()))).toBe("ok");
  });

  it("keeps instructors out of each other's windows: 404, and the window is unchanged", async () => {
    const created = await createAvailability("INS-1", window());
    expect(await statusOf(updateAvailability("INS-2", created.id, window({ endTime: "10:00" })))).toBe(404);
    expect(await statusOf(deleteAvailability("INS-2", created.id))).toBe(404);
    const windows = await listAvailability("INS-1", "2099-07-01", "2099-07-01");
    expect(windows).toHaveLength(1);
    expect(windows[0].endTime).toBe("12:00");
  });

  it("will not remove or shrink a window that covers a booked lesson, and allows it once the lesson is cancelled", async () => {
    const [seeded] = await listAvailability("INS-1", LESSON_DATE, LESSON_DATE);
    await insertLesson({ id: "L1", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "10:00", end: "10:30" });

    expect(await statusOf(deleteAvailability("INS-1", seeded.id))).toBe(409);
    expect(await statusOf(updateAvailability("INS-1", seeded.id, window({ date: LESSON_DATE, endTime: "10:15" })))).toBe(409);
    // Shrinking so the lesson still fits is fine.
    expect(await statusOf(updateAvailability("INS-1", seeded.id, window({ date: LESSON_DATE, startTime: "10:00", endTime: "11:00" })))).toBe("ok");

    await prisma.lessonSchedule.update({ where: { id: "L1" }, data: { status: LessonScheduleStatus.CANCELLED, cancellationReason: "test" } });
    expect(await statusOf(deleteAvailability("INS-1", seeded.id))).toBe("ok");
  });

  it("refuses to move a window to another date", async () => {
    const created = await createAvailability("INS-1", window());
    expect(await statusOf(updateAvailability("INS-1", created.id, window({ date: "2099-07-02" })))).toBe(400);
  });

  describe("student booking", () => {
    const request = () => ({
      studentUserId: "STU-A",
      enrollmentId: fixture.enrollments.A1,
      requirementId: fixture.requirements.A1,
      lessonDate: "2099-07-01",
      durationMinutes: 30,
    });

    it("offers nothing without a window, then offers times inside the window once it is created", async () => {
      expect((await findBookingOptions(request())).startTimes).toEqual([]);
      await createAvailability("INS-1", window({ startTime: "09:00", endTime: "10:00" }));
      const options = await findBookingOptions(request());
      expect(options.startTimes).toEqual(["09:00", "09:15", "09:30"]);
    });

    it("assigns the instructor to the booked lesson, and then protects the window", async () => {
      const created = await createAvailability("INS-1", window({ startTime: "09:00", endTime: "10:00" }));
      const lesson = await bookPracticalLesson({ ...request(), startTime: "09:00" });
      const stored = await prisma.lessonSchedule.findUniqueOrThrow({ where: { id: lesson.id } });
      expect(stored.instructorUserId).toBe("INS-1");
      expect(await statusOf(deleteAvailability("INS-1", created.id))).toBe(409);
    });

    it("never lets a removed window be booked: a window removed first leaves no offer", async () => {
      const created = await createAvailability("INS-1", window({ startTime: "09:00", endTime: "10:00" }));
      await deleteAvailability("INS-1", created.id);
      expect((await findBookingOptions(request())).startTimes).toEqual([]);
      expect(await statusOf(bookPracticalLesson({ ...request(), startTime: "09:00" }))).toBe(409);
    });

    it("keeps maintenance vehicles unavailable: with only a maintenance vehicle free, nothing is offered", async () => {
      await prisma.vehicle.updateMany({ where: { id: { in: ["V1", "V2"] } }, data: { status: "MAINTENANCE" } });
      await createAvailability("INS-1", window());
      expect((await findBookingOptions(request())).startTimes).toEqual([]);
    });

    it("does not offer an inactive instructor's windows", async () => {
      await createAvailability("INS-1", window());
      await prisma.instructorProfile.update({ where: { userId: "INS-1" }, data: { status: "INACTIVE" } });
      expect((await findBookingOptions(request())).startTimes).toEqual([]);
    });

    it("two students racing for the one slot: exactly one booking wins", async () => {
      await createAvailability("INS-1", window({ startTime: "09:00", endTime: "09:30" }));
      await prisma.vehicle.update({ where: { id: "V2" }, data: { status: "INACTIVE" } });
      const results = await Promise.allSettled([
        bookPracticalLesson({ ...request(), startTime: "09:00" }),
        bookPracticalLesson({ ...request(), studentUserId: "STU-B", enrollmentId: fixture.enrollments.B1, requirementId: fixture.requirements.B1, startTime: "09:00" }),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(await prisma.lessonSchedule.count({ where: { lessonDate: parseDateOnly("2099-07-01")! } })).toBe(1);
    });
  });

  describe("routes", () => {
    it("require a signed-in instructor: 401 without a session, 403 for a student", async () => {
      expect((await createRoute(postRequest("/api/instructor/availability", window()))).status).toBe(401);
      const student = await cookieFor("STU-A");
      expect((await createRoute(postRequest("/api/instructor/availability", window(), { cookie: student }))).status).toBe(403);
      expect((await listRoute(getRequest("/api/instructor/availability?from=2099-07-01&to=2099-07-07", student))).status).toBe(403);
    });

    it("rejects a cross-site origin with 403 and bad input with 400", async () => {
      const cookie = await cookieFor("INS-1");
      expect((await createRoute(postRequest("/api/instructor/availability", window(), { cookie, origin: "https://evil.example" }))).status).toBe(403);
      expect((await createRoute(postRequest("/api/instructor/availability", window({ startTime: "09:10" }), { cookie }))).status).toBe(400);
    });

    it("creates for the session's instructor and ignores any instructor ID in the body", async () => {
      const cookie = await cookieFor("INS-1");
      const response = await createRoute(postRequest("/api/instructor/availability", { ...window(), instructorUserId: "INS-2" }, { cookie }));
      expect(response.status).toBe(201);
      expect(await prisma.instructorAvailability.count({ where: { instructorUserId: "INS-2" } })).toBe(0);
      const listed = await listRoute(getRequest("/api/instructor/availability?from=2099-07-01&to=2099-07-07", cookie));
      expect((await listed.json()).windows).toHaveLength(1);
    });

    it("refuses an inactive instructor's session", async () => {
      const cookie = await cookieFor("INS-1");
      await prisma.instructorProfile.update({ where: { userId: "INS-1" }, data: { status: "INACTIVE" } });
      expect((await createRoute(postRequest("/api/instructor/availability", window(), { cookie }))).status).toBe(401);
    });
  });
});
