import { execSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
import { isApprovedTestUrl } from "../tests/test-target";
import globalSetup from "./global-setup";

/*
 * Vehicle maintenance, admin page, in a browser, against the disposable test database only. Refused unless
 * TEST_DATABASE_URL is an approved test target (tests/test-target.ts). Requires TEST_CONFIRM_TRUNCATE for the disposable run.
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
if (!TEST_URL || !isApprovedTestUrl(new URL(TEST_URL))) {
  throw new Error("Refusing to run: set TEST_DATABASE_URL to an approved test database before running the browser tests.");
}

let vehicleId = "";
let adminToken = "";

test.beforeAll(async () => {
  await globalSetup();
  const [id, token] = execSync("pnpm exec tsx tests/e2e-maintenance-seed.ts", { env: process.env, encoding: "utf8" }).trim().split("\n");
  vehicleId = id;
  adminToken = token;
});

test.afterAll(async () => {
  await globalSetup();
});

const pagePath = () => `/portal/admin/vehicles/${vehicleId}/maintenance`;

async function signInAsAdmin(page: Page) {
  await page.context().addCookies([{ name: "riona_session", value: adminToken, domain: "localhost", path: "/" }]);
}

test("the administrator sees the maintenance overview, lesson availability and the document section", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto(pagePath());
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.getByText("Lesson booking")).toBeVisible();
  await expect(page.getByText("Offered for lessons")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Private documents" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reminders (in-app only)" })).toBeVisible();
});

test("the page fits a phone-width screen without horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInAsAdmin(page);
  await page.goto(pagePath());
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("the server's validation message is shown when a required insurance field is empty", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto(pagePath());
  await page.getByRole("button", { name: "Save insurance" }).click();
  await expect(page.getByText("Enter insurer.")).toBeVisible();
});

test("a visitor without a session cannot open the maintenance page", async ({ page }) => {
  await page.goto(pagePath());
  await expect(page.getByRole("heading", { name: "Overview" })).toHaveCount(0);
});
