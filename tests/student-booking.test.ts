import { beforeEach, describe, expect, it } from "vitest";
import { LessonScheduleStatus } from "@/generated/prisma/enums";
import { POST as bookLesson, GET as lessonOptions } from "@/app/api/student/lessons/route";
import { assignSessionSlot } from "@/lib/instructor/availability";
import { createSession } from "@/lib/auth/session";
import { findBookingOptions, bookPracticalLesson } from "@/lib/student/lesson-booking";
import { prisma } from "@/lib/prisma";
import { getRequest, postRequest } from "./helpers";
import { parseDateOnly } from "@/lib/student/time";
import { LESSON_DATE, insertLesson, seedStudentWorld } from "./student-fixtures";

let fixture: Awaited<ReturnType<typeof seedStudentWorld>>;

const SLOT_STARTS = ["08:00", "10:00", "12:00", "14:00"];

async function cookieFor(userId: string) {
  const { token } = await createSession(userId);
  return `riona_session=${token}`;
}

/** The booking request for the requirement A1 (student STU-A) on the lesson date, in the given session. */
function bookingFor(startTime: string, overrides: Record<string, unknown> = {}) {
  return {
    studentUserId: "STU-A",
    enrollmentId: fixture.enrollments.A1,
    requirementId: fixture.requirements.A1,
    lessonDate: LESSON_DATE,
    startTime,
    ...overrides,
  };
}

function bookingBody(overrides: Record<string, unknown> = {}) {
  return {
    enrollmentId: fixture.enrollments.A1,
    requirementId: fixture.requirements.A1,
    lessonDate: LESSON_DATE,
    startTime: "08:00",
    ...overrides,
  };
}

