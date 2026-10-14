import { beforeEach, describe, expect, it } from "vitest";
import { UserRole } from "@/generated/prisma/enums";
import { POST as studentLogin } from "@/app/api/auth/student/login/route";
import { GET as me } from "@/app/api/auth/me/route";
import { canAccessStudentRecord, canManageLesson, canViewLesson, requireRole, requireUser, type AuthUser } from "@/lib/auth/authorize";
import { AuthError } from "@/lib/auth/http";
import { resetRateLimits } from "@/lib/auth/rate-limit";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PASSWORD, createAccount, getRequest, postRequest, resetDatabase, sessionCookieFrom } from "./helpers";

const student: AuthUser = { userId: "STU-001", email: "s1@riona.lk", role: UserRole.STUDENT };
const otherStudent: AuthUser = { userId: "STU-002", email: "s2@riona.lk", role: UserRole.STUDENT };
const instructor: AuthUser = { userId: "INS-001", email: "i1@riona.lk", role: UserRole.INSTRUCTOR };
const otherInstructor: AuthUser = { userId: "INS-002", email: "i2@riona.lk", role: UserRole.INSTRUCTOR };
const admin: AuthUser = { userId: "ADMIN-001", email: "a@riona.lk", role: UserRole.ADMIN };

async function seedLesson() {
  await createAccount({ userId: "STU-001", email: "s1@riona.lk", role: UserRole.STUDENT });
  await createAccount({ userId: "STU-002", email: "s2@riona.lk", role: UserRole.STUDENT });
  await createAccount({ userId: "INS-001", email: "i1@riona.lk", role: UserRole.INSTRUCTOR });
  await createAccount({ userId: "INS-002", email: "i2@riona.lk", role: UserRole.INSTRUCTOR });
  await createAccount({ userId: "ADMIN-001", email: "a@riona.lk", role: UserRole.ADMIN });

  await prisma.trainingPackage.create({ data: { id: "PKG1", name: "Car and Van Training", packageType: "REGULAR", price: 26000 } });
  await prisma.enrollment.create({ data: { id: "E1", studentUserId: "STU-001", packageId: "PKG1", agreedPrice: 26000, finalFee: 26000 } });
  await prisma.enrollmentTrainingRequirement.create({
    data: { id: "R1", enrollmentId: "E1", vehicleType: "CAR", trainingType: "REGULAR", requiredSessions: 10 },
  });
  await prisma.vehicle.create({ data: { id: "V1", vehicleType: "CAR", registrationNumber: "CAB-1" } });
  await prisma.instructorAvailability.create({
    data: { id: "A1", instructorUserId: "INS-001", availabilityDate: new Date("2026-10-20"), startTime: new Date("1970-01-01T09:00:00Z"), endTime: new Date("1970-01-01T12:00:00Z") },
  });
  await prisma.lessonSchedule.create({
    data: {
      id: "L1",
      lessonDate: new Date("2026-10-20"),
      startTime: new Date("1970-01-01T09:00:00Z"),
      endTime: new Date("1970-01-01T09:30:00Z"),
      durationMinutes: 30,
      instructorUserId: "INS-001",
      vehicleId: "V1",
      vehicleType: "CAR",
      studentUserId: "STU-001",
      enrollmentId: "E1",
      trainingType: "REGULAR",
    },
  });
}

describe("role-based authorization", () => {
  beforeEach(async () => {
    await resetDatabase();
    resetRateLimits();
    await seedLesson();
  });

  it("returns 401 for an unauthenticated API request", async () => {
    const response = await me(getRequest("/api/auth/me"));
    expect(response.status).toBe(401);
  });

  it("requireUser throws 401 without a session and 403 for a disallowed role", async () => {
    await expect(requireUser(getRequest("/api/x"), [UserRole.ADMIN])).rejects.toMatchObject({ status: 401 });

    const response = await studentLogin(postRequest("/api/auth/student/login", { identifier: "STU-001", password: DEFAULT_PASSWORD }));
    const cookie = sessionCookieFrom(response)!;
    const error = await requireUser(getRequest("/api/x", cookie), [UserRole.ADMIN]).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).status).toBe(403);
  });

  it("requireRole blocks a non-admin from admin operations", () => {
    expect(() => requireRole(student, [UserRole.ADMIN])).toThrow(AuthError);
    expect(() => requireRole(admin, [UserRole.ADMIN])).not.toThrow();
  });

  it("students can read their own records only", () => {
    expect(canAccessStudentRecord(student, "STU-001")).toBe(true);
    expect(canAccessStudentRecord(student, "STU-002")).toBe(false);
    expect(canAccessStudentRecord(otherStudent, "STU-001")).toBe(false);
    expect(canAccessStudentRecord(admin, "STU-001")).toBe(true);
    expect(canAccessStudentRecord(instructor, "STU-001")).toBe(false);
  });

  it("students can view their own lesson but not another student's", async () => {
    expect(await canViewLesson(student, "L1")).toBe(true);
    expect(await canViewLesson(otherStudent, "L1")).toBe(false);
  });

  it("an instructor can manage only lessons assigned to them", async () => {
    expect(await canManageLesson(instructor, "L1")).toBe(true);
    expect(await canManageLesson(otherInstructor, "L1")).toBe(false);
    expect(await canViewLesson(otherInstructor, "L1")).toBe(false);
  });

  it("students and instructors cannot manage lessons", async () => {
    expect(await canManageLesson(student, "L1")).toBe(false);
  });

  it("a missing lesson grants no access", async () => {
    expect(await canManageLesson(instructor, "NOPE")).toBe(false);
    expect(await canViewLesson(student, "NOPE")).toBe(false);
  });

  it("ignores identity claims sent in headers, query strings and bodies", async () => {
    const response = await studentLogin(postRequest("/api/auth/student/login", { identifier: "STU-001", password: DEFAULT_PASSWORD, userId: "ADMIN-001", role: "ADMIN" }));
    const cookie = sessionCookieFrom(response)!;

    const spoofed = new Request("http://localhost:3000/api/auth/me?role=ADMIN&userId=ADMIN-001", {
      headers: { cookie, "x-user-id": "ADMIN-001", "x-role": "ADMIN" },
    });
    const result = await me(spoofed);
    expect((await result.json()).user).toMatchObject({ userId: "STU-001", role: "STUDENT" });
  });
});
