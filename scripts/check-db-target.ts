/**
 * Checks that DATABASE_URL (the running app) and DIRECT_URL (Prisma migrations) point at the same database
 * before anyone runs a migration:
 *   pnpm db:check
 *
 * It makes no connection and prints only hostnames, database names and where each value came from. It never
 * prints passwords or full URLs. It exits with code 1 when the two targets differ.
 *
 * Neon rule: DATABASE_URL uses the pooled host "<endpoint>-pooler.<region>" and DIRECT_URL uses the direct host
 * "<endpoint>.<region>" of the same branch. A local database may use one host for both.
 */
import { config } from "dotenv";

// Values already set in the shell are kept, the same as the other scripts. Record which ones they are first.
const fromShell = new Set(Object.keys(process.env));
config({ path: ".env.local" });

type Target = { hostname: string; endpoint: string; domain: string; database: string; pooled: boolean };

function parseTarget(name: string, value: string | undefined): Target | string {
  if (!value) return `${name} is not set.`;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return `${name} is not a valid URL.`;
  }
  const [label, ...rest] = url.hostname.split(".");
  const pooled = label.endsWith("-pooler");
  return {
    hostname: url.hostname,
    endpoint: pooled ? label.slice(0, -"-pooler".length) : label,
    domain: rest.join("."),
    database: url.pathname.replace(/^\//, ""),
    pooled,
  };
}

function describe(name: string, target: Target) {
  const source = fromShell.has(name) ? "shell" : ".env.local";
  const kind = target.pooled ? "pooled" : "direct";
  console.log(`${name} (${source}): host ${target.hostname}, database "${target.database}", ${kind}`);
}

function main(): number {
  const app = parseTarget("DATABASE_URL", process.env.DATABASE_URL);
  const migrate = parseTarget("DIRECT_URL", process.env.DIRECT_URL);
  const problems: string[] = [];

  for (const [name, result] of [["DATABASE_URL", app], ["DIRECT_URL", migrate]] as const) {
    if (typeof result === "string") problems.push(result);
    else describe(name, result);
  }
  if (problems.length > 0) {
    console.error(`\nRefusing to continue: ${problems.join(" ")}`);
    return 1;
  }

  const [a, m] = [app as Target, migrate as Target];
  if (m.pooled) {
    console.error("\nMISMATCH: DIRECT_URL must use the direct (non-pooled) host. Migrations through the pooler are not supported.");
    return 1;
  }
  if (a.hostname === m.hostname && a.database === m.database) {
    console.log("\nOK: both variables point at the same host and database (local or unpooled setup).");
    return 0;
  }

  const sameBranch = a.endpoint === m.endpoint && a.domain === m.domain && a.database === m.database;
  if (!sameBranch) {
    console.error("\nMISMATCH: DATABASE_URL and DIRECT_URL point at different branches or databases. Migrations would not affect the database the app uses.");
    return 1;
  }
  if (!a.pooled || m.pooled) {
    console.error("\nMISMATCH: DATABASE_URL should use the pooled host and DIRECT_URL the direct host of the same branch.");
    return 1;
  }
  console.log("\nOK: both variables point at the same Neon branch (pooled for the app, direct for migrations).");
  return 0;
}

process.exitCode = main();
