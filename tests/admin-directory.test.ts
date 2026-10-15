import { beforeEach, describe, expect, it } from "vitest";
import { AccountStatus, LessonScheduleStatus, TrainingType, UserRole, VehicleType } from "@/generated/prisma/enums";
import { ADMIN_PAGE_SIZE } from "@/lib/admin/query";
import {
  directoryQuery,
  getInstructorProfile,
  getStudentProfile,
  isDirectoryId,
  listInstructors,
  listStudents,
} from "@/lib/admin/directory";
import { prisma } from "@/lib/prisma";
import { parseDateOnly, parseTimeOnly, schoolNow } from "@/lib/student/time";
import { createAccount } from "./helpers";
import { LESSON_DATE, seedStudentWorld } from "./student-fixtures";

let fixture: Awaited<ReturnType<typeof seedStudentWorld>>;

function query(input: Parameters<typeof directoryQuery>[0]) {
  return directoryQuery(input);
}

async function lesson(
  id: string,
  date: string,
  options: { instructor?: string; student?: string; enrollmentKey?: "A1" | "B1"; status?: LessonScheduleStatus } = {},
) {
  const status = options.status ?? LessonScheduleStatus.SCHEDULED;
  return prisma.lessonSchedule.create({
    data: {
      id,
      lessonDate: parseDateOnly(date)!,
      startTime: parseTimeOnly("09:00")!,
      endTime: parseTimeOnly("09:30")!,
      durationMinutes: 30,
      instructorUserId: options.instructor ?? "INS-1",
      vehicleId: "V1",
      vehicleType: VehicleType.CAR,
      studentUserId: options.student ?? "STU-A",
      enrollmentId: fixture.enrollments[options.enrollmentKey ?? "A1"],
      trainingType: TrainingType.REGULAR,
      status,
      attendance: status === LessonScheduleStatus.COMPLETED ? "PRESENT" : null,
    },
  });
}

async function availabilityToday(instructorUserId: string) {
  await prisma.instructorAvailability.create({
    data: {
      instructorUserId,
      availabilityDate: parseDateOnly(schoolNow().date)!,
      startTime: parseTimeOnly("08:00")!,
      endTime: parseTimeOnly("18:00")!,
    },
  });
}

describe("directory query", () => {
  it("falls back to safe defaults for anything it does not recognise", () => {
    expect(query({})).toEqual({ q: "", status: "ALL", page: 1 });
    expect(query({ q: "  nimal  ", status: "ACTIVE", page: "3" })).toEqual({ q: "nimal", status: "ACTIVE", page: 3 });
    expect(query({ status: "DELETED", page: "0" })).toEqual({ q: "", status: "ALL", page: 1 });
    expect(query({ page: "abc" })).toEqual({ q: "", status: "ALL", page: 1 });
    expect(query({ q: "x".repeat(300) }).q).toHaveLength(100);
  });

  it("accepts only short ID-shaped strings for a profile URL", () => {
    expect(isDirectoryId("STU-001")).toBe(true);
    expect(isDirectoryId("../../etc")).toBe(false);
    expect(isDirectoryId("x".repeat(33))).toBe(false);
  });
});

describe("student directory", () => {
  beforeEach(async () => {
    fixture = await seedStudentWorld();
  });

  it("lists every student account, with the NIC masked and no password hash", async () => {
    const result = await listStudents(query({}));
    expect(result.students.map((s) => s.studentId)).toEqual(["STU-A", "STU-B"]);
    const json = JSON.stringify(result);
    expect(json).not.toContain("NIC-STU-A");
    expect(json).not.toContain("passwordHash");
    expect(result.students[0].nicMasked).toMatch(/^•+TU-A$/);
  });

  it("counts only active enrollments", async () => {
    const result = await listStudents(query({}));
    expect(result.students.find((s) => s.studentId === "STU-A")?.activeEnrollments).toBe(2);
    expect(result.students.find((s) => s.studentId === "STU-B")?.activeEnrollments).toBe(1);
  });

  it("searches by ID, name, email, NIC and phone", async () => {
    const ids = async (q: string) => (await listStudents(query({ q }))).students.map((s) => s.studentId);
    expect(await ids("stu-b")).toEqual(["STU-B"]);
    expect(await ids("Student STU-A")).toEqual(["STU-A"]);
    expect(await ids("a@riona.test")).toEqual(["STU-A"]);
    expect(await ids("NIC-STU-B")).toEqual(["STU-B"]);
    expect(await ids("0771234567")).toEqual(["STU-A", "STU-B"]);
    expect(await ids("nobody")).toEqual([]);
  });

  it("filters by account status", async () => {
    await prisma.user.update({ where: { userId: "STU-B" }, data: { status: AccountStatus.INACTIVE } });
    expect((await listStudents(query({ status: "ACTIVE" }))).students.map((s) => s.studentId)).toEqual(["STU-A"]);
    expect((await listStudents(query({ status: "INACTIVE" }))).students.map((s) => s.studentId)).toEqual(["STU-B"]);
  });

  it("pages the list, twenty to a page", async () => {
    for (let index = 1; index <= 25; index += 1) {
      await createAccount({ userId: `STU-P${String(index).padStart(2, "0")}`, email: `p${index}@riona.test`, role: UserRole.STUDENT });
    }
    const first = await listStudents(query({ page: "1" }));
    const second = await listStudents(query({ page: "2" }));
    expect(first.total).toBe(27);
    expect(first.pageCount).toBe(2);
    expect(first.students).toHaveLength(ADMIN_PAGE_SIZE);
    expect(second.students).toHaveLength(7);
    const seen = new Set([...first.students, ...second.students].map((s) => s.studentId));
    expect(seen.size).toBe(27);
  });

  it("shows an instructor's ID as not a student", async () => {
    expect(await getStudentProfile("INS-1")).toBeNull();
    expect(await getStudentProfile("NOPE-999")).toBeNull();
  });
});

