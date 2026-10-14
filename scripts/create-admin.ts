/**
 * One-time bootstrap for the first administrator account.
 *
 * Run it by hand from an interactive terminal:
 *   pnpm admin:bootstrap
 *
 * It prompts for the admin ID, email and password. The password is never read from arguments,
 * environment variables or piped input, and it is never printed. The command refuses to run
 * when an admin already exists. It is not run by builds, migrations or application startup.
 */
import { config } from "dotenv";
import { createInterface } from "node:readline";

// Loads .env.local for the DATABASE_URL. Values already set in the environment take precedence.
config({ path: ".env.local" });

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/** Reads a line without echoing it. */
function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const writer = rl as unknown as { _writeToOutput: (chunk: string) => void };
    const writeToOutput = writer._writeToOutput.bind(rl);
    let muted = true;
    writer._writeToOutput = (chunk: string) => {
      if (!muted) writeToOutput(chunk);
    };
    rl.question("", (answer) => {
      muted = false;
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    fail("Run this command in an interactive terminal. Passwords are not accepted from pipes or arguments.");
  }
  if (!process.env.DATABASE_URL) {
    fail("DATABASE_URL is not set. Add it to .env.local first.");
  }

  const { createBootstrapAdmin } = await import("@/lib/auth/bootstrap-admin");
  const { AuthError } = await import("@/lib/auth/http");
  const { prisma } = await import("@/lib/prisma");

  try {
    const userId = (await ask("Admin ID (for example ADMIN-001): ")).trim();
    const email = (await ask("Admin email: ")).trim();
    const password = await askHidden("Admin password (at least 8 characters): ");
    const repeated = await askHidden("Repeat the password: ");

    if (password !== repeated) {
      fail("The passwords do not match. Nothing was created.");
    }

    const admin = await createBootstrapAdmin({ userId, email, password });
    console.log(`Created admin account ${admin.userId} (${admin.email}).`);
    console.log("Sign in at /login?role=admin to confirm it works.");
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