describe("practical lesson booking in fixed session slots", () => {
  beforeEach(async () => {
    fixture = await seedStudentWorld();
    // The seeded window is a free-time window from before the fixed sessions. Remove it, so INS-1 takes sessions the same
    // way an instructor does in the app.
    await prisma.instructorAvailability.deleteMany({ where: { instructorUserId: "INS-1" } });
    // Seat limits and slot states live outside the reset helper, so each test starts from the seeded values.
    await prisma.vehicleTypeCapacity.update({ where: { vehicleType: "CAR" }, data: { seats: 4 } });
    await prisma.sessionSlot.updateMany({ data: { isActive: true } });
    for (const startTime of ["08:00", "10:00", "12:00"]) {
      await assignSessionSlot("INS-1", LESSON_DATE, startTime);
    }
  });

  it("books a whole session slot: 08:00 is a two-hour lesson, with an instructor and vehicle assigned", async () => {
    const lesson = await bookPracticalLesson(bookingFor("08:00"));

    expect(lesson).toMatchObject({ lessonDate: LESSON_DATE, startTime: "08:00", endTime: "10:00", durationMinutes: 120 });
    const row = await prisma.lessonSchedule.findUniqueOrThrow({ where: { id: lesson.id } });
    expect(row.studentUserId).toBe("STU-A");
    expect(row.instructorUserId).toBe("INS-1");
    expect(row.vehicleId).toBe("V1");
    expect(row.status).toBe(LessonScheduleStatus.SCHEDULED);
    expect(row.sessionGroupId).not.toBeNull();
  });

  it("ignores a client-supplied end time, because the request has no such field and the server takes it from the slot", async () => {
    const response = await bookLesson(
      postRequest("/api/student/lessons", bookingBody({ endTime: "23:59", instructorUserId: "INS-9", vehicleId: "V9" }), {
        cookie: await cookieFor("STU-A"),
      }),
    );
    expect(response.status).toBe(201);
    const { lesson } = await response.json();
    expect(lesson.endTime).toBe("10:00");
    expect(await prisma.lessonSchedule.count({ where: { instructorUserId: "INS-9" } })).toBe(0);
  });

  it("refuses a start time that is not one of the session slots", async () => {
    await expect(bookPracticalLesson(bookingFor("09:00"))).rejects.toMatchObject({ status: 400 });
    await expect(bookPracticalLesson(bookingFor("23:45"))).rejects.toMatchObject({ status: 400 });
  });

  it("refuses a session that the school has closed", async () => {
    await prisma.sessionSlot.update({ where: { startTime: new Date("1970-01-01T08:00:00Z") }, data: { isActive: false } });
    await expect(bookPracticalLesson(bookingFor("08:00"))).rejects.toMatchObject({ status: 400 });
    expect((await findBookingOptions(bookingFor("08:00"))).slots.map((s) => s.startTime)).not.toContain("08:00");
  });

  it("refuses an open session that no instructor has taken", async () => {
    // 14:00 is open, but no instructor has taken it on this date.
    await expect(bookPracticalLesson(bookingFor("14:00"))).rejects.toMatchObject({ status: 409 });
  });

  it("refuses a second lesson for the same student in the same session, but allows the next session", async () => {
    await bookPracticalLesson(bookingFor("08:00"));

    await expect(bookPracticalLesson(bookingFor("08:00"))).rejects.toMatchObject({ status: 409 });
    await expect(bookPracticalLesson(bookingFor("10:00"))).resolves.toMatchObject({ startTime: "10:00" });
  });

  it("allows several sessions for one student on the same day, with no daily limit", async () => {
    for (const startTime of ["08:00", "10:00", "12:00"]) {
      await expect(bookPracticalLesson(bookingFor(startTime))).resolves.toMatchObject({ startTime });
    }
    expect(await prisma.lessonSchedule.count({ where: { studentUserId: "STU-A", lessonDate: parseDateOnly(LESSON_DATE)! } })).toBe(3);
  });

  it("does not let a cancelled lesson block a new booking", async () => {
    await insertLesson({
      id: "CANCELLED-1",
      studentUserId: "STU-A",
      enrollmentKey: "A1",
      fixture,
      start: "08:00",
      end: "10:00",
      status: LessonScheduleStatus.CANCELLED,
    });

    await expect(bookPracticalLesson(bookingFor("08:00"))).resolves.toMatchObject({ startTime: "08:00" });
  });

  it("refuses a session that is full, when no other vehicle or instructor is free", async () => {
    // One seat, and only one vehicle and instructor for this slot: the second student has nowhere to go.
    await prisma.vehicleTypeCapacity.update({ where: { vehicleType: "CAR" }, data: { seats: 1 } });
    await prisma.vehicle.update({ where: { id: "V2" }, data: { status: "MAINTENANCE" } });
    await bookPracticalLesson({ ...bookingFor("08:00"), studentUserId: "STU-B", enrollmentId: fixture.enrollments.B1, requirementId: fixture.requirements.B1 });

    await expect(bookPracticalLesson(bookingFor("08:00"))).rejects.toMatchObject({ status: 409 });
  });

  it("when two students race for the last seat in a session, exactly one booking succeeds", async () => {
    await prisma.vehicleTypeCapacity.update({ where: { vehicleType: "CAR" }, data: { seats: 1 } });
    await prisma.vehicle.update({ where: { id: "V2" }, data: { status: "MAINTENANCE" } });

    const attempts = await Promise.allSettled([
      bookPracticalLesson(bookingFor("08:00")),
      bookPracticalLesson({ ...bookingFor("08:00"), studentUserId: "STU-B", enrollmentId: fixture.enrollments.B1, requirementId: fixture.requirements.B1 }),
    ]);
    expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.lessonSchedule.count({ where: { startTime: { equals: new Date("1970-01-01T08:00:00Z") } } })).toBe(1);
  });

  it("refuses an enrollment that belongs to another student, as not found", async () => {
    await expect(
      bookPracticalLesson({ ...bookingFor("08:00"), enrollmentId: fixture.enrollments.B1, requirementId: fixture.requirements.B1 }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("refuses a requirement that does not belong to the chosen enrollment", async () => {
    await expect(
      bookPracticalLesson({ ...bookingFor("08:00"), enrollmentId: fixture.enrollments.A2, requirementId: fixture.requirements.A1 }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("stops booking once a requirement's required sessions are all booked", async () => {
    await prisma.enrollmentTrainingRequirement.update({ where: { id: fixture.requirements.A2 }, data: { requiredSessions: 1 } });
    const forA2 = { ...bookingFor("08:00"), enrollmentId: fixture.enrollments.A2, requirementId: fixture.requirements.A2 };
    await bookPracticalLesson(forA2);

    await expect(bookPracticalLesson({ ...forA2, startTime: "10:00" })).rejects.toMatchObject({ status: 409 });
  });

  it("offers only open sessions that still have a seat or a free instructor and vehicle, and not a session the student is in", async () => {
    await bookPracticalLesson(bookingFor("08:00"));

    const options = await findBookingOptions({
      studentUserId: "STU-A",
      enrollmentId: fixture.enrollments.A1,
      requirementId: fixture.requirements.A1,
      lessonDate: LESSON_DATE,
    });
    const offered = options.slots.map((s) => s.startTime);
    expect(offered).not.toContain("08:00");
    expect(offered).toContain("10:00");
    expect(offered.every((t) => SLOT_STARTS.includes(t))).toBe(true);
    expect(options.remainingSessions).toBe(2);
  });

  it("options and booking routes require a student session (401 without one, 403 for other roles)", async () => {
    const url = `/api/student/lessons?enrollmentId=${fixture.enrollments.A1}&requirementId=${fixture.requirements.A1}&date=${LESSON_DATE}`;
    expect((await lessonOptions(getRequest(url))).status).toBe(401);
    expect((await lessonOptions(getRequest(url, await cookieFor("INS-1")))).status).toBe(403);
    expect((await bookLesson(postRequest("/api/student/lessons", bookingBody()))).status).toBe(401);
    expect((await bookLesson(postRequest("/api/student/lessons", bookingBody(), { cookie: await cookieFor("ADMIN-1") }))).status).toBe(403);
  });

  it("refuses a booking request from a cross-site origin", async () => {
    const response = await bookLesson(
      postRequest("/api/student/lessons", bookingBody(), { cookie: await cookieFor("STU-A"), origin: "https://evil.example" }),
    );
    expect(response.status).toBe(403);
  });

  it("a booking for a date in the past is refused", async () => {
    await expect(bookPracticalLesson({ ...bookingFor("08:00"), lessonDate: "2020-01-06" })).rejects.toMatchObject({ status: 400 });
  });
});