describe("student profile", () => {
  beforeEach(async () => {
    fixture = await seedStudentWorld();
  });

  it("shows the full record with progress per enrollment, and the upcoming lessons", async () => {
    await lesson("DIR-FUTURE", LESSON_DATE);
    const profile = await getStudentProfile("STU-A");
    expect(profile).not.toBeNull();
    expect(profile!.student.nicNumber).toBe("NIC-STU-A");
    expect(profile!.enrollments).toHaveLength(2);
    const a1 = profile!.enrollments.find((e) => e.id === fixture.enrollments.A1)!;
    expect(a1.progress[0]).toMatchObject({ requiredSessions: 3, completed: 0, scheduled: 1, remaining: 2 });
    expect(profile!.upcomingLessons.map((l) => l.id)).toEqual(["DIR-FUTURE"]);
    expect(profile!.upcomingLessons[0].instructorName).toBe("Instructor INS-1");
  });

  it("never includes the text of a medical appointment, only its date and status", async () => {
    await prisma.studentMedical.create({
      data: { studentUserId: "STU-A", appointmentDate: new Date(Date.now() + 3 * 86_400_000), description: "PRIVATE-MEDICAL-NOTE" },
    });
    const profile = await getStudentProfile("STU-A");
    expect(profile!.upcomingMedical).toHaveLength(1);
    expect(JSON.stringify(profile)).not.toContain("PRIVATE-MEDICAL-NOTE");
  });
});

describe("instructor directory", () => {
  beforeEach(async () => {
    fixture = await seedStudentWorld();
    await createAccount({ userId: "INS-2", email: "ins2@riona.test", role: UserRole.INSTRUCTOR, profileStatus: AccountStatus.INACTIVE });
  });

  it("lists instructors and counts their upcoming scheduled lessons", async () => {
    await lesson("DIR-INS-FUTURE", LESSON_DATE, { instructor: "INS-1" });
    const result = await listInstructors(query({}));
    expect(result.instructors.map((i) => i.instructorId)).toEqual(["INS-1", "INS-2"]);
    expect(result.instructors.find((i) => i.instructorId === "INS-1")?.upcomingScheduledLessons).toBe(1);
    expect(JSON.stringify(result)).not.toContain("passwordHash");
  });

  it("treats an instructor as active only when the account and the profile are both active", async () => {
    await prisma.user.update({ where: { userId: "INS-1" }, data: { status: AccountStatus.INACTIVE } });
    expect((await listInstructors(query({ status: "ACTIVE" }))).instructors).toEqual([]);
    const inactive = (await listInstructors(query({ status: "INACTIVE" }))).instructors.map((i) => i.instructorId);
    expect(inactive).toEqual(["INS-1", "INS-2"]);
  });

  it("searches by ID, name, email and phone", async () => {
    const ids = async (q: string) => (await listInstructors(query({ q }))).instructors.map((i) => i.instructorId);
    expect(await ids("ins-2")).toEqual(["INS-2"]);
    expect(await ids("Instructor INS-1")).toEqual(["INS-1"]);
    expect(await ids("ins2@riona")).toEqual(["INS-2"]);
    expect(await ids("0712345678")).toEqual(["INS-1", "INS-2"]);
  });

  it("refuses a student ID as an instructor profile", async () => {
    expect(await getInstructorProfile("STU-A")).toBeNull();
  });
});

describe("instructor profile and workload", () => {
  beforeEach(async () => {
    fixture = await seedStudentWorld();
    await availabilityToday("INS-1");
  });

  it("counts this month's lessons by status, and shows upcoming lessons with the student's name", async () => {
    await lesson("DIR-DONE", schoolNow().date, { status: LessonScheduleStatus.COMPLETED });
    await lesson("DIR-NEXT", LESSON_DATE);
    const profile = await getInstructorProfile("INS-1");
    expect(profile).not.toBeNull();
    expect(profile!.monthCounts.COMPLETED).toBe(1);
    expect(profile!.monthCounts.SCHEDULED).toBe(0);
    expect(profile!.upcomingLessons.map((l) => l.id)).toEqual(["DIR-NEXT"]);
    expect(profile!.upcomingLessons[0].studentName).toBe("Student STU-A");
    expect(profile!.upcomingAvailabilityWindows).toBeGreaterThanOrEqual(1);
  });

  it("does not count lessons from earlier months", async () => {
    await prisma.instructorAvailability.create({
      data: {
        instructorUserId: "INS-1",
        availabilityDate: parseDateOnly("2020-01-15")!,
        startTime: parseTimeOnly("08:00")!,
        endTime: parseTimeOnly("18:00")!,
      },
    });
    await lesson("DIR-OLD", "2020-01-15", { status: LessonScheduleStatus.COMPLETED });
    const profile = await getInstructorProfile("INS-1");
    expect(profile!.monthCounts.COMPLETED).toBe(0);
  });
});
