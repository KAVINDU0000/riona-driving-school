import { beforeEach, describe, expect, it } from "vitest";
import { UserRole } from "@/generated/prisma/enums";
import { POST as changePasswordRoute } from "@/app/api/account/password/route";
import { POST as instructorLogin } from "@/app/api/auth/instructor/login/route";
import { confirmEmailChange, issueEmailChangeToken, requestEmailChange } from "@/lib/auth/email-change";
import { resetRateLimits } from "@/lib/auth/rate-limit";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PASSWORD, createAccount, postRequest, sessionCookieFrom } from "./helpers";
import { seedStudentWorld } from "./student-fixtures";
import { createSession } from "@/lib/auth/session";

const NEW_PASSWORD = "brand-new-instructor-pass";

async function instructorCookie(userId: string) {
  const { token } = await createSession(userId);
  return `riona_session=${token}`;
}

describe("instructor account flows", () => {
  beforeEach(async () => {
    await seedStudentWorld();
    await createAccount({ userId: "INS-2", email: "ins2@riona.test", role: UserRole.INSTRUCTOR });
    resetRateLimits();
  });

  it("changes an instructor's password with the current one, and the new one signs them in", async () => {
    const response = await changePasswordRoute(
      postRequest(
        "/api/account/password",
        { currentPassword: DEFAULT_PASSWORD, newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD },
        { cookie: await instructorCookie("INS-1") },
      ),
    );
    expect(response.status).toBe(200);

    const withNew = await instructorLogin(postRequest("/api/auth/instructor/login", { identifier: "INS-1", password: NEW_PASSWORD }));
    expect(withNew.status).toBe(200);
    expect(sessionCookieFrom(withNew)).toBeDefined();
    const withOld = await instructorLogin(postRequest("/api/auth/instructor/login", { identifier: "INS-1", password: DEFAULT_PASSWORD }));
    expect(withOld.status).toBe(401);
  });

  it("refuses a password change with the wrong current password", async () => {
    const response = await changePasswordRoute(
      postRequest(
        "/api/account/password",
        { currentPassword: "not-the-password", newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD },
        { cookie: await instructorCookie("INS-1") },
      ),
    );
    expect(response.status).toBe(401);
  });

  it("changes an instructor's email only after the confirmation link is used", async () => {
    const token = await issueEmailChangeToken("INS-1", "ins1.new@riona.test");
    expect((await prisma.user.findUnique({ where: { userId: "INS-1" } }))?.email).toBe("ins1@riona.test");

    await confirmEmailChange(token);
    expect((await prisma.user.findUnique({ where: { userId: "INS-1" } }))?.email).toBe("ins1.new@riona.test");
  });

  it("refuses an email address another account already uses", async () => {
    await expect(requestEmailChange("INS-1", DEFAULT_PASSWORD, "ins2@riona.test")).rejects.toMatchObject({ status: 409 });
  });

  it("requires the current password before an email change is requested", async () => {
    await expect(requestEmailChange("INS-1", "not-the-password", "ins1.other@riona.test")).rejects.toMatchObject({ status: 401 });
  });
});
