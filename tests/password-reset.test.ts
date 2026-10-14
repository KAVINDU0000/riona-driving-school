import { beforeEach, describe, expect, it } from "vitest";
import { AccountStatus, UserRole } from "@/generated/prisma/enums";
import { POST as requestReset } from "@/app/api/auth/password-reset/request/route";
import { POST as confirmReset } from "@/app/api/auth/password-reset/confirm/route";
import { POST as studentLogin } from "@/app/api/auth/student/login/route";
import { GET as me } from "@/app/api/auth/me/route";
import { completePasswordReset, issuePasswordResetToken, startPasswordReset } from "@/lib/auth/password-reset";
import { AuthError } from "@/lib/auth/http";
import { hashToken } from "@/lib/auth/tokens";
import { resetRateLimits } from "@/lib/auth/rate-limit";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PASSWORD, createAccount, getRequest, postRequest, resetDatabase, sessionCookieFrom } from "./helpers";

const NEW_PASSWORD = "brand-new-password-1";

async function loginWith(password: string) {
  return studentLogin(postRequest("/api/auth/student/login", { identifier: "STU-001", password }));
}

describe("password reset", () => {
  beforeEach(async () => {
    await resetDatabase();
    resetRateLimits();
    await createAccount({ userId: "STU-001", email: "student@riona.lk", role: UserRole.STUDENT });
  });

  it("returns the same response for a known and an unknown email", async () => {
    const known = await requestReset(postRequest("/api/auth/password-reset/request", { email: "student@riona.lk" }));
    const unknown = await requestReset(postRequest("/api/auth/password-reset/request", { email: "nobody@riona.lk" }));
    expect(known.status).toBe(202);
    expect(await known.text()).toBe(await unknown.text());
  });

  it("does not leave a usable token when no email provider is configured", async () => {
    await startPasswordReset("student@riona.lk");
    const active = await prisma.passwordResetToken.count({ where: { usedAt: null } });
    expect(active).toBe(0);
  });

  it("stores only the hash of the reset token", async () => {
    const token = await issuePasswordResetToken("STU-001");
    const rows = await prisma.passwordResetToken.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).toBe(hashToken(token));
    expect(JSON.stringify(rows)).not.toContain(token);
  });

  it("a valid token sets the new password, works once, and revokes every session", async () => {
    const existing = sessionCookieFrom(await loginWith(DEFAULT_PASSWORD))!;
    const token = await issuePasswordResetToken("STU-001");

    const response = await confirmReset(postRequest("/api/auth/password-reset/confirm", { token, password: NEW_PASSWORD }));
    expect(response.status).toBe(200);

    expect((await loginWith(DEFAULT_PASSWORD)).status).toBe(401);
    expect((await loginWith(NEW_PASSWORD)).status).toBe(200);
    expect((await me(getRequest("/api/auth/me", existing))).status).toBe(401);

    const replay = await confirmReset(postRequest("/api/auth/password-reset/confirm", { token, password: "yet-another-password" }));
    expect(replay.status).toBe(400);
  });

  it("rejects an invalid token with a generic message", async () => {
    const response = await confirmReset(postRequest("/api/auth/password-reset/confirm", { token: "made-up-token", password: NEW_PASSWORD }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("This reset link is invalid or has expired.");
  });

  it("rejects an expired token", async () => {
    const token = await issuePasswordResetToken("STU-001");
    await prisma.passwordResetToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(completePasswordReset(token, NEW_PASSWORD)).rejects.toBeInstanceOf(AuthError);
  });

  it("rejects a reused token", async () => {
    const token = await issuePasswordResetToken("STU-001");
    await completePasswordReset(token, NEW_PASSWORD);
    await expect(completePasswordReset(token, "another-password-2")).rejects.toMatchObject({ status: 400 });
  });

  it("issuing a new token invalidates the older unused one", async () => {
    const first = await issuePasswordResetToken("STU-001");
    const second = await issuePasswordResetToken("STU-001");
    await expect(completePasswordReset(first, NEW_PASSWORD)).rejects.toMatchObject({ status: 400 });
    await expect(completePasswordReset(second, NEW_PASSWORD)).resolves.toBeUndefined();
  });

  it("two concurrent uses of one token: exactly one succeeds", async () => {
    const token = await issuePasswordResetToken("STU-001");
    const results = await Promise.allSettled([
      completePasswordReset(token, "concurrent-password-1"),
      completePasswordReset(token, "concurrent-password-2"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });

  it("a weak new password is rejected without consuming the token", async () => {
    const token = await issuePasswordResetToken("STU-001");
    const weak = await confirmReset(postRequest("/api/auth/password-reset/confirm", { token, password: "short" }));
    expect(weak.status).toBe(400);

    const ok = await confirmReset(postRequest("/api/auth/password-reset/confirm", { token, password: NEW_PASSWORD }));
    expect(ok.status).toBe(200);
  });

  it("an inactive account cannot complete a reset", async () => {
    const token = await issuePasswordResetToken("STU-001");
    await prisma.user.update({ where: { userId: "STU-001" }, data: { status: AccountStatus.INACTIVE } });
    await expect(completePasswordReset(token, NEW_PASSWORD)).rejects.toMatchObject({ status: 400 });
  });
});
