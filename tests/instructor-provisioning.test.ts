import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@/generated/prisma/enums";
import { POST as createInstructor } from "@/app/api/admin/instructors/route";
import { POST as instructorLogin } from "@/app/api/auth/instructor/login/route";
import { completePasswordReset } from "@/lib/auth/password-reset";
import { createSession } from "@/lib/auth/session";
import { resetRateLimits } from "@/lib/auth/rate-limit";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PASSWORD, ORIGIN, createAccount, postRequest, resetDatabase } from "./helpers";
import { configureEmailProvider, mockResend, restoreEmailEnv, tokenFromLatestMessage } from "./email-mock";

const VALID_BODY = {
  instructorId: "ins-002",
  email: "Nimal.Perera@Riona.lk",
  fullName: "Nimal Perera",
  phoneNumber: "071 234 5678",
  hireDate: "2025-03-01",
};

async function cookieFor(userId: string) {
  const { token } = await createSession(userId);
  return `riona_session=${token}`;
}

function createRequest(body: unknown, cookie?: string, origin?: string | null) {
  return postRequest("/api/admin/instructors", body, { cookie, origin });
}

describe("instructor provisioning", () => {
  beforeEach(async () => {
    await resetDatabase();
    resetRateLimits();
    await createAccount({ userId: "ADMIN-001", email: "admin@riona.lk", role: UserRole.ADMIN });
    await createAccount({ userId: "STU-001", email: "student@riona.lk", role: UserRole.STUDENT });
    await createAccount({ userId: "INS-001", email: "existing@riona.lk", role: UserRole.INSTRUCTOR });
    configureEmailProvider();
  });

  afterEach(() => {
    restoreEmailEnv();
  });

  it("rejects a request with no session (401) and does not create an account", async () => {
    mockResend();
    const response = await createInstructor(createRequest(VALID_BODY));
    expect(response.status).toBe(401);
    expect(await prisma.user.findUnique({ where: { userId: "INS-002" } })).toBeNull();
  });

  it("rejects a student session (403)", async () => {
    mockResend();
    const response = await createInstructor(createRequest(VALID_BODY, await cookieFor("STU-001")));
    expect(response.status).toBe(403);
    expect(await prisma.user.findUnique({ where: { userId: "INS-002" } })).toBeNull();
  });

  it("an instructor cannot create instructors, including themselves (403)", async () => {
    mockResend();
    const response = await createInstructor(createRequest(VALID_BODY, await cookieFor("INS-001")));
    expect(response.status).toBe(403);
    expect(await prisma.instructorProfile.count()).toBe(1);
  });

  it("rejects a cross-site request even with a valid admin session (403)", async () => {
    mockResend();
    const response = await createInstructor(createRequest(VALID_BODY, await cookieFor("ADMIN-001"), "https://evil.example"));
    expect(response.status).toBe(403);
    expect(await prisma.user.findUnique({ where: { userId: "INS-002" } })).toBeNull();
  });

  it("an admin creates the user and profile together, sends an invitation, and returns no secrets", async () => {
    const { messages } = mockResend();
    const response = await createInstructor(createRequest(VALID_BODY, await cookieFor("ADMIN-001")));

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual({ ok: true, instructor: { userId: "INS-002", email: "nimal.perera@riona.lk" }, inviteSent: true });
    expect(JSON.stringify(body)).not.toMatch(/passwordHash|token|argon2/i);

    const user = await prisma.user.findUniqueOrThrow({ where: { userId: "INS-002" }, include: { instructorProfile: true } });
    expect(user.role).toBe(UserRole.INSTRUCTOR);
    expect(user.instructorProfile?.fullName).toBe("Nimal Perera");
    expect(user.instructorProfile?.phoneNumber).toBe("0712345678");
    expect(await prisma.passwordResetToken.count({ where: { userId: "INS-002" } })).toBe(1);

    expect(messages).toHaveLength(1);
    expect(messages[0].to).toEqual(["nimal.perera@riona.lk"]);
    expect(messages[0].text).toContain(`${ORIGIN}/reset-password?token=`);
  });

  it("the invited instructor sets a password through the emailed link, then can sign in", async () => {
    const { messages } = mockResend();
    await createInstructor(createRequest(VALID_BODY, await cookieFor("ADMIN-001")));

    await completePasswordReset(tokenFromLatestMessage(messages), "instructor-choice-123");

    const response = await instructorLogin(postRequest("/api/auth/instructor/login", { identifier: "INS-002", password: "instructor-choice-123" }));
    expect(response.status).toBe(200);
    expect((await response.json()).role).toBe("INSTRUCTOR");
  });

  it("a duplicate email is refused and leaves no partial profile behind", async () => {
    mockResend();
    const response = await createInstructor(
      createRequest({ ...VALID_BODY, email: "existing@riona.lk" }, await cookieFor("ADMIN-001")),
    );
    expect(response.status).toBe(409);
    expect(await prisma.user.findUnique({ where: { userId: "INS-002" } })).toBeNull();
    expect(await prisma.instructorProfile.count()).toBe(1);
  });

  it("a duplicate instructor ID is refused and leaves no partial profile behind", async () => {
    mockResend();
    const response = await createInstructor(
      createRequest({ ...VALID_BODY, instructorId: "INS-001" }, await cookieFor("ADMIN-001")),
    );
    expect(response.status).toBe(409);
    expect(await prisma.user.findUniqueOrThrow({ where: { userId: "INS-001" } })).toBeTruthy();
    expect(await prisma.instructorProfile.count()).toBe(1);
  });

  it("when the invitation cannot be sent, the account is not created at all (503)", async () => {
    mockResend(500);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await createInstructor(createRequest(VALID_BODY, await cookieFor("ADMIN-001")));

    expect(response.status).toBe(503);
    expect(await prisma.user.findUnique({ where: { userId: "INS-002" } })).toBeNull();
    expect(await prisma.instructorProfile.count()).toBe(1);
    expect(await prisma.passwordResetToken.count()).toBe(0);
  });

  it("with no email provider configured, the account is not created", async () => {
    restoreEmailEnv();
    mockResend();
    const response = await createInstructor(createRequest(VALID_BODY, await cookieFor("ADMIN-001")));
    expect(response.status).toBe(503);
    expect(await prisma.user.findUnique({ where: { userId: "INS-002" } })).toBeNull();
  });

  it("validates the details before creating anything", async () => {
    mockResend();
    const admin = await cookieFor("ADMIN-001");
    const cases: Record<string, unknown>[] = [
      { ...VALID_BODY, instructorId: "x" },
      { ...VALID_BODY, email: "not-an-email" },
      { ...VALID_BODY, phoneNumber: "12345" },
      { ...VALID_BODY, hireDate: "2025-02-30" },
      { ...VALID_BODY, hireDate: "2999-01-01" },
      { ...VALID_BODY, fullName: "" },
      { instructorId: "INS-002" },
    ];
    for (const body of cases) {
      const response = await createInstructor(createRequest(body, admin));
      expect(response.status).toBe(400);
    }
    expect(await prisma.user.count({ where: { role: UserRole.INSTRUCTOR } })).toBe(1);
  });

  it("the account's random initial password does not work before the invitation is used", async () => {
    mockResend();
    await createInstructor(createRequest(VALID_BODY, await cookieFor("ADMIN-001")));
    const response = await instructorLogin(postRequest("/api/auth/instructor/login", { identifier: "INS-002", password: DEFAULT_PASSWORD }));
    expect(response.status).toBe(401);
  });
});
