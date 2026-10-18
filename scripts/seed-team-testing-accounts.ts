/**
 * One-time: creates one admin and two instructors on the shared Neon branch `team-testing`.
 *
 *   $env:TEAM_STAFF_PASSWORD = "<choose a password>"
 *   pnpm exec tsx scripts/seed-team-testing-accounts.ts
 *
 * - Refuses to run unless DATABASE_URL points at exactly the team-testing branch (pooled or direct host).
 *   It does not read .env.local.
 * - The password comes from TEAM_STAFF_PASSWORD, so no password is stored in the repo. Share it privately
 *   and ask everyone to change it after the first sign-in.
 * - Creates staff accounts only. Students are created through the app. Existing accounts are left unchanged.
 */
import { AccountStatus, UserRole } from "../src/generated/prisma/enums";
import { hashPassword } from "../src/lib/auth/password";
import { prisma } from "../src/lib/prisma";

const ALLOWED_HOSTS = new Set([
  "ep-green-sky-b36tbzuo-pooler.c-4.ap-southeast-1.aws.neon.tech",
  "ep-green-sky-b36tbzuo.c-4.ap-southeast-1.aws.neon.tech",
]);

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function assertTeamTestingBranch() {
  const raw = process.env.DATABASE_URL;
  if (!raw) fail("DATABASE_URL is not set.");
  let host: string;
  try {
    host = new URL(raw).hostname;
  } catch {
    fail("DATABASE_URL is not a valid URL.");
  }
  if (!ALLOWED_HOSTS.has(host)) fail("Refusing to seed: DATABASE_URL is not the team-testing branch.");
}

const accounts = [
  { userId: "ADMIN-TEAM", email: "admin.team@example.com", role: UserRole.ADMIN, fullName: null },
  { userId: "INS-TEAM-1", email: "instructor1.team@example.com", role: UserRole.INSTRUCTOR, fullName: "Test Instructor One" },
  { userId: "INS-TEAM-2", email: "instructor2.team@example.com", role: UserRole.INSTRUCTOR, fullName: "Test Instructor Two" },
] as const;

async function main() {
  assertTeamTestingBranch();
  const password = process.env.TEAM_STAFF_PASSWORD;
  if (!password || password.length < 12) fail("Set TEAM_STAFF_PASSWORD to a password of at least 12 characters.");

  const passwordHash = await hashPassword(password);
  const created: string[] = [];
  const skipped: string[] = [];

  try {
    await prisma.$transaction(async (tx) => {
      for (const account of accounts) {
        const existing = await tx.user.findUnique({ where: { userId: account.userId } });
        if (existing) {
          skipped.push(account.userId);
          continue;
        }
        await tx.user.create({
          data: { userId: account.userId, email: account.email, passwordHash, role: account.role, status: AccountStatus.ACTIVE },
        });
        if (account.role === UserRole.INSTRUCTOR) {
          await tx.instructorProfile.create({
            data: {
              userId: account.userId,
              fullName: account.fullName,
              phoneNumber: "0712345678",
              hireDate: new Date("2025-01-01"),
              status: AccountStatus.ACTIVE,
            },
          });
        }
        created.push(account.userId);
      }
    });
    console.log(`Created: ${created.join(", ") || "none"}.`);
    if (skipped.length) console.log(`Already present (left unchanged): ${skipped.join(", ")}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Seeding failed:", error instanceof Error ? error.name : "UnknownError");
  process.exit(1);
});
