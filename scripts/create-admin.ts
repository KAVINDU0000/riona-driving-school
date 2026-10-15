/**
 * One-time bootstrap for the first administrator account.
 *
 * Run it by hand from an interactive terminal:
 *   pnpm admin:bootstrap
 *
 * It shows the target database and asks you to confirm it, then prompts for the admin ID and a password
 * entered twice. No email address is asked for or stored: admins sign in with their ID. The password is
 * never read from arguments, environment variables or piped input, and it is never printed. The command
 * refuses to run when an admin already exists. It is not run by builds, migrations or application startup.
 */
import { config } from "dotenv";
import { askNewPassword, ask, confirmDatabaseTarget, fail, requireInteractiveTerminal } from "./terminal";

// Loads .env.local for the DATABASE_URL. Values already set in the environment take precedence.
config({ path: ".env.local" });

async function main() {
  requireInteractiveTerminal();
  await confirmDatabaseTarget();

  const { createBootstrapAdmin } = await import("@/lib/auth/bootstrap-admin");
  const { AuthError } = await import("@/lib/auth/http");
  const { prisma } = await import("@/lib/prisma");

  try {
    const userId = (await ask("Admin ID (for example ADMIN-001): ")).trim();
    const password = await askNewPassword("Admin password");

    const admin = await createBootstrapAdmin({ userId, password });
    console.log(`Created admin account ${admin.userId}.`);
    console.log("Sign in at /login?role=admin with this admin ID and password to confirm it works.");
  } catch (error) {
    if (error instanceof AuthError) {
      fail(error.message);
    }
    fail("The admin account could not be created. Check DATABASE_URL and that the database is migrated.");
  } finally {
    await prisma.$disconnect();
  }
}

void main();
