/**
 * Points the app's Prisma client at a disposable test database. Exactly two targets are accepted:
 *
 * - Default: localhost:15432/riona_fresh_test over PostgreSQL, given by TEST_DATABASE_URL. Both connection
 *   variables are then set to that URL, so no code path can reach another database.
 * - team-testing (Neon, shared): only when the shell sets TEST_TARGET=team-testing and
 *   TEST_CONFIRM_TRUNCATE=team-testing. DATABASE_URL and DIRECT_URL are each checked on their own against the two
 *   approved team-testing hosts, with the postgresql: protocol, database "neondb", the default port, no fragment,
 *   a single sslmode of require or verify-full, and no query parameters other than sslmode and channel_binding.
 *   The PG* variables that redirect a connection (PGHOST, PGHOSTADDR, PGPORT, PGDATABASE, PGSERVICE,
 *   PGSERVICEFILE) must be unset. Anything else is refused.
 *
 * - disposable-pg18 (a dedicated test container, never shared): only when the shell sets TEST_TARGET=disposable-pg18 and
 *   TEST_CONFIRM_TRUNCATE=disposable-pg18, and TEST_DATABASE_URL is exactly 127.0.0.1:15435/riona_c3_disposable with no
 *   query parameters and no fragment. DATABASE_URL and DIRECT_URL must be unset or equal to that URL. Any other value is
 *   refused, so an ambiguous configuration never runs.
 *
 * Error messages never include a URL or any part of one.
 */

const LOCAL_TARGET = { protocol: "postgresql:", hostname: "localhost", port: "15432", database: "riona_fresh_test" };

// The two hosts of the team-testing branch. Same values as scripts/seed-team-testing-accounts.ts.
const TEAM_TESTING_HOSTS = new Set([
  "ep-green-sky-b36tbzuo-pooler.c-4.ap-southeast-1.aws.neon.tech",
  "ep-green-sky-b36tbzuo.c-4.ap-southeast-1.aws.neon.tech",
]);
const TEAM_TESTING_DATABASE = "neondb";

// Any other query parameter (for example "host" or "db") could send the connection to a different server or database, so it is refused.
const ALLOWED_QUERY_PARAMETERS = new Set(["sslmode", "channel_binding"]);

// Environment variables the driver reads when a URL omits the matching field. Any of them could redirect a team-testing run.
const PG_ENVIRONMENT_OVERRIDES = ["PGHOST", "PGHOSTADDR", "PGPORT", "PGDATABASE", "PGSERVICE", "PGSERVICEFILE"];
const TEAM_TESTING_SSL_MODES = new Set(["require", "verify-full"]);

function parseUrl(name: string, value: string | undefined): URL {
  if (!value) throw new Error(`Refusing to run: ${name} is not set.`);
  try {
    return new URL(value);
  } catch {
    throw new Error(`Refusing to run: ${name} is not a valid URL.`);
  }
}

function hasOnlyAllowedParameters(url: URL): boolean {
  for (const key of url.searchParams.keys()) {
    if (!ALLOWED_QUERY_PARAMETERS.has(key)) return false;
  }
  return true;
}

// Exactly one sslmode, and it must require TLS. With a repeated key the driver keeps the last value, so a single
// value is the only case where the check and the driver agree.
function sslModeRequiresTls(url: URL): boolean {
  const modes = url.searchParams.getAll("sslmode");
  return modes.length === 1 && TEAM_TESTING_SSL_MODES.has(modes[0]);
}

