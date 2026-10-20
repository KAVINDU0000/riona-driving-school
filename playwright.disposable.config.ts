import { defineConfig } from "@playwright/test";
import { approvedTestTargetName } from "./tests/test-target";

/**
 * Browser tests against the dedicated disposable PostgreSQL 18 container (127.0.0.1:15435/riona_c3_disposable) only.
 * Same specs and global setup as playwright.config.ts. This file exists so that the local PostgreSQL 17 target keeps its
 * own config, and so that the disposable run cannot pick up the local URL by accident. The run is refused unless the URL is
 * exactly the disposable target. Set TEST_DATABASE_URL in the shell and TEST_CONFIRM_TRUNCATE=disposable-pg18.
 */
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  throw new Error("Set TEST_DATABASE_URL to the disposable PostgreSQL 18 database before running the disposable browser tests.");
}
if (approvedTestTargetName(new URL(testUrl)) !== "disposable") {
  throw new Error("Refusing to run: the disposable browser config must use 127.0.0.1:15435/riona_c3_disposable.");
}
if (process.env.TEST_CONFIRM_TRUNCATE !== "disposable-pg18") {
  throw new Error("Refusing to run: set TEST_CONFIRM_TRUNCATE=disposable-pg18, because the browser suites delete test data.");
}

const PORT = Number(process.env.PW_PORT ?? 3101);
const channel = process.env.PW_CHANNEL ?? "";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  // PW_SKIP_GLOBAL_SETUP=1 runs only specs that seed their own data. Without it, the packages are reseeded, which truncates tables.
  ...(process.env.PW_SKIP_GLOBAL_SETUP === "1" ? {} : { globalSetup: "./e2e/global-setup.ts" }),
  use: {
    baseURL: `http://localhost:${PORT}`,
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
