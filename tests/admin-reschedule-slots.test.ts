import { beforeEach, describe, expect, it } from "vitest";
import { rescheduleAdminLesson } from "@/lib/admin/lessons";
import { AuthError } from "@/lib/auth/http";
import { assignSessionSlot } from "@/lib/instructor/availability";
import { prisma } from "@/lib/prisma";
import { LESSON_DATE, insertLesson, seedStudentWorld } from "./student-fixtures";

let fixture: Awaited<ReturnType<typeof seedStudentWorld>>;

describe("admin reschedule to open session times", () => {
  beforeEach(async () => {
    fixture = await seedStudentWorld();
    await prisma.instructorAvailability.deleteMany({ where: { instructorUserId: "INS-1" } });
    await prisma.sessionSlot.updateMany({ data: { isActive: true } });
    await assignSessionSlot("INS-1", LESSON_DATE, "08:00");
    await assignSessionSlot("INS-1", LESSON_DATE, "10:00");
    await insertLesson({ id: "L1", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "08:00", end: "10:00" });
  });

  it("moves a lesson to another open session and takes that session's start and end times", async () => {
    const moved = await rescheduleAdminLesson("L1", LESSON_DATE, "10:00");
    expect(moved).toMatchObject({ startTime: "10:00", endTime: "12:00" });

    const row = await prisma.lessonSchedule.findUniqueOrThrow({ where: { id: "L1" } });
    expect(row.durationMinutes).toBe(120);
    expect(row.sessionGroupId).toBeNull();
  });

  it("refuses a time that is not one of the open session times", async () => {
    await expect(rescheduleAdminLesson("L1", LESSON_DATE, "09:00")).rejects.toBeInstanceOf(AuthError);
    await expect(rescheduleAdminLesson("L1", LESSON_DATE, "09:00")).rejects.toMatchObject({ status: 400 });
  });

  it("refuses a closed session", async () => {
    await prisma.sessionSlot.update({ where: { startTime: new Date("1970-01-01T10:00:00Z") }, data: { isActive: false } });
    await expect(rescheduleAdminLesson("L1", LESSON_DATE, "10:00")).rejects.toMatchObject({ status: 400 });
  });
});
