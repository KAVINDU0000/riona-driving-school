import { beforeEach, describe, expect, it } from "vitest";
import { LessonScheduleStatus, UserRole } from "@/generated/prisma/enums";
import { GET as listRoute, POST as takeRoute } from "@/app/api/instructor/availability/route";
import { AuthError } from "@/lib/auth/http";
import { createSession } from "@/lib/auth/session";
import { assignSessionSlot, deleteAvailability, listAvailability } from "@/lib/instructor/availability";
import { prisma } from "@/lib/prisma";
import { bookPracticalLesson, findBookingOptions } from "@/lib/student/lesson-booking";
import { createAccount, getRequest, postRequest } from "./helpers";
import { insertLesson, LESSON_DATE, seedStudentWorld } from "./student-fixtures";

let fixture: Awaited<ReturnType<typeof seedStudentWorld>>;

/** A date with no seeded windows, so each test controls its own sessions. */
const DAY = "2099-07-01";

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

// seedStudentWorld gives INS-1 one legacy 09:00 to 12:00 window on LESSON_DATE. The fixed session times come from the
// migration: 08:00–10:00, 10:00–12:00, 12:00–14:00 and 14:00–16:00.
describe("instructor sessions", () => {
  beforeEach(async () => {
    fixture = await seedStudentWorld();
    await createAccount({ userId: "INS-2", email: "ins2@riona.test", role: UserRole.INSTRUCTOR });
  });

  it("takes an open session slot, and the window has exactly the slot's times", async () => {
    const window = await assignSessionSlot("INS-1", DAY, "08:00");
    expect(window).toMatchObject({ date: DAY, startTime: "08:00", endTime: "10:00" });

    const windows = await listAvailability("INS-1", DAY, DAY);
    expect(windows.map((w) => `${w.startTime}-${w.endTime}`)).toEqual(["08:00-10:00"]);
  });

  it("refuses a time that is not an open session slot", async () => {
    expect(await statusOf(assignSessionSlot("INS-1", DAY, "09:00"))).toBe(409);
  });

  it("refuses taking the same session twice on one date", async () => {
    await assignSessionSlot("INS-1", DAY, "10:00");
    expect(await statusOf(assignSessionSlot("INS-1", DAY, "10:00"))).toBe(409);
  });

  it("refuses a session on a past date", async () => {
    expect(await statusOf(assignSessionSlot("INS-1", "2020-01-01", "08:00"))).toBe(400);
  });

  it("lets two instructors take the same session, because each instructor is checked on their own", async () => {
    await assignSessionSlot("INS-1", DAY, "08:00");
    expect(await statusOf(assignSessionSlot("INS-2", DAY, "08:00"))).toBe("ok");
  });

  it("lists the taken sessions through the API for the signed-in instructor only", async () => {
    await assignSessionSlot("INS-1", DAY, "08:00");
    const response = await listRoute(getRequest(`/api/instructor/availability?from=${DAY}&to=${DAY}`, await cookieFor("INS-1")));
    const { windows } = await response.json();
    expect(windows.map((w: { startTime: string }) => w.startTime)).toEqual(["08:00"]);
  });

  it("takes a session through the API, and refuses a free-form time", async () => {
    const cookie = await cookieFor("INS-1");
    const taken = await takeRoute(postRequest("/api/instructor/availability", { date: DAY, startTime: "12:00" }, { cookie }));
    expect(taken.status).toBe(201);
    const refused = await takeRoute(postRequest("/api/instructor/availability", { date: DAY, startTime: "12:30" }, { cookie }));
    expect(refused.status).toBe(409);
  });

  it("releases a session, but keeps instructors out of each other's sessions: 404", async () => {
    const taken = await assignSessionSlot("INS-1", DAY, "08:00");
    expect(await statusOf(deleteAvailability("INS-2", taken.id))).toBe(404);
    expect(await statusOf(deleteAvailability("INS-1", taken.id))).toBe("ok");
    expect(await listAvailability("INS-1", DAY, DAY)).toHaveLength(0);
  });

  it("will not release a window that covers a booked lesson, and allows it once the lesson is cancelled", async () => {
    const [seeded] = await listAvailability("INS-1", LESSON_DATE, LESSON_DATE);
    await insertLesson({ id: "L1", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "10:00", end: "10:30" });

    expect(await statusOf(deleteAvailability("INS-1", seeded.id))).toBe(409);

    await prisma.lessonSchedule.update({ where: { id: "L1" }, data: { status: LessonScheduleStatus.CANCELLED, cancellationReason: "test" } });
    expect(await statusOf(deleteAvailability("INS-1", seeded.id))).toBe("ok");
  });

  describe("student booking", () => {
    const request = () => ({
      studentUserId: "STU-A",
      enrollmentId: fixture.enrollments.A1,
      requirementId: fixture.requirements.A1,
      lessonDate: DAY,
    });

    it("offers no session until an instructor takes one, then offers the taken session", async () => {
      expect((await findBookingOptions(request())).slots).toEqual([]);

      await assignSessionSlot("INS-1", DAY, "08:00");
      const options = await findBookingOptions(request());
      expect(options.slots).toEqual([{ startTime: "08:00", endTime: "10:00" }]);
    });

    it("books the whole slot: the lesson takes the slot's start and end times", async () => {
      await assignSessionSlot("INS-1", DAY, "08:00");
      const lesson = await bookPracticalLesson({ ...request(), startTime: "08:00" });
      expect(lesson).toMatchObject({ lessonDate: DAY, startTime: "08:00", endTime: "10:00", durationMinutes: 120 });
    });

    it("refuses a booking at a time that is not an open session", async () => {
      await assignSessionSlot("INS-1", DAY, "08:00");
      expect(await statusOf(bookPracticalLesson({ ...request(), startTime: "09:00" }))).toBe(400);
    });
  });
});
