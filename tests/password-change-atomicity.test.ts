// Database-backed. Non-destructive: no reset. One student is created for this run and tracked for cleanup. Its password and
// sessions are restored before each test, so every test starts from the same state the reset used to give it.
import "./test-mode-guard";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@/generated/prisma/enums";
import { changePassword } from "@/lib/auth/password-change";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, revokeAllSessions } from "@/lib/auth/session";
import { hashToken } from "@/lib/auth/tokens";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PASSWORD, createAccount } from "./helpers";
import {
  baseline,
  cleanupFixtures,
  errorText,
  newTracked,
  remainingFixtureRows,
  verifyBaseline,
  type Baseline,
  type Tracked,
} from "./session-fixtures";

// Wraps the real revoke so one call can be made to fail. Every other call behaves as before.
vi.mock("@/lib/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/session")>();
  return { ...actual, revokeAllSessions: vi.fn(actual.revokeAllSessions) };
});

let t: Tracked;
let before: Baseline | undefined;
let userId = "";

beforeAll(async () => {
  t = newTracked();
  before = await baseline();
  userId = `TSS-STU-${t.runId}`;
  await createAccount({ userId, email: `password-change-${t.runId.toLowerCase()}@fixture.test`, role: UserRole.STUDENT });
  t.studentUserIds.push(userId);
});

beforeEach(async () => {
  // Restore the starting state for this student: the default password, and no sessions left from earlier tests.
  await prisma.user.update({ where: { userId }, data: { passwordHash: await hashPassword(DEFAULT_PASSWORD) } });
  await prisma.session.deleteMany({ where: { userId } });
  vi.mocked(revokeAllSessions).mockClear();
});

afterAll(async () => {
  if (!t) return;
  const failures: string[] = [];
  try {
    await cleanupFixtures(t);
  } catch (error) {
    failures.push(`CLEANUP FAILED (${errorText(error)}). Tracked IDs are listed in the message above.`);
    failures.push(...(await remainingFixtureRows(t)));
  }
  if (before) {
    try {
      await verifyBaseline(before);
    } catch (error) {
      failures.push(`BASELINE: ${errorText(error)}. ${error instanceof Error ? error.message : ""}`);
    }
  }
  if (failures.length > 0) throw new Error(failures.join("\n"));
});

describe("password change is atomic", () => {
  it("if revoking sessions fails after the password is written, neither change is kept", async () => {
    const { token } = await createSession(userId);
    vi.mocked(revokeAllSessions).mockRejectedValueOnce(new Error("forced revoke failure"));

    await expect(changePassword(userId, DEFAULT_PASSWORD, "brand-new-password")).rejects.toThrow("forced revoke failure");

    const user = await prisma.user.findUniqueOrThrow({ where: { userId }, select: { passwordHash: true } });
    expect(await verifyPassword(user.passwordHash, DEFAULT_PASSWORD)).toBe(true);
    expect(await verifyPassword(user.passwordHash, "brand-new-password")).toBe(false);
    expect(await prisma.session.count({ where: { tokenHash: hashToken(token) } })).toBe(1);
  });

  it("on success, the password is written and only the fresh session remains", async () => {
    const { token } = await createSession(userId);

    const result = await changePassword(userId, DEFAULT_PASSWORD, "brand-new-password");

    const user = await prisma.user.findUniqueOrThrow({ where: { userId }, select: { passwordHash: true } });
    expect(await verifyPassword(user.passwordHash, "brand-new-password")).toBe(true);
    expect(await prisma.session.count({ where: { tokenHash: hashToken(token) } })).toBe(0);
    expect(await prisma.session.count({ where: { tokenHash: hashToken(result.token) } })).toBe(1);
  });
});
