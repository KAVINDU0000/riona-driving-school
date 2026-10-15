/**
 * Shared helpers for the interactive admin commands. Passwords are only ever read from a real terminal
 * with echo turned off: never from arguments, environment variables or piped input, and never printed.
 */
import { createInterface } from "node:readline";

export function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

/** Refuses to continue unless both stdin and stdout are an interactive terminal. */
export function requireInteractiveTerminal() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    fail("Run this command in an interactive terminal. Passwords are not accepted from pipes or arguments.");
  }
}

export function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Reads a line without echoing it. Readline draws the prompt itself: printing the question first and then
 * asking with an empty prompt let readline's line redraw (cursor to column 1, clear) erase the question.
 */
export function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const writer = rl as unknown as { _writeToOutput: (chunk: string) => void };
    const writeToOutput = writer._writeToOutput.bind(rl);
    let muted = true;
    // Readline redraws "prompt + typed text" together; keep the prompt and drop the typed characters.
    writer._writeToOutput = (chunk: string) => {
      if (!muted) return writeToOutput(chunk);
      if (chunk.startsWith(question)) writeToOutput(question);
    };
    rl.question(question, (answer) => {
      muted = false;
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

/** Asks for a new password twice. Nothing is created when the two entries differ. */
export async function askNewPassword(label: string): Promise<string> {
  const password = await askHidden(`${label} (at least 8 characters): `);
  const repeated = await askHidden("Repeat the password: ");
  if (password !== repeated) {
    fail("The passwords do not match. Nothing was changed.");
  }
  return password;
}

/**
 * Shows which database the command will write to (database name, host and port only, never the user or
 * password) and continues only when the operator types "<database>@<host>" exactly.
 */
export async function confirmDatabaseTarget() {
  const raw = process.env.DATABASE_URL;
  if (!raw) fail("DATABASE_URL is not set. Add it to .env.local first.");
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    fail("DATABASE_URL is not a valid URL.");
  }
  const database = decodeURIComponent(target.pathname.replace(/^\//, ""));
  const host = target.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1";

  console.log(`Target database: ${database} on ${host}:${target.port || "5432"}${isLocal ? " (local)" : " (REMOTE)"}`);
  const expected = `${database}@${host}`;
  const answer = (await ask(`Type ${expected} to continue: `)).trim();
  if (answer !== expected) {
    fail("The target was not confirmed. Nothing was changed.");
  }
}
