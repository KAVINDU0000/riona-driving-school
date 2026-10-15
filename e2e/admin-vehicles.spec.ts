import { execSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
import globalSetup from "./global-setup";

/*
 * Admin vehicle management, end to end, against the disposable test database only. The run is refused unless the
 * URL is exactly localhost:15432/riona_fresh_test.
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
if (!TEST_URL) {
  throw new Error("Set TEST_DATABASE_URL to the local riona_fresh_test database before running the browser tests.");
}
const parsedTarget = new URL(TEST_URL);
if (!(parsedTarget.hostname === "localhost" && parsedTarget.port === "15432" && parsedTarget.pathname === "/riona_fresh_test")) {
  throw new Error("Refusing to run: vehicle browser tests must use localhost:15432/riona_fresh_test.");
}

const REGISTRATION = "WP TEST-9001";
let adminToken = "";

test.beforeAll(() => {
  execSync("pnpm exec tsx tests/e2e-instructor-seed.ts", {
    env: { ...process.env, DATABASE_URL: TEST_URL, DIRECT_URL: TEST_URL },
    encoding: "utf8",
  });
  const session = execSync("pnpm exec tsx tests/e2e-admin-session.ts", {
    env: { ...process.env, DATABASE_URL: TEST_URL, DIRECT_URL: TEST_URL, TEST_DATABASE_URL: TEST_URL },
    encoding: "utf8",
  });
  adminToken = session.trim().split("\n").pop() ?? "";
});

test.afterAll(async () => {
  await globalSetup();
});

async function signInAsAdmin(page: Page) {
  await page.context().addCookies([{ name: "riona_session", value: adminToken, domain: "localhost", path: "/" }]);
  await page.goto("/portal/admin");
  await expect(page).toHaveURL(/\/portal\/admin$/);
}

test("the admin finds Vehicles in the menu, and adds a vehicle", async ({ page }) => {
  await signInAsAdmin(page);
  await page.getByRole("navigation", { name: "Admin sections" }).getByRole("link", { name: "Vehicles" }).click();
  await expect(page).toHaveURL(/\/portal\/admin\/vehicles$/);

  await page.getByRole("link", { name: "Add vehicle" }).first().click();
  await expect(page).toHaveURL(/\/portal\/admin\/vehicles\/new$/);
  await page.locator("#registrationNumber").fill(REGISTRATION);
  await page.locator("#vehicleType").selectOption("VAN");
  await page.locator("#make").fill("Toyota");
  await page.locator("#model").fill("HiAce");
  await page.locator("#transmissionType").selectOption("MANUAL");
  await page.getByRole("button", { name: "Add vehicle" }).click();

  await expect(page).toHaveURL(/\/portal\/admin\/vehicles\/[^/]+$/);
  await expect(page.getByRole("heading", { name: REGISTRATION }).first()).toBeVisible();
  await expect(page.getByText("Active", { exact: true }).first()).toBeVisible();
});

test("a duplicate registration number is refused with a clear message", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/portal/admin/vehicles/new");
  await page.locator("#registrationNumber").fill(REGISTRATION.toLowerCase());
  await page.getByRole("button", { name: "Add vehicle" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "A vehicle with this registration number already exists." })).toBeVisible();
});

test("the admin edits a vehicle's details, then changes its status when no lessons are scheduled", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/portal/admin/vehicles");
  await page.getByLabel("Search").fill(REGISTRATION);
  await page.getByRole("button", { name: "Apply" }).click();
  await page.getByRole("link", { name: new RegExp(REGISTRATION) }).click();
  await expect(page.getByRole("heading", { name: REGISTRATION }).first()).toBeVisible();

  await page.getByRole("link", { name: "Edit details" }).click();
  await page.locator("#colour").fill("Silver");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Silver", { exact: true })).toBeVisible();

  await page.getByLabel("Change status to").selectOption("MAINTENANCE");
  await page.getByRole("button", { name: "Check scheduled lessons" }).click();
  await expect(page.getByText("No scheduled lessons use this vehicle", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Confirm status change" }).click();
  await expect(page.getByText("Status changed to Under maintenance.")).toBeVisible();
  await expect(page.getByText("Vehicle added", { exact: false })).toBeVisible();
  await expect(page.getByText("Status changed: Active → Under maintenance", { exact: false })).toBeVisible();
});
