import { vi } from "vitest";

/** Test-only stand-ins. No real Resend key or sending domain is needed to run the tests. */
export const TEST_RESEND_KEY = "re_test_not_a_real_key";
export const TEST_SENDER = "Riyona <no-reply@riona.test>";

export type MessageAttempt = { to: string[]; subject: string; text: string };

/** Turns on email delivery for the duration of one test. Call restoreEmailEnv in afterEach. */
export function configureEmailProvider() {
  vi.stubEnv("RESEND_API_KEY", TEST_RESEND_KEY);
  vi.stubEnv("AUTH_EMAIL_FROM", TEST_SENDER);
  vi.stubEnv("APP_ORIGIN", "http://localhost:3000");
}

/**
 * Replaces the global fetch with a fake Resend endpoint. Every attempted message is recorded, including
 * failed ones, so tests can check what would have been sent and that a failed send is handled.
 */
export function mockResend(status = 200) {
  const messages: MessageAttempt[] = [];
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    messages.push(JSON.parse(String(init?.body)) as MessageAttempt);
    const ok = status >= 200 && status < 300;
    return new Response(ok ? '{"id":"email_test"}' : '{"message":"rejected"}', { status });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { messages, fetchMock };
}

/** Extracts the raw token from the link in the most recent message. */
export function tokenFromLatestMessage(messages: MessageAttempt[]): string {
  const latest = messages.at(-1);
  if (!latest) throw new Error("no message was sent");
  const match = /token=([^\s&]+)/.exec(latest.text);
  if (!match) throw new Error("the message has no link");
  return decodeURIComponent(match[1]);
}

export function restoreEmailEnv() {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
}
