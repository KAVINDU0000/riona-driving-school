import { beforeEach, describe, expect, it } from "vitest";
import { UserRole } from "@/generated/prisma/enums";
import { AuthError } from "@/lib/auth/http";
import { assignSessionSlot } from "@/lib/instructor/availability";
import { prisma } from "@/lib/prisma";
import { bookPracticalLesson, findBookingOptions } from "@/lib/student/lesson-booking";
import { createAccount } from "./helpers";
import { seedStudentWorld } from "./student-fixtures";

let fixture: Awaited<ReturnType<typeof seedStudentWorld>>;

/** A date with no seeded windows, so each test controls its own sessions. */
const DAY = "2099-07-01";

function bookingFor(studentUserId: "STU-A" | "STU-B") {
  const enrollmentId = studentUserId === "STU-A" ? fixture.enrollments.A1 : fixture.enrollments.B1;
  const requirementId = studentUserId === "STU-A" ? fixture.requirements.A1 : fixture.requirements.B1;
  return { studentUserId, enrollmentId, requirementId, lessonDate: DAY, startTime: "08:00" };
}

async function statusOf(promise: Promise<unknown>): Promise<number | "ok"> {
  try {
    await promise;
    return "ok";
  } catch (error) {
    return error instanceof AuthError ? error.status : -1;
  }
}

describe("shared session groups", () => {
  beforeEach(async () => {
    fixture = await seedStudentWorld();
    // The seat limits live outside the reset helper, so every test starts from the seeded numbers.
    await prisma.vehicleTypeCapacity.update({ where: { vehicleType: "CAR" }, data: { seats: 4 } });
    await createAccount({ userId: "INS-2", email: "ins2@riona.test", role: UserRole.INSTRUCTOR });
    await assignSessionSlot("INS-1", DAY, "08:00");
    await assignSessionSlot("INS-2", DAY, "08:00");
  });

  it("puts two students with the same vehicle type in one session, with one instructor and one vehicle", async () => {
    const first = await bookPracticalLesson(bookingFor("STU-A"));
    const second = await bookPracticalLesson(bookingFor("STU-B"));

    const lessons = await prisma.lessonSchedule.findMany({ where: { id: { in: [first.id, second.id] } } });
    expect(new Set(lessons.map((l) => l.sessionGroupId)).size).toBe(1);
    expect(new Set(lessons.map((l) => l.instructorUserId)).size).toBe(1);
    expect(new Set(lessons.map((l) => l.vehicleId)).size).toBe(1);
    expect(await prisma.sessionGroup.count()).toBe(1);
  });

  it("gives every student their own lesson record, with the full slot length", async () => {
    const lesson = await bookPracticalLesson(bookingFor("STU-A"));
    expect(lesson).toMatchObject({ startTime: "08:00", endTime: "10:00", durationMinutes: 120 });
    const row = await prisma.lessonSchedule.findUniqueOrThrow({ where: { id: lesson.id } });
    expect(row.studentUserId).toBe("STU-A");
    expect(row.sessionGroupId).not.toBeNull();
  });

  it("opens a second session with another instructor and vehicle when the first one is full", async () => {
    await prisma.vehicleTypeCapacity.update({ where: { vehicleType: "CAR" }, data: { seats: 1 } });
    await bookPracticalLesson(bookingFor("STU-A"));
    await bookPracticalLesson(bookingFor("STU-B"));

    const groups = await prisma.sessionGroup.findMany();
    expect(groups).toHaveLength(2);
    expect(new Set(groups.map((g) => g.instructorUserId)).size).toBe(2);
    expect(new Set(groups.map((g) => g.vehicleId)).size).toBe(2);
    expect(groups.every((g) => g.capacity === 1)).toBe(true);
  });

  it("refuses a second lesson for the same student in the same slot", async () => {
    await bookPracticalLesson(bookingFor("STU-A"));
    expect(await statusOf(bookPracticalLesson(bookingFor("STU-A")))).toBe(409);
  });

  it("keeps offering a slot while a session still has a free seat, and stops when every session is full", async () => {
    await prisma.vehicleTypeCapacity.update({ where: { vehicleType: "CAR" }, data: { seats: 1 } });
    const before = await findBookingOptions({ ...bookingFor("STU-A"), lessonDate: DAY });
    expect(before.slots).toEqual([{ startTime: "08:00", endTime: "10:00" }]);

    await bookPracticalLesson(bookingFor("STU-B"));
    await bookPracticalLesson(bookingFor("STU-A"));

    // Both instructors' sessions are now full at one seat each, so the slot is no longer offered to a new student.
    const after = await findBookingOptions({ ...bookingFor("STU-A"), lessonDate: DAY });
    expect(after.slots).toEqual([]);
  });

  it("a vehicle type's seat limit is read when a session is opened", async () => {
    await prisma.vehicleTypeCapacity.update({ where: { vehicleType: "CAR" }, data: { seats: 3 } });
    await bookPracticalLesson(bookingFor("STU-A"));
    const group = await prisma.sessionGroup.findFirstOrThrow();
    expect(group.capacity).toBe(3);
  });
});
