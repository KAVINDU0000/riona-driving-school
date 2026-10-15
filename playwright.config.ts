import { defineConfig } from "@playwright/test";

/**
 * Browser tests run the production build against the disposable local test database only.
 * The app's .env.local points at Neon, so the database URLs are passed explicitly to the server
 * this config starts. The run is refused unless the URL is exactly localhost:15432/riona_fresh_test.
 */
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  throw new Error("Set TEST_DATABASE_URL to the local riona_fresh_test database before running the browser tests.");
}
const parsed = new URL(testUrl);
const isGuardedTarget =
  parsed.hostname === "localhost" && parsed.port === "15432" && parsed.pathname === "/riona_fresh_test";
if (!isGuardedTarget) {
  throw new Error("Refusing to run: browser tests must use localhost:15432/riona_fresh_test.");
}

const PORT = 3100;

/**
 * Browser channel. Unset keeps the default, the Microsoft Edge installed on the machine. Set PW_CHANNEL to
 * another channel to use it, or to an empty value (PW_CHANNEL=) to use Playwright's own Chromium instead.
 */
const channel = process.env.PW_CHANNEL ?? "msedge";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    // No browser is downloaded: Edge by default, or the cached Playwright Chromium when PW_CHANNEL is empty.
    ...(channel ? { channel } : {}),
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `node node_modules/next/dist/bin/next start -p ${PORT}`,
    url: `http://localhost:${PORT}/signup`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL: testUrl,
      DIRECT_URL: testUrl,
      TEST_DATABASE_URL: testUrl,
    },
  },
});
