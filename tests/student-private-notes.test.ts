import { randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { LessonScheduleStatus } from "@/generated/prisma/enums";
import { GET as instructorLessons } from "@/app/api/instructor/lessons/route";
import { PUT as saveNotes } from "@/app/api/instructor/lessons/[id]/notes/route";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getAttendance, getDashboard, getFeedback, getLessons } from "@/lib/student/data";
import { ORIGIN, getRequest } from "./helpers";
import { insertLesson, seedStudentWorld } from "./student-fixtures";

// The note is a random marker, and every check compares booleans, so its text never appears in test output.
const NOTE = `private-${randomBytes(12).toString("hex")}`;
const LESSON = "LN-1";

let fixture: Awaited<ReturnType<typeof seedStudentWorld>>;

async function cookieFor(userId: string) {
  const { token } = await createSession(userId);
  return `riona_session=${token}`;
}

function putNotes(lessonId: string, notes: string, cookie: string) {
  return saveNotes(
    new Request(`${ORIGIN}/api/instructor/lessons/${lessonId}/notes`, {
      method: "PUT",
      headers: { "content-type": "application/json", origin: ORIGIN, cookie },
      body: JSON.stringify({ notes }),
    }),
    { params: Promise.resolve({ id: lessonId }) },
  );
}

/** True when the serialised value carries the private note or a "notes" field. */
function leaksNotes(value: unknown) {
  const json = JSON.stringify(value);
  return json.includes(NOTE) || /"notes"\s*:/.test(json);
}

describe("instructor private notes are never shown to students", () => {
  beforeEach(async () => {
    fixture = await seedStudentWorld();
    await insertLesson({
      id: LESSON,
      studentUserId: "STU-A",
      enrollmentKey: "A1",
      fixture,
      start: "09:00",
      end: "09:30",
      status: LessonScheduleStatus.COMPLETED,
      attendance: "PRESENT",
    });
    await prisma.lessonSchedule.update({ where: { id: LESSON }, data: { notes: NOTE } });
    await prisma.lessonFeedback.create({
      data: { lessonScheduleId: LESSON, instructorUserId: "INS-1", feedback: "Good observation at junctions", rating: 4 },
    });
  });

  it("stores the note, so the checks below test a real value", async () => {
    const row = await prisma.lessonSchedule.findUniqueOrThrow({ where: { id: LESSON }, select: { notes: true } });
    expect(row.notes === NOTE).toBe(true);
  });

  it("leaves the note out of every student portal data source, while the student still sees the lesson and feedback", async () => {
    const lessons = await getLessons("STU-A");
    expect([...lessons.upcoming, ...lessons.past].some((lesson) => lesson.id === LESSON)).toBe(true);
    expect(leaksNotes(lessons)).toBe(false);

    const feedback = await getFeedback("STU-A");
    expect(JSON.stringify(feedback).includes("Good observation at junctions")).toBe(true);
    expect(leaksNotes(feedback)).toBe(false);

    expect(leaksNotes(await getAttendance("STU-A"))).toBe(false);
    expect(leaksNotes(await getDashboard("STU-A"))).toBe(false);
  });

  it("refuses a student on the instructor lesson APIs, and the note is unchanged", async () => {
    const cookie = await cookieFor("STU-A");

    const list = await instructorLessons(getRequest("/api/instructor/lessons", cookie));
    expect(list.status).toBe(403);
    expect(leaksNotes(await list.json())).toBe(false);

    const write = await putNotes(LESSON, "overwritten by a student", cookie);
    expect(write.status).toBe(403);
    const row = await prisma.lessonSchedule.findUniqueOrThrow({ where: { id: LESSON }, select: { notes: true } });
    expect(row.notes === NOTE).toBe(true);
  });
});
