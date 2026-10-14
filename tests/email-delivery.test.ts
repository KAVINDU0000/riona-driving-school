import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@/generated/prisma/enums";
import { deliverAuthEmail } from "@/lib/auth/email-delivery";
import { completePasswordReset, startPasswordReset } from "@/lib/auth/password-reset";
import { requestEmailChange, confirmEmailChange } from "@/lib/auth/email-change";
import { verifyPassword } from "@/lib/auth/password";
import { resetRateLimits } from "@/lib/auth/rate-limit";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PASSWORD, ORIGIN, createAccount, resetDatabase } from "./helpers";
import { configureEmailProvider, mockResend, restoreEmailEnv, TEST_RESEND_KEY, tokenFromLatestMessage } from "./email-mock";

describe("email delivery (Resend, mocked)", () => {
  beforeEach(async () => {
    await resetDatabase();
    resetRateLimits();
    await createAccount({ userId: "STU-001", email: "student@riona.lk", role: UserRole.STUDENT });
  });

  afterEach(() => {
    restoreEmailEnv();
  });

  it("does nothing and reports false when no provider is configured", async () => {
    const { fetchMock } = mockResend();
    expect(await deliverAuthEmail("password-reset", "student@riona.lk", "token-value")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses to build links in production when APP_ORIGIN is missing", async () => {
    configureEmailProvider();
    vi.stubEnv("APP_ORIGIN", "");
    vi.stubEnv("NODE_ENV", "production");
    const { fetchMock } = mockResend();
    expect(await deliverAuthEmail("password-reset", "student@riona.lk", "token-value")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends through Resend with the server key, the configured sender, and a link on the configured origin", async () => {
    configureEmailProvider();
    const { messages, fetchMock } = mockResend();

    expect(await deliverAuthEmail("password-reset", "student@riona.lk", "abc_DEF-123")).toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TEST_RESEND_KEY}`);
    expect(messages[0].to).toEqual(["student@riona.lk"]);
    expect(messages[0].text).toContain(`${ORIGIN}/reset-password?token=abc_DEF-123`);
  });

  it("uses a different path for email-change links", async () => {
    configureEmailProvider();
    const { messages } = mockResend();
    await deliverAuthEmail("email-change", "new@riona.lk", "token-x");
    expect(messages[0].text).toContain(`${ORIGIN}/confirm-email?token=token-x`);
  });

  it("returns false when the provider rejects the message, and never logs the token or link", async () => {
    configureEmailProvider();
    const { messages } = mockResend(422);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(await deliverAuthEmail("password-reset", "student@riona.lk", "secret-token-value")).toBe(false);

    const token = tokenFromLatestMessage(messages);
    const logged = [...errorSpy.mock.calls, ...logSpy.mock.calls].flat().map(String).join(" ");
    expect(logged).not.toContain(token);
    expect(logged).not.toContain("token=");
    expect(logged).toContain("HTTP 422");
  });

  it("returns false when the request to the provider fails, without throwing", async () => {
    configureEmailProvider();
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("network down");
    }));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await deliverAuthEmail("password-reset", "student@riona.lk", "token-value")).toBe(false);
  });

  it("a delivered reset link works once and sets the new password", async () => {
    configureEmailProvider();
    const { messages } = mockResend();

    await startPasswordReset("student@riona.lk");
    const token = tokenFromLatestMessage(messages);
    await completePasswordReset(token, "brand-new-password");

    const user = await prisma.user.findUniqueOrThrow({ where: { userId: "STU-001" } });
    expect(await verifyPassword(user.passwordHash, "brand-new-password")).toBe(true);
    await expect(completePasswordReset(token, "another-password")).rejects.toMatchObject({ status: 400 });
  });

  it("a failed reset send leaves no usable token", async () => {
    configureEmailProvider();
    const { messages } = mockResend(500);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await startPasswordReset("student@riona.lk");
    const token = tokenFromLatestMessage(messages);
    await expect(completePasswordReset(token, "brand-new-password")).rejects.toMatchObject({ status: 400 });
  });

  it("a delivered email-change link updates the address once", async () => {
    configureEmailProvider();
    const { messages } = mockResend();

    await requestEmailChange("STU-001", DEFAULT_PASSWORD, "moved@riona.lk");
    await confirmEmailChange(tokenFromLatestMessage(messages));

    const user = await prisma.user.findUniqueOrThrow({ where: { userId: "STU-001" } });
    expect(user.email).toBe("moved@riona.lk");
  });

  it("an email-change request reports 503 when the send fails", async () => {
    configureEmailProvider();
    mockResend(500);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(requestEmailChange("STU-001", DEFAULT_PASSWORD, "moved@riona.lk")).rejects.toMatchObject({ status: 503 });
  });
});
