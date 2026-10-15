import { beforeEach, describe, expect, it } from "vitest";
import { AccountStatus, UserRole } from "@/generated/prisma/enums";
import { POST as studentLogin } from "@/app/api/auth/student/login/route";
import { POST as instructorLogin } from "@/app/api/auth/instructor/login/route";
import { POST as adminLogin } from "@/app/api/auth/admin/login/route";
import { resetRateLimits } from "@/lib/auth/rate-limit";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PASSWORD, createAccount, postRequest, resetDatabase, sessionCookieFrom } from "./helpers";

async function seed() {
  await createAccount({ userId: "STU-001", email: "student@riona.lk", role: UserRole.STUDENT });
  await createAccount({ userId: "INS-001", email: "instructor@riona.lk", role: UserRole.INSTRUCTOR });
  await createAccount({ userId: "ADMIN-001", email: "admin@riona.lk", role: UserRole.ADMIN });
}

async function json(response: Response) {
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

describe("login", () => {
  beforeEach(async () => {
    await resetDatabase();
    resetRateLimits();
    await seed();
  });

  it("signs in a student and sets a session cookie", async () => {
    const response = await studentLogin(postRequest("/api/auth/student/login", { identifier: "STU-001", password: DEFAULT_PASSWORD }));
    const result = await json(response);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true, role: "STUDENT" });
    expect(sessionCookieFrom(response)).toBeDefined();
  });

  it("signs in an admin by admin ID, case-insensitively, and sets a session cookie", async () => {
    const response = await adminLogin(postRequest("/api/auth/admin/login", { identifier: " admin-001 ", password: DEFAULT_PASSWORD }));
    expect(response.status).toBe(200);
    expect((await response.json()).role).toBe("ADMIN");
    expect(sessionCookieFrom(response)).toBeDefined();
  });

  it("no longer accepts an admin's email address as the login identifier", async () => {
    const response = await adminLogin(postRequest("/api/auth/admin/login", { identifier: "admin@riona.lk", password: DEFAULT_PASSWORD }));
    expect(response.status).toBe(401);
    expect(sessionCookieFrom(response)).toBeUndefined();
  });

  it("returns the same generic error for a wrong admin password and an unknown admin ID", async () => {
    const wrongPassword = await json(await adminLogin(postRequest("/api/auth/admin/login", { identifier: "ADMIN-001", password: "not-the-password" })));
    const unknownId = await json(await adminLogin(postRequest("/api/auth/admin/login", { identifier: "ADMIN-999", password: DEFAULT_PASSWORD })));
    expect(wrongPassword.status).toBe(401);
    expect(unknownId.status).toBe(401);
    expect(wrongPassword.body).toEqual({ error: "Invalid ID or password." });
    expect(unknownId.body).toEqual(wrongPassword.body);
  });

  it("rejects an instructor on the admin endpoint, even with the correct password", async () => {
    const response = await adminLogin(postRequest("/api/auth/admin/login", { identifier: "INS-001", password: DEFAULT_PASSWORD }));
    expect(response.status).toBe(401);
  });

  it("ignores a role sent in the request body on the admin endpoint", async () => {
    const response = await adminLogin(postRequest("/api/auth/admin/login", { identifier: "STU-001", password: DEFAULT_PASSWORD, role: "ADMIN" }));
    expect(response.status).toBe(401);
  });

  it("signs in an instructor by instructor ID", async () => {
    const response = await instructorLogin(postRequest("/api/auth/instructor/login", { identifier: "ins-001", password: DEFAULT_PASSWORD }));
    expect(response.status).toBe(200);
    expect((await response.json()).role).toBe("INSTRUCTOR");
  });

  it("returns the same generic error for a wrong password and an unknown account", async () => {
    const wrongPassword = await json(await studentLogin(postRequest("/api/auth/student/login", { identifier: "STU-001", password: "not-the-password" })));
    const unknownAccount = await json(await studentLogin(postRequest("/api/auth/student/login", { identifier: "STU-999", password: DEFAULT_PASSWORD })));

    expect(wrongPassword.status).toBe(401);
    expect(unknownAccount.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownAccount.body);
  });

  it("rejects an admin or instructor on the student endpoint", async () => {
    const adminOnStudent = await studentLogin(postRequest("/api/auth/student/login", { identifier: "ADMIN-001", password: DEFAULT_PASSWORD }));
    const instructorOnStudent = await studentLogin(postRequest("/api/auth/student/login", { identifier: "INS-001", password: DEFAULT_PASSWORD }));
    expect(adminOnStudent.status).toBe(401);
    expect(instructorOnStudent.status).toBe(401);
  });

  it("rejects a student on the admin endpoint, even with the correct password", async () => {
    const response = await adminLogin(postRequest("/api/auth/admin/login", { identifier: "STU-001", password: DEFAULT_PASSWORD }));
    expect(response.status).toBe(401);
  });

  it("ignores a role sent in the request body", async () => {
    const response = await studentLogin(postRequest("/api/auth/student/login", { identifier: "STU-001", password: DEFAULT_PASSWORD, role: "ADMIN" }));
    expect((await response.json()).role).toBe("STUDENT");
  });

  it("rejects an inactive account with the generic error", async () => {
    await prisma.user.update({ where: { userId: "STU-001" }, data: { status: AccountStatus.INACTIVE } });
    const result = await json(await studentLogin(postRequest("/api/auth/student/login", { identifier: "STU-001", password: DEFAULT_PASSWORD })));
    expect(result.status).toBe(401);
    expect(result.body).toEqual({ error: "Invalid ID or password." });
  });

  it("rejects an instructor whose profile is inactive", async () => {
    await prisma.instructorProfile.update({ where: { userId: "INS-001" }, data: { status: AccountStatus.INACTIVE } });
    const response = await instructorLogin(postRequest("/api/auth/instructor/login", { identifier: "INS-001", password: DEFAULT_PASSWORD }));
    expect(response.status).toBe(401);
  });

  it("returns 400 for malformed bodies", async () => {
    const notJson = await studentLogin(postRequest("/api/auth/student/login", "{not json"));
    const notObject = await studentLogin(postRequest("/api/auth/student/login", ["STU-001"]));
    const missingPassword = await studentLogin(postRequest("/api/auth/student/login", { identifier: "STU-001" }));
    expect(notJson.status).toBe(400);
    expect(notObject.status).toBe(400);
    expect(missingPassword.status).toBe(400);
  });

  it("rejects a cross-site origin with 403", async () => {
    const response = await studentLogin(postRequest("/api/auth/student/login", { identifier: "STU-001", password: DEFAULT_PASSWORD }, { origin: "https://evil.example" }));
    expect(response.status).toBe(403);
  });

  it("never returns password or token material", async () => {
    const response = await studentLogin(postRequest("/api/auth/student/login", { identifier: "STU-001", password: DEFAULT_PASSWORD }));
    const text = await response.text();
    expect(text).not.toContain("$argon2");
    expect(text).not.toContain(DEFAULT_PASSWORD);
    expect(text).not.toContain("passwordHash");
  });

  it("locks out after repeated failures with 429 and Retry-After", async () => {
    let last = 200;
    let retryAfter: string | null = null;
    for (let attempt = 0; attempt < 12; attempt++) {
      const response = await studentLogin(postRequest("/api/auth/student/login", { identifier: "STU-001", password: "wrong-password" }));
      last = response.status;
      retryAfter = response.headers.get("retry-after");
    }
    expect(last).toBe(429);
    expect(Number(retryAfter)).toBeGreaterThan(0);
  });
});
