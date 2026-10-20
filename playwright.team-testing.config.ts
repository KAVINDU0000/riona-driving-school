import { readFileSync } from "node:fs";
import { defineConfig } from "@playwright/test";

/**
 * Browser config for ONE focused spec against the Neon team-testing branch (neondb).
 *
 * This does not replace or weaken playwright.config.ts. That config's global setup truncates shared tables, so this one
 * skips globalSetup entirely and runs only e2e/additional-vehicle-sessions.spec.ts. It starts the production build with
 * the team-testing URLs read from the DATABASE_URL and DIRECT_URL keys in .env.local. Those values are checked here and
 * are never printed. Anything other than the approved team-testing target stops the run before it starts.
 */

const ALLOWED_HOSTS = new Set([
  "ep-green-sky-b36tbzuo-pooler.c-4.ap-southeast-1.aws.neon.tech",
  "ep-green-sky-b36tbzuo.c-4.ap-southeast-1.aws.neon.tech",
]);
const ALLOWED_QUERY_KEYS = new Set(["sslmode", "channel_binding"]);
const PG_REDIRECTS = ["PGHOST", "PGHOSTADDR", "PGPORT", "PGDATABASE", "PGSERVICE", "PGSERVICEFILE"];

function readKey(name: string): string {
  const line = readFileSync(`${process.cwd()}/.env.local`, "utf8").split("\n").find((l) => l.startsWith(`${name}=`));
  const value = line?.slice(name.length + 1).trim().replace(/^"|"$/g, "");
  if (!value) throw new Error(`Refusing to run: ${name} is not set in .env.local.`);
  return value;
}

function assertTeamTesting(name: string, value: string) {
  const url = new URL(value);
  const modes = url.searchParams.getAll("sslmode");
  const approved =
    url.protocol === "postgresql:" &&
    ALLOWED_HOSTS.has(url.hostname) &&
    (url.port === "" || url.port === "5432") &&
    url.pathname === "/neondb" &&
    url.hash === "" &&
    modes.length === 1 &&
    ["require", "verify-full"].includes(modes[0]) &&
    [...url.searchParams.keys()].every((k) => ALLOWED_QUERY_KEYS.has(k));
  if (!approved) throw new Error(`Refusing to run: ${name} is not the approved team-testing database.`);
}

for (const key of PG_REDIRECTS) {
  if (process.env[key] !== undefined) throw new Error(`Refusing to run: ${key} is set. Unset it before a team-testing run.`);
}
const databaseUrl = readKey("DATABASE_URL");
const directUrl = readKey("DIRECT_URL");
assertTeamTesting("DATABASE_URL", databaseUrl);
assertTeamTesting("DIRECT_URL", directUrl);

const PORT = Number(process.env.PW_PORT ?? 3100);

// The web server gets the shell's environment minus the local test variable, so nothing points it back at localhost.
const serverEnv: Record<string, string> = {};
for (const [key, value] of Object.entries(process.env)) {
  if (value !== undefined && key !== "TEST_DATABASE_URL") serverEnv[key] = value;
}
serverEnv.DATABASE_URL = databaseUrl;
serverEnv.DIRECT_URL = directUrl;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "additional-vehicle-sessions.spec.ts",
  outputDir: "./test-results-team-testing",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  // No globalSetup: this run never truncates, reinserts or seeds any table.
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Unset channel: Playwright's bundled Chromium, with nothing installed.
    trace: "off",
    screenshot: "off",
  },
  webServer: {
    command: `node node_modules/next/dist/bin/next start -p ${PORT}`,
    url: `http://localhost:${PORT}/signup`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: serverEnv,
  },
});
