import { beforeEach, describe, expect, it } from "vitest";
import { POST as confirmRoute } from "@/app/api/admin/enrollment-requirements/[requirementId]/confirm/route";
import { findBookingOptions } from "@/lib/student/lesson-booking";
import { confirmRequiredSessions } from "@/lib/admin/entitlements";
import { listStudentRequirements } from "@/lib/admin/entitlement-listing";
import { getDashboard, getEnrollments } from "@/lib/student/data";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { LessonScheduleStatus } from "@/generated/prisma/enums";
import { postRequest } from "./helpers";
import { LESSON_DATE, insertLesson, seedStudentWorld } from "./student-fixtures";

async function adminCookie() {
  const { token } = await createSession("ADMIN-1");
  return `riona_session=${token}`;
}

async function studentCookie() {
  const { token } = await createSession("STU-A");
  return `riona_session=${token}`;
}

async function currentStamp(requirementId: string) {
  return (await prisma.enrollmentTrainingRequirement.findUniqueOrThrow({ where: { id: requirementId }, select: { updatedAt: true } })).updatedAt.toISOString();
}

async function countOf(requirementId: string) {
  return (await prisma.enrollmentTrainingRequirement.findUniqueOrThrow({ where: { id: requirementId }, select: { requiredSessions: true } })).requiredSessions;
}

async function auditRows(requirementId: string) {
  return prisma.enrollmentRequirementChange.findMany({ where: { requirementId }, orderBy: { changedAt: "asc" } });
}

/** Sends a confirmation as the admin. The stamp defaults to the requirement's current updatedAt. */
async function confirm(requirementId: string, body: Record<string, unknown>, cookie?: string) {
  return confirmRoute(
    postRequest(`/api/admin/enrollment-requirements/${requirementId}/confirm`, body, { cookie: cookie ?? (await adminCookie()) }),
    { params: Promise.resolve({ requirementId }) },
  );
}

