import { beforeEach, describe, expect, it } from "vitest";
import { UserRole } from "@/generated/prisma/enums";
import { POST as requestChange } from "@/app/api/account/email/request/route";
import { POST as confirmChange } from "@/app/api/account/email/confirm/route";
import { POST as studentLogin } from "@/app/api/auth/student/login/route";
import { confirmEmailChange, issueEmailChangeToken, requestEmailChange } from "@/lib/auth/email-change";
import { AuthError } from "@/lib/auth/http";
import { hashToken } from "@/lib/auth/tokens";
import { resetRateLimits } from "@/lib/auth/rate-limit";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PASSWORD, createAccount, postRequest, resetDatabase, sessionCookieFrom } from "./helpers";

async function signedInCookie(userId: string) {
  const response = await studentLogin(postRequest("/api/auth/student/login", { identifier: userId, password: DEFAULT_PASSWORD }));
  return sessionCookieFrom(response)!;
}

describe("email change", () => {
  beforeEach(async () => {
    await resetDatabase();
    resetRateLimits();
    await createAccount({ userId: "STU-001", email: "old@riona.lk", role: UserRole.STUDENT });
    await createAccount({ userId: "STU-002", email: "taken@riona.lk", role: UserRole.STUDENT });
  });

  it("requires a signed-in session", async () => {
    const response = await requestChange(postRequest("/api/account/email/request", { newEmail: "new@riona.lk", currentPassword: DEFAULT_PASSWORD }));
    expect(response.status).toBe(401);
  });

  it("requires the correct current password", async () => {
    await expect(requestEmailChange("STU-001", "wrong-password", "new@riona.lk")).rejects.toMatchObject({ status: 401 });
  });

  it("validates and normalises the proposed address", async () => {
    await expect(requestEmailChange("STU-001", DEFAULT_PASSWORD, "not-an-email")).rejects.toMatchObject({ status: 400 });
    await expect(requestEmailChange("STU-001", DEFAULT_PASSWORD, "old@riona.lk")).rejects.toMatchObject({ status: 400 });
  });

  it("reports a conflict when the address is already used", async () => {
    await expect(requestEmailChange("STU-001", DEFAULT_PASSWORD, "TAKEN@riona.lk")).rejects.toMatchObject({ status: 409 });
  });

  it("does not change the email until the link is confirmed", async () => {
    await issueEmailChangeToken("STU-001", "new@riona.lk");
    const user = await prisma.user.findUnique({ where: { userId: "STU-001" } });
    expect(user?.email).toBe("old@riona.lk");
  });

  it("returns 503 and leaves nothing usable when no email provider is configured", async () => {
    const cookie = await signedInCookie("STU-001");
    const response = await requestChange(postRequest("/api/account/email/request", { newEmail: "new@riona.lk", currentPassword: DEFAULT_PASSWORD }, { cookie }));
    expect(response.status).toBe(503);
    expect(await prisma.emailChangeToken.count({ where: { usedAt: null } })).toBe(0);
  });

  it("a valid token changes the email and invalidates other outstanding tokens", async () => {
    const first = await issueEmailChangeToken("STU-001", "first@riona.lk");
    const second = await issueEmailChangeToken("STU-001", "second@riona.lk");

    await confirmEmailChange(second);
    const user = await prisma.user.findUnique({ where: { userId: "STU-001" } });
    expect(user?.email).toBe("second@riona.lk");

    await expect(confirmEmailChange(first)).rejects.toMatchObject({ status: 400 });
  });

  it("stores only the hash of the confirmation token", async () => {
    const token = await issueEmailChangeToken("STU-001", "new@riona.lk");
    const rows = await prisma.emailChangeToken.findMany();
    expect(rows[0].tokenHash).toBe(hashToken(token));
    expect(JSON.stringify(rows)).not.toContain(token);
  });

  it("rejects an invalid token", async () => {
    const response = await confirmChange(postRequest("/api/account/email/confirm", { token: "made-up" }));
    expect(response.status).toBe(400);
  });

  it("rejects an expired token", async () => {
    const token = await issueEmailChangeToken("STU-001", "new@riona.lk");
    await prisma.emailChangeToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(confirmEmailChange(token)).rejects.toBeInstanceOf(AuthError);
  });

  it("rejects a reused token", async () => {
    const token = await issueEmailChangeToken("STU-001", "new@riona.lk");
    await confirmEmailChange(token);
    await expect(confirmEmailChange(token)).rejects.toMatchObject({ status: 400 });
  });

  it("a confirmation for an address taken after the request was made is refused", async () => {
    const token = await issueEmailChangeToken("STU-001", "shared@riona.lk");
    const otherToken = await issueEmailChangeToken("STU-002", "shared@riona.lk");
    await confirmEmailChange(otherToken); // STU-002 takes the address first

    await expect(confirmEmailChange(token)).rejects.toMatchObject({ status: 409 });
    const user = await prisma.user.findUnique({ where: { userId: "STU-001" } });
    expect(user?.email).toBe("old@riona.lk");
  });

  it("two concurrent confirmations for the same new address: exactly one succeeds", async () => {
    const tokenA = await issueEmailChangeToken("STU-001", "race@riona.lk");
    await createAccount({ userId: "STU-003", email: "third@riona.lk", role: UserRole.STUDENT });
    const tokenB = await issueEmailChangeToken("STU-003", "race@riona.lk");

    const results = await Promise.allSettled([confirmEmailChange(tokenA), confirmEmailChange(tokenB)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.user.count({ where: { email: "race@riona.lk" } })).toBe(1);
  });
});
