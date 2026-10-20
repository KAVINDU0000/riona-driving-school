import { execSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
import { isApprovedTestUrl } from "../tests/test-target";

/*
 * Finding the Maintenance screen from the vehicle list and from the vehicle detail page, in a browser, on the approved test
 * database only. It seeds its own admin, student and vehicle. It does NOT run the packages global setup, because that
 * truncates tables. Run it with PW_SKIP_GLOBAL_SETUP=1 (see playwright.disposable.config.ts).
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
if (!TEST_URL || !isApprovedTestUrl(new URL(TEST_URL))) {
  throw new Error("Refusing to run: set TEST_DATABASE_URL to an approved test database.");
}
if (process.env.PW_SKIP_GLOBAL_SETUP !== "1") {
  throw new Error("Refusing to run: set PW_SKIP_GLOBAL_SETUP=1, so this spec does not truncate shared test tables.");
}

let vehicleId = "";
let adminToken = "";
let studentToken = "";
let registration = "";

test.beforeAll(() => {
  const [id, admin, student, reg] = execSync("pnpm exec tsx tests/e2e-maintenance-seed.ts", { env: process.env, encoding: "utf8" })
    .trim()
    .split("\n");
  vehicleId = id;
  adminToken = admin;
  studentToken = student;
  registration = reg;
});

/** Collects uncaught page errors and server errors (5xx). Only the status and path are recorded: never query strings or documents. */
function watchForFailures(page: Page): string[] {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(`uncaught error: ${error.name}`));
  page.on("response", (response) => {
    if (response.status() >= 500) failures.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });
  return failures;
}

async function signInWith(page: Page, token: string) {
  await page.context().addCookies([{ name: "riona_session", value: token, domain: "localhost", path: "/" }]);
}

test("from the vehicle list, the Maintenance button opens that vehicle's maintenance screen", async ({ page }) => {
  const failures = watchForFailures(page);
  await signInWith(page, adminToken);
  await page.goto("/portal/admin/vehicles");
  await page.getByRole("link", { name: `Maintenance for ${registration}` }).click();
  await expect(page).toHaveURL(new RegExp(`/portal/admin/vehicles/${vehicleId}/maintenance$`));
  await expect(page.getByRole("heading", { name: `Maintenance: ${registration}` })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  expect(failures).toEqual([]);
});

test("from the vehicle detail page, Open maintenance opens the same screen, with its sections visible", async ({ page }) => {
  const failures = watchForFailures(page);
  await signInWith(page, adminToken);
  await page.goto("/portal/admin/vehicles");
  await page.getByRole("link", { name: new RegExp(registration) }).first().click();
  await expect(page).toHaveURL(new RegExp(`/portal/admin/vehicles/${vehicleId}$`));
  await page.getByRole("link", { name: "Open maintenance" }).click();
  await expect(page).toHaveURL(new RegExp(`/portal/admin/vehicles/${vehicleId}/maintenance$`));
  for (const heading of ["Overview", "Insurance periods", "Add or correct records", "Faults and repairs", "Private documents", "Reminders (in-app only)"]) {
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }
  expect(failures).toEqual([]);
});

test("a phone-width screen shows the Maintenance button on the list and the section on the detail page, without horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInWith(page, adminToken);
  await page.goto("/portal/admin/vehicles");
  const listButton = page.getByRole("link", { name: `Maintenance for ${registration}` });
  await expect(listButton).toBeVisible();
  const listOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(listOverflow).toBeLessThanOrEqual(1);

  await page.goto(`/portal/admin/vehicles/${vehicleId}`);
  await expect(page.getByRole("link", { name: "Open maintenance" })).toBeVisible();
  const detailOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(detailOverflow).toBeLessThanOrEqual(1);
});

test("a student signed in does not see the maintenance records", async ({ page }) => {
  await signInWith(page, studentToken);
  await page.goto(`/portal/admin/vehicles/${vehicleId}/maintenance`);
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toHaveCount(0);
  await expect(page.getByText("Insurance periods")).toHaveCount(0);
});

test("a visitor with no session does not see the maintenance records", async ({ page }) => {
  await page.goto(`/portal/admin/vehicles/${vehicleId}/maintenance`);
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toHaveCount(0);
  await expect(page.getByText("Insurance periods")).toHaveCount(0);
});
