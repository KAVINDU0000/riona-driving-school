/**
 * Points the app's Prisma client at the disposable test database. The guard accepts exactly one target,
 * localhost:15432/riona_fresh_test over PostgreSQL, so these tests cannot modify Neon or the development database.
 * Both connection variables are set so no code path can reach another database.
 */
const APPROVED_TEST_TARGET = { protocol: "postgresql:", hostname: "localhost", port: "15432", database: "riona_fresh_test" };

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  throw new Error("Set TEST_DATABASE_URL to localhost:15432/riona_fresh_test before running tests.");
}

let parsed: URL;
try {
  parsed = new URL(testUrl);
} catch {
  throw new Error("Refusing to run: TEST_DATABASE_URL is not a valid URL.");
}
const isApprovedTarget =
  parsed.protocol === APPROVED_TEST_TARGET.protocol &&
  parsed.hostname === APPROVED_TEST_TARGET.hostname &&
  parsed.port === APPROVED_TEST_TARGET.port &&
  parsed.pathname === `/${APPROVED_TEST_TARGET.database}`;
if (!isApprovedTarget) {
  throw new Error("Refusing to run: tests must use localhost:15432/riona_fresh_test and no other database.");
}

process.env.DATABASE_URL = testUrl;
process.env.DIRECT_URL = testUrl;
