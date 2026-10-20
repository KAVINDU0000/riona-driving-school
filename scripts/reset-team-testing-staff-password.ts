/**
 * Sets the password of the three shared test staff accounts on the Neon branch `team-testing`.
 *
 *   $env:TEAM_STAFF_PASSWORD = "<the password you chose>"
 *   pnpm exec tsx scripts/reset-team-testing-staff-password.ts
 *
 * - Refuses to run unless DATABASE_URL points at exactly the team-testing branch (pooled or direct host).
 * - Changes only ADMIN-TEAM, INS-TEAM-1 and INS-TEAM-2. It touches no other account, session or record.
 */
import { hashPassword } from "../src/lib/auth/password";
import { prisma } from "../src/lib/prisma";

const ALLOWED_HOSTS = new Set([
  "ep-green-sky-b36tbzuo-pooler.c-4.ap-southeast-1.aws.neon.tech",
  "ep-green-sky-b36tbzuo.c-4.ap-southeast-1.aws.neon.tech",
]);

const STAFF_IDS = ["ADMIN-TEAM", "INS-TEAM-1", "INS-TEAM-2"];

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
  if (!ALLOWED_HOSTS.has(host)) fail("Refusing to change passwords: DATABASE_URL is not the team-testing branch.");
  const queryKeys = [...new URL(raw).searchParams.keys()];
  if (!queryKeys.every((k, i, all) => (k === "sslmode" || k === "channel_binding") && all.indexOf(k) === i)) {
    fail("Refusing to change passwords: DATABASE_URL may carry only sslmode and channel_binding, each once.");
  }
}

async function main() {
  assertTeamTestingBranch();
  const password = process.env.TEAM_STAFF_PASSWORD;
  if (!password || password.length < 12) fail("Set TEAM_STAFF_PASSWORD to a password of at least 12 characters.");

  const passwordHash = await hashPassword(password);
  try {
    const result = await prisma.user.updateMany({
      where: { userId: { in: STAFF_IDS } },
      data: { passwordHash },
    });
    const rows = await prisma.user.findMany({
      where: { userId: { in: STAFF_IDS } },
      select: { userId: true, role: true, status: true },
      orderBy: { userId: "asc" },
    });
    console.log(`Updated ${result.count} staff password(s).`);
    for (const row of rows) console.log(`  ${row.userId}: ${row.role}, ${row.status}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Password reset failed:", error instanceof Error ? error.name : "UnknownError");
  process.exit(1);
});