describe("entitlement confirmation", () => {
  let fixture: Awaited<ReturnType<typeof seedStudentWorld>>;
  let a1: string;

  beforeEach(async () => {
    fixture = await seedStudentWorld();
    a1 = fixture.requirements.A1;
    // A1 starts as an unconfirmed allocation: no count yet.
    await prisma.enrollmentTrainingRequirement.update({ where: { id: a1 }, data: { requiredSessions: null } });
  });

  it("the first confirmation sets the count and writes one audit row with no previous count", async () => {
    const stamp = await currentStamp(a1);
    const response = await confirm(a1, { requiredSessions: 5, reason: "  Initial allocation  ", expectedUpdatedAt: stamp });

    expect(response.status).toBe(200);
    expect(await countOf(a1)).toBe(5);
    const rows = await auditRows(a1);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ previousRequiredSessions: null, newRequiredSessions: 5, reason: "Initial allocation", changedByUserId: "ADMIN-1" });
  });

  it("accepts 1 and 500, and refuses 0, 501, non-integers and non-numbers, changing nothing", async () => {
    for (const bad of [0, 501, 2.5, "3", null, -1]) {
      const response = await confirm(a1, { requiredSessions: bad, reason: "Allocation", expectedUpdatedAt: await currentStamp(a1) });
      expect(response.status, `count ${String(bad)}`).toBe(400);
    }
    expect(await countOf(a1)).toBeNull();
    expect(await auditRows(a1)).toHaveLength(0);

    expect((await confirm(a1, { requiredSessions: 1, reason: "Allocation", expectedUpdatedAt: await currentStamp(a1) })).status).toBe(200);
    expect((await confirm(a1, { requiredSessions: 500, reason: "Raised allocation", expectedUpdatedAt: await currentStamp(a1) })).status).toBe(200);
    expect(await countOf(a1)).toBe(500);
  });

  it("refuses a count below the completed plus scheduled sessions, and accepts a count equal to them, ignoring cancelled lessons", async () => {
    await insertLesson({ id: "L-done", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "09:00", end: "10:00", status: LessonScheduleStatus.COMPLETED, attendance: "PRESENT" });
    await insertLesson({ id: "L-sched", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "10:00", end: "11:00" });
    await insertLesson({ id: "L-cancel", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "11:00", end: "12:00", status: LessonScheduleStatus.CANCELLED });

    const refused = await confirm(a1, { requiredSessions: 1, reason: "Too low", expectedUpdatedAt: await currentStamp(a1) });
    expect(refused.status).toBe(409);
    expect(await refused.json()).toMatchObject({ error: expect.stringContaining("2 sessions") });
    expect(await countOf(a1)).toBeNull();
    expect(await auditRows(a1)).toHaveLength(0);

    // Equal to completed plus scheduled (2): accepted. The cancelled lesson does not raise the minimum.
    expect((await confirm(a1, { requiredSessions: 2, reason: "Exactly used", expectedUpdatedAt: await currentStamp(a1) })).status).toBe(200);
    expect(await countOf(a1)).toBe(2);
  });

  it("requires a non-blank trimmed reason on the first confirmation and on every later change, at most 300 characters", async () => {
    for (const reason of [undefined, "", "   ", "\t\n"]) {
      const response = await confirm(a1, { requiredSessions: 4, reason, expectedUpdatedAt: await currentStamp(a1) });
      expect(response.status, `reason ${JSON.stringify(reason)}`).toBe(400);
    }
    expect(await countOf(a1)).toBeNull();

    expect((await confirm(a1, { requiredSessions: 4, reason: "x".repeat(301), expectedUpdatedAt: await currentStamp(a1) })).status).toBe(400);
    expect((await confirm(a1, { requiredSessions: 4, reason: "x".repeat(300), expectedUpdatedAt: await currentStamp(a1) })).status).toBe(200);

    expect((await confirm(a1, { requiredSessions: 6, reason: "", expectedUpdatedAt: await currentStamp(a1) })).status).toBe(400);
    expect((await confirm(a1, { requiredSessions: 6, reason: "Extra sessions agreed", expectedUpdatedAt: await currentStamp(a1) })).status).toBe(200);
    const rows = await auditRows(a1);
    expect(rows.map((row) => row.previousRequiredSessions)).toEqual([null, 4]);
  });

  it("requires a well-formed expectedUpdatedAt, and refuses a stale one with 409 without changing anything", async () => {
    for (const stamp of [undefined, "", "   ", "1", "2026-10-18"]) {
      const response = await confirm(a1, { requiredSessions: 4, reason: "Allocation", expectedUpdatedAt: stamp });
      expect(response.status, `stamp ${JSON.stringify(stamp)}`).toBe(400);
    }
    expect(await countOf(a1)).toBeNull();

    const response = await confirm(a1, { requiredSessions: 4, reason: "Allocation", expectedUpdatedAt: "2000-01-01T00:00:00.000Z" });
    expect(response.status).toBe(409);
    expect(await countOf(a1)).toBeNull();
    expect(await auditRows(a1)).toHaveLength(0);
  });

  it("if the audit row cannot be written, the count change is rolled back with it", async () => {
    // The actor is not a real user, so the audit row's foreign key fails after the count has been written.
    await expect(
      confirmRequiredSessions(a1, "NO-SUCH-USER", { count: 4, reason: "Allocation", expectedUpdatedAt: await currentStamp(a1) }),
    ).rejects.toThrow();
    expect(await countOf(a1)).toBeNull();
    expect(await auditRows(a1)).toHaveLength(0);
  });

  it("lists each requirement with its count, the sessions already used (cancelled excluded), and the stamp to send back", async () => {
    await insertLesson({ id: "L-list-done", studentUserId: "STU-A", enrollmentKey: "A2", fixture, start: "09:00", end: "10:00", status: LessonScheduleStatus.COMPLETED, attendance: "PRESENT" });
    await insertLesson({ id: "L-list-cancel", studentUserId: "STU-A", enrollmentKey: "A2", fixture, start: "10:00", end: "11:00", status: LessonScheduleStatus.CANCELLED });

    const listed = await listStudentRequirements("STU-A");
    const a2 = listed.flatMap((e) => e.requirements).find((r) => r.id === fixture.requirements.A2);
    expect(a2).toMatchObject({ requiredSessions: 2, used: 1 });
    expect(a2?.updatedAt).toBe(await currentStamp(fixture.requirements.A2));
    expect(listed.flatMap((e) => e.requirements).find((r) => r.id === a1)).toMatchObject({ requiredSessions: null, used: 0 });
  });

  it("the audit history cannot be changed or deleted, even directly in the database", async () => {
    expect((await confirm(a1, { requiredSessions: 4, reason: "Allocation", expectedUpdatedAt: await currentStamp(a1) })).status).toBe(200);
    const [row] = await auditRows(a1);

    await expect(prisma.$executeRaw`UPDATE "EnrollmentRequirementChange" SET "reason" = 'changed' WHERE "id" = ${row.id}`).rejects.toThrow();
    await expect(prisma.$executeRaw`DELETE FROM "EnrollmentRequirementChange" WHERE "id" = ${row.id}`).rejects.toThrow();
    expect((await auditRows(a1))[0].reason).toBe("Allocation");
  });

  it("refuses a student, and changes nothing", async () => {
    const response = await confirm(a1, { requiredSessions: 4, reason: "Allocation", expectedUpdatedAt: await currentStamp(a1) }, await studentCookie());
    expect(response.status).not.toBe(200);
    expect(await countOf(a1)).toBeNull();
  });

  it("a pending allocation is refused for booking, and a confirmed one offers its remaining sessions", async () => {
    const pendingRequest = { studentUserId: "STU-A", enrollmentId: fixture.enrollments.A1, requirementId: a1, lessonDate: LESSON_DATE, durationMinutes: 60 };
    await expect(findBookingOptions(pendingRequest)).rejects.toMatchObject({ status: 409 });

    expect((await confirm(a1, { requiredSessions: 3, reason: "Allocation", expectedUpdatedAt: await currentStamp(a1) })).status).toBe(200);
    const options = await findBookingOptions(pendingRequest);
    expect(options.remainingSessions).toBe(3);
  });

  it("the progress views show a pending allocation as pending, never as zero, and leave it out of the totals", async () => {
    const enrollments = await getEnrollments("STU-A");
    const pending = enrollments.flatMap((e) => e.progress).find((p) => p.id === a1);
    expect(pending).toMatchObject({ pending: true, requiredSessions: null, remaining: null });

    const dashboard = await getDashboard("STU-A");
    expect(dashboard.progress.pendingAllocations).toBe(1);
    // Only A2 (2 required, none completed) is counted: the pending A1 adds nothing.
    expect(dashboard.progress.required).toBe(2);
    expect(dashboard.progress.completed).toBe(0);
  });
});
