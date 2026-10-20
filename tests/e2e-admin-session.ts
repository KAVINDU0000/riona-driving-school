import { isApprovedTestUrl } from "./test-target";
/**
 * Creates a session for the test admin in the disposable test database, and prints only the session token.
 * Browser tests use it instead of the sign-in form, so they do not use up the sign-in rate limit. It refuses to
 * run against any database except localhost:15432/riona_fresh_test. Run by e2e/application-status.spec.ts.
 */
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

async function main() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set.");
  const parsed = new URL(url);
  if (!(isApprovedTestUrl(parsed))) {
    throw new Error("Refusing to create a session: target is not localhost:15432/riona_fresh_test.");
  }

  const { token } = await createSession("ADMIN-1");
  process.stdout.write(`${token}\n`);
  await prisma.$disconnect();
}

void main();
