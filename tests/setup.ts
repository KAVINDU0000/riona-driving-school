/**
 * Points the app's Prisma client at the disposable test database. The guard refuses anything that
 * is not a local database named *_test, so these tests cannot modify Neon or the development database.
 */
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  throw new Error("Set TEST_DATABASE_URL to the disposable local test database (for example, the riona-pg17-test container).");
}

const parsed = new URL(testUrl);
const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
if (!isLocal || !parsed.pathname.endsWith("_test")) {
  throw new Error("Refusing to run: TEST_DATABASE_URL must point at a local database whose name ends with _test.");
}

process.env.DATABASE_URL = testUrl;
