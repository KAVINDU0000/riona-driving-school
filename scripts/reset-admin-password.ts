/**
 * Local recovery: sets a new password for an existing admin who cannot sign in. Admins may have no email
 * address, so the emailed password reset cannot help them; this command is the recovery path.
 *
 * Run it by hand from an interactive terminal:
 *   pnpm admin:reset-password
 *
 * It shows the target database and asks you to type "<database>@<host>" to confirm it, then prompts for
 * the admin ID and a new password entered twice. The password is never read from arguments, environment
 * variables or piped input, and it is never printed. Only accounts with the ADMIN role can be reset. The
 * admin is signed out everywhere and any unused reset links are voided. Nothing else about the account changes.
 */
import { config } from "dotenv";
import { askNewPassword, ask, confirmDatabaseTarget, fail, requireInteractiveTerminal } from "./terminal";

// Loads .env.local for the DATABASE_URL. Values already set in the environment take precedence.
config({ path: ".env.local" });

async function main() {
  requireInteractiveTerminal();
  await confirmDatabaseTarget();

  const { resetAdminPassword } = await import("@/lib/auth/admin-recovery");
  const { AuthError } = await import("@/lib/auth/http");
  const { prisma } = await import("@/lib/prisma");

  try {
    const userId = (await ask("Admin ID to reset (for example ADMIN-001): ")).trim();
    const password = await askNewPassword("New admin password");

    const result = await resetAdminPassword(userId, password);
    console.log(`Password updated for ${result.userId}. Every session for this admin was signed out.`);
    if (result.status !== "ACTIVE") {
      console.log(`Note: this account is ${result.status}, so it still cannot sign in until it is reactivated.`);
    }
  } catch (error) {
    if (error instanceof AuthError) {
      fail(error.message);
    }
    fail("The password could not be reset. Check DATABASE_URL and that the database is migrated.");
  } finally {
    await prisma.$disconnect();
  }
}

void main();