function checkTeamTesting() {
  if (process.env.TEST_CONFIRM_TRUNCATE !== "team-testing") {
    throw new Error("Refusing to run: team-testing needs TEST_CONFIRM_TRUNCATE=team-testing, because test data and the team staff accounts will be deleted.");
  }
  for (const key of PG_ENVIRONMENT_OVERRIDES) {
    if (process.env[key] !== undefined) {
      throw new Error(`Refusing to run: ${key} is set. Unset it before a team-testing run, because it could redirect the connection.`);
    }
  }
  for (const name of ["DATABASE_URL", "DIRECT_URL"] as const) {
    const url = parseUrl(name, process.env[name]);
    const isApproved =
      url.protocol === "postgresql:" &&
      TEAM_TESTING_HOSTS.has(url.hostname) &&
      (url.port === "" || url.port === "5432") &&
      url.pathname === `/${TEAM_TESTING_DATABASE}` &&
      url.hash === "" &&
      sslModeRequiresTls(url) &&
      hasOnlyAllowedParameters(url);
    if (!isApproved) {
      throw new Error(`Refusing to run: ${name} is not the approved team-testing database.`);
    }
  }
  // Both variables already point at the validated team-testing branch, so they are left as they are.
}

function checkLocal() {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    throw new Error("Set TEST_DATABASE_URL to localhost:15432/riona_fresh_test before running tests.");
  }
  for (const key of PG_ENVIRONMENT_OVERRIDES) {
    if (process.env[key] !== undefined) {
      throw new Error(`Refusing to run: ${key} is set. Unset it before a local test run, because it could redirect the connection.`);
    }
  }
  const parsed = parseUrl("TEST_DATABASE_URL", testUrl);
  const isApproved =
    parsed.protocol === LOCAL_TARGET.protocol &&
    parsed.hostname === LOCAL_TARGET.hostname &&
    parsed.port === LOCAL_TARGET.port &&
    parsed.pathname === `/${LOCAL_TARGET.database}` &&
    parsed.hash === "" &&
    hasOnlyAllowedParameters(parsed);
  if (!isApproved) {
    throw new Error("Refusing to run: tests must use localhost:15432/riona_fresh_test and no other database.");
  }
  process.env.DATABASE_URL = testUrl;
  process.env.DIRECT_URL = testUrl;
}

const DISPOSABLE_TARGET = { protocol: "postgresql:", hostname: "127.0.0.1", port: "15435", database: "riona_c3_disposable" };

function checkDisposable() {
  if (process.env.TEST_CONFIRM_TRUNCATE !== "disposable-pg18") {
    throw new Error("Refusing to run: disposable-pg18 needs TEST_CONFIRM_TRUNCATE=disposable-pg18, because test data will be deleted.");
  }
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to run: NODE_ENV is production.");
  for (const key of PG_ENVIRONMENT_OVERRIDES) {
    if (process.env[key] !== undefined) {
      throw new Error(`Refusing to run: ${key} is set. Unset it before a disposable run, because it could redirect the connection.`);
    }
  }
  const parsed = parseUrl("TEST_DATABASE_URL", process.env.TEST_DATABASE_URL);
  const exact =
    parsed.protocol === DISPOSABLE_TARGET.protocol &&
    parsed.hostname === DISPOSABLE_TARGET.hostname &&
    parsed.port === DISPOSABLE_TARGET.port &&
    parsed.pathname === `/${DISPOSABLE_TARGET.database}` &&
    parsed.hash === "" &&
    parsed.search === "" &&
    parsed.username !== "" &&
    parsed.password !== "";
  if (!exact) throw new Error("Refusing to run: tests must use 127.0.0.1:15435/riona_c3_disposable and no other database.");
  for (const name of ["DATABASE_URL", "DIRECT_URL"] as const) {
    const value = process.env[name];
    if (value !== undefined && value !== process.env.TEST_DATABASE_URL) {
      throw new Error(`Refusing to run: ${name} is set to a different value. Unset it, so the disposable URL is the only one.`);
    }
  }
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL;
}

const target = process.env.TEST_TARGET;
if (target === "disposable-pg18") {
  checkDisposable();
} else if (target === "team-testing") {
  checkTeamTesting();
} else if (target === undefined || target === "") {
  if (process.env.TEST_CONFIRM_TRUNCATE !== undefined) {
    throw new Error("Refusing to run: TEST_CONFIRM_TRUNCATE is only valid with TEST_TARGET=team-testing.");
  }
  checkLocal();
} else {
  throw new Error("Refusing to run: TEST_TARGET must be unset, team-testing or disposable-pg18.");
}
