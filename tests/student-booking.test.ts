import { beforeEach, describe, expect, it } from "vitest";
import { LessonScheduleStatus } from "@/generated/prisma/enums";
import { POST as bookLesson, GET as lessonOptions } from "@/app/api/student/lessons/route";
import { createSession } from "@/lib/auth/session";
import { findBookingOptions, bookPracticalLesson } from "@/lib/student/lesson-booking";
import { prisma } from "@/lib/prisma";
import { getRequest, postRequest } from "./helpers";
import { parseDateOnly } from "@/lib/student/time";
import { LESSON_DATE, insertLesson, seedStudentWorld } from "./student-fixtures";

let fixture: Awaited<ReturnType<typeof seedStudentWorld>>;

async function cookieFor(userId: string) {
  const { token } = await createSession(userId);
  return `riona_session=${token}`;
}

function bookingBody(overrides: Record<string, unknown> = {}) {
  return {
    enrollmentId: fixture.enrollments.A1,
    requirementId: fixture.requirements.A1,
    lessonDate: LESSON_DATE,
    startTime: "09:00",
    ...overrides,
  };
}

describe("practical lesson booking", () => {
  beforeEach(async () => {
    fixture = await seedStudentWorld();
  });

  it("books a 30-minute lesson, computes the end time on the server, and assigns an instructor and vehicle", async () => {
    const lesson = await bookPracticalLesson({
      studentUserId: "STU-A",
      enrollmentId: fixture.enrollments.A1,
      requirementId: fixture.requirements.A1,
      lessonDate: LESSON_DATE,
      startTime: "09:00",
    });

    expect(lesson).toMatchObject({ lessonDate: LESSON_DATE, startTime: "09:00", endTime: "09:30" });
    const row = await prisma.lessonSchedule.findUniqueOrThrow({ where: { id: lesson.id } });
    expect(row.studentUserId).toBe("STU-A");
    expect(row.instructorUserId).toBe("INS-1");
    expect(row.vehicleId).toBe("V1");
    expect(row.status).toBe(LessonScheduleStatus.SCHEDULED);
  });

  it("ignores a client-supplied end time, because the request has no such field and the server recalculates it", async () => {
    const response = await bookLesson(
      postRequest("/api/student/lessons", bookingBody({ endTime: "23:59", instructorUserId: "INS-9", vehicleId: "V9" }), {
        cookie: await cookieFor("STU-A"),
      }),
    );
    expect(response.status).toBe(201);
    const { lesson } = await response.json();
    expect(lesson.endTime).toBe("09:30");
    expect(await prisma.lessonSchedule.count({ where: { instructorUserId: "INS-9" } })).toBe(0);
  });

  it("accepts the 60-minute standard length and refuses any other length the package does not allow", async () => {
    await expect(
      bookPracticalLesson({
        studentUserId: "STU-A",
        enrollmentId: fixture.enrollments.A1,
        requirementId: fixture.requirements.A1,
        lessonDate: LESSON_DATE,
        startTime: "10:00",
      }),
    ).resolves.toMatchObject({ endTime: "11:00" });

    await expect(
      bookPracticalLesson({
        studentUserId: "STU-A",
        enrollmentId: fixture.enrollments.A1,
        requirementId: fixture.requirements.A1,
        lessonDate: LESSON_DATE,
        startTime: "09:00",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("refuses a start time off the 15-minute grid and a lesson that would cross midnight", async () => {
    await expect(
      bookPracticalLesson({
        studentUserId: "STU-A",
        enrollmentId: fixture.enrollments.A1,
        requirementId: fixture.requirements.A1,
        lessonDate: LESSON_DATE,
        startTime: "09:10",
      }),
    ).rejects.toMatchObject({ status: 400 });

    await expect(
      bookPracticalLesson({
        studentUserId: "STU-A",
        enrollmentId: fixture.enrollments.A1,
        requirementId: fixture.requirements.A1,
        lessonDate: LESSON_DATE,
        startTime: "23:45",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("refuses a time outside every instructor availability window", async () => {
    await expect(
      bookPracticalLesson({
        studentUserId: "STU-A",
        enrollmentId: fixture.enrollments.A1,
        requirementId: fixture.requirements.A1,
        lessonDate: LESSON_DATE,
        startTime: "13:00",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("refuses a lesson that straddles the end of an availability window", async () => {
    await expect(
      bookPracticalLesson({
        studentUserId: "STU-A",
        enrollmentId: fixture.enrollments.A1,
        requirementId: fixture.requirements.A1,
        lessonDate: LESSON_DATE,
        startTime: "11:45",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("refuses a student's second lesson that overlaps their first, but allows an adjacent one", async () => {
    await bookPracticalLesson({
      studentUserId: "STU-A",
      enrollmentId: fixture.enrollments.A1,
      requirementId: fixture.requirements.A1,
      lessonDate: LESSON_DATE,
      startTime: "09:00",
    });

    await expect(
      bookPracticalLesson({
        studentUserId: "STU-A",
        enrollmentId: fixture.enrollments.A1,
        requirementId: fixture.requirements.A1,
        lessonDate: LESSON_DATE,
        startTime: "09:15",
      }),
    ).rejects.toMatchObject({ status: 409 });

    await expect(
      bookPracticalLesson({
        studentUserId: "STU-A",
        enrollmentId: fixture.enrollments.A1,
        requirementId: fixture.requirements.A1,
        lessonDate: LESSON_DATE,
        startTime: "09:30",
      }),
    ).resolves.toMatchObject({ startTime: "09:30" });
  });

  it("allows several non-overlapping lessons for one student on the same day, with no daily limit", async () => {
    for (const startTime of ["09:00", "10:00", "11:00"]) {
      await expect(
        bookPracticalLesson({
          studentUserId: "STU-A",
          enrollmentId: fixture.enrollments.A1,
          requirementId: fixture.requirements.A1,
          lessonDate: LESSON_DATE,
          startTime,
        }),
      ).resolves.toMatchObject({ startTime });
    }
    expect(await prisma.lessonSchedule.count({ where: { studentUserId: "STU-A", lessonDate: parseDateOnly(LESSON_DATE)! } })).toBe(3);
  });

  it("does not let a cancelled lesson block a new booking", async () => {
    await insertLesson({
      id: "CANCELLED-1",
      studentUserId: "STU-A",
      enrollmentKey: "A1",
      fixture,
      start: "09:00",
      end: "09:30",
      status: LessonScheduleStatus.CANCELLED,
    });

    await expect(
      bookPracticalLesson({
        studentUserId: "STU-A",
        enrollmentId: fixture.enrollments.A1,
        requirementId: fixture.requirements.A1,
        lessonDate: LESSON_DATE,
        startTime: "09:00",
      }),
    ).resolves.toMatchObject({ startTime: "09:00" });
  });

  it("refuses a slot whose only instructor or vehicle is already taken, while the other student is booked", async () => {
    // Only one instructor and one usable vehicle exist. Book the slot for STU-B first, then try STU-A at the same time.
    await prisma.vehicle.update({ where: { id: "V2" }, data: { status: "MAINTENANCE" } });
    await bookPracticalLesson({
      studentUserId: "STU-B",
      enrollmentId: fixture.enrollments.B1,
      requirementId: fixture.requirements.B1,
      lessonDate: LESSON_DATE,
      startTime: "10:00",
    });

    await expect(
      bookPracticalLesson({
        studentUserId: "STU-A",
        enrollmentId: fixture.enrollments.A1,
        requirementId: fixture.requirements.A1,
        lessonDate: LESSON_DATE,
        startTime: "10:00",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("when two students race for the last free slot, exactly one booking succeeds", async () => {
    const attempts = await Promise.allSettled([
      bookPracticalLesson({
        studentUserId: "STU-A",
        enrollmentId: fixture.enrollments.A1,
        requirementId: fixture.requirements.A1,
        lessonDate: LESSON_DATE,
        startTime: "11:00",
      }),
      bookPracticalLesson({
        studentUserId: "STU-B",
        enrollmentId: fixture.enrollments.B1,
        requirementId: fixture.requirements.B1,
        lessonDate: LESSON_DATE,
        startTime: "11:00",
      }),
    ]);
    expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.lessonSchedule.count({ where: { startTime: { equals: new Date("1970-01-01T11:00:00Z") } } })).toBe(1);
  });

  it("refuses an enrollment that belongs to another student, as not found", async () => {
    await expect(
      bookPracticalLesson({
        studentUserId: "STU-A",
        enrollmentId: fixture.enrollments.B1,
        requirementId: fixture.requirements.B1,
        lessonDate: LESSON_DATE,
        startTime: "09:00",
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("refuses a requirement that does not belong to the chosen enrollment", async () => {
    await expect(
      bookPracticalLesson({
        studentUserId: "STU-A",
        enrollmentId: fixture.enrollments.A2,
        requirementId: fixture.requirements.A1,
        lessonDate: LESSON_DATE,
        startTime: "09:00",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("stops booking once a requirement's required sessions are all booked", async () => {
    await prisma.enrollmentTrainingRequirement.update({ where: { id: fixture.requirements.A2 }, data: { requiredSessions: 1 } });
    await bookPracticalLesson({
      studentUserId: "STU-A",
      enrollmentId: fixture.enrollments.A2,
      requirementId: fixture.requirements.A2,
      lessonDate: LESSON_DATE,
      startTime: "09:00",
    });

    await expect(
      bookPracticalLesson({
        studentUserId: "STU-A",
        enrollmentId: fixture.enrollments.A2,
        requirementId: fixture.requirements.A2,
        lessonDate: LESSON_DATE,
        startTime: "10:00",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("offers only start times where a free instructor, vehicle and student all exist", async () => {
    await bookPracticalLesson({
      studentUserId: "STU-A",
      enrollmentId: fixture.enrollments.A1,
      requirementId: fixture.requirements.A1,
      lessonDate: LESSON_DATE,
      startTime: "09:00",
    });

    const options = await findBookingOptions({
      studentUserId: "STU-A",
      enrollmentId: fixture.enrollments.A1,
      requirementId: fixture.requirements.A1,
      lessonDate: LESSON_DATE,
    });
    expect(options.slots.map((s) => s.startTime)).not.toContain("09:00");
    expect(options.slots.map((s) => s.startTime)).toContain("09:30");
    expect(options.slots.map((s) => s.startTime).every((t) => t >= "09:00" && t < "12:00")).toBe(true);
    expect(options.remainingSessions).toBe(2);
  });

  it("options and booking routes require a student session (401 without one, 403 for other roles)", async () => {
    const url = `/api/student/lessons?enrollmentId=${fixture.enrollments.A1}&requirementId=${fixture.requirements.A1}&date=${LESSON_DATE}&durationMinutes=30`;
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
    await expect(
      bookPracticalLesson({
        studentUserId: "STU-A",
        enrollmentId: fixture.enrollments.A1,
        requirementId: fixture.requirements.A1,
        lessonDate: "2020-01-06",
        startTime: "09:00",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

