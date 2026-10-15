import { execSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
import globalSetup from "./global-setup";

/*
 * Admin portal, end to end, against the disposable test database only. The run is refused unless the URL is exactly
 * localhost:15432/riona_fresh_test. Seeding runs through the same tsx script the instructor tests use.
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
if (!TEST_URL) {
  throw new Error("Set TEST_DATABASE_URL to the local riona_fresh_test database before running the browser tests.");
}
const parsedTarget = new URL(TEST_URL);
if (!(parsedTarget.hostname === "localhost" && parsedTarget.port === "15432" && parsedTarget.pathname === "/riona_fresh_test")) {
  throw new Error("Refusing to run: admin browser tests must use localhost:15432/riona_fresh_test.");
}

const PASSWORD = "correct-horse-battery";

test.beforeAll(() => {
  execSync("pnpm exec tsx tests/e2e-instructor-seed.ts", {
    env: { ...process.env, DATABASE_URL: TEST_URL, DIRECT_URL: TEST_URL },
    encoding: "utf8",
  });
});

test.afterAll(async () => {
  // The other browser specs expect the packages from global setup. Restore them after this file's reset.
  await globalSetup();
});

async function signIn(page: Page, role: "admin" | "student" | "instructor", identifier: string) {
  await page.goto(`/login?role=${role}`);
  const placeholder = role === "admin" ? "Enter admin ID" : role === "student" ? "Enter student ID" : "Enter instructor ID";
  await page.getByPlaceholder(placeholder).fill(identifier);
  await page.getByPlaceholder("Enter your password").fill(PASSWORD);
  await page.getByRole("button", { name: "Login" }).click();
}

test("an admin signs in to the dashboard and sees the school's figures", async ({ page }) => {
  await signIn(page, "admin", "ADMIN-1");
  await expect(page).toHaveURL(/\/portal\/admin$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Pending applications").first()).toBeVisible();
  await expect(page.getByText("Active students").first()).toBeVisible();
  await expect(page.getByText("Vehicles needing attention").first()).toBeVisible();
  // The seeded school has one vehicle in maintenance.
  await expect(page.getByText("In maintenance or inactive")).toBeVisible();
});

test("a dashboard card with a page links to it, and the others say the page is not available yet", async ({ page }) => {
  await signIn(page, "admin", "ADMIN-1");
  await expect(page).toHaveURL(/\/portal\/admin$/);
  await page.getByRole("link", { name: /Active instructors/ }).click();
  await expect(page).toHaveURL(/\/portal\/admin\/instructors$/);
  await expect(page.getByRole("heading", { name: "Instructors" })).toBeVisible();

  await page.goto("/portal/admin");
  await expect(page.getByText("Management page not yet available").first()).toBeVisible();
});

test("the admin section switcher marks the current page and reaches the registration queue", async ({ page }) => {
  await signIn(page, "admin", "ADMIN-1");
  await expect(page).toHaveURL(/\/portal\/admin$/);
  const sections = page.getByRole("navigation", { name: "Admin sections" });
  await expect(sections.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");

  await sections.getByRole("link", { name: "Registrations" }).click();
  await expect(page).toHaveURL(/\/portal\/admin\/registrations$/);
  await expect(sections.getByRole("link", { name: "Registrations" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Registration queue" })).toBeVisible();
});

test("the Add Instructor form is still on its page", async ({ page }) => {
  await signIn(page, "admin", "ADMIN-1");
  await expect(page).toHaveURL(/\/portal\/admin$/);
  await page.goto("/portal/admin/instructors");
  await expect(page.getByLabel("Instructor ID")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create instructor and send invitation" })).toBeVisible();
});

test("a student and an instructor cannot open the admin pages", async ({ page }) => {
  await signIn(page, "student", "STU-A");
  await expect(page).toHaveURL(/\/portal\/student/);
  await page.goto("/portal/admin/registrations");
  await expect(page).toHaveURL(/\/portal\/student/);
  await page.goto("/portal/admin");
  await expect(page).toHaveURL(/\/portal\/student/);
});

test("an instructor is sent to the instructor portal from the admin pages", async ({ page }) => {
  await signIn(page, "instructor", "INS-1");
  await expect(page).toHaveURL(/\/portal\/instructor$/);
  await page.goto("/portal/admin/instructors");
  await expect(page).toHaveURL(/\/portal\/instructor$/);
});

test("the registration queue has search and filters, and says when nothing matches", async ({ page }) => {
  await signIn(page, "admin", "ADMIN-1");
  await expect(page).toHaveURL(/\/portal\/admin$/);
  await page.goto("/portal/admin/registrations");
  await expect(page.getByRole("heading", { name: "Registration queue" })).toBeVisible();
  await expect(page.getByLabel("Search applications")).toBeVisible();
  await expect(page.getByLabel("Package")).toBeVisible();
  await expect(page.getByLabel("Sort by submission")).toBeVisible();

  await page.getByLabel("Search applications").fill("no-such-applicant-zz");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText("No applications match these filters.")).toBeVisible();
  await expect(page).toHaveURL(/\/portal\/admin\/registrations$/);

  await page.getByRole("button", { name: "Clear search and filters" }).click();
  await expect(page.getByLabel("Search applications")).toHaveValue("");
});

test("the student directory finds a student and opens a read-only profile", async ({ page }) => {
  await signIn(page, "admin", "ADMIN-1");
  await expect(page).toHaveURL(/\/portal\/admin$/);
  await page.getByRole("link", { name: /Active students/ }).click();
  await expect(page).toHaveURL(/\/portal\/admin\/students$/);
  await expect(page.getByRole("heading", { name: "Student directory" })).toBeVisible();

  await page.getByLabel("Search students").fill("STU-A");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/q=STU-A/);
  await page.getByRole("link", { name: /STU-A/ }).click();
  await expect(page).toHaveURL(/\/portal\/admin\/students\/STU-A$/);
  await expect(page.getByRole("heading", { name: "Enrollments" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lessons", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Students" })).toBeVisible();
});

test("an instructor profile shows the workload and the directory search keeps the Add form", async ({ page }) => {
  await signIn(page, "admin", "ADMIN-1");
  await expect(page).toHaveURL(/\/portal\/admin$/);
  await page.goto("/portal/admin/instructors");
  await expect(page.getByRole("heading", { name: "Instructor directory" })).toBeVisible();
  await expect(page.getByLabel("Instructor ID")).toBeVisible();

  await page.getByRole("link", { name: /INS-1/ }).click();
  await expect(page).toHaveURL(/\/portal\/admin\/instructors\/INS-1$/);
  await expect(page.getByRole("heading", { name: "Workload" })).toBeVisible();
});

test("the packages page warns about missing session counts, and asks before a price change", async ({ page }) => {
  await signIn(page, "admin", "ADMIN-1");
  await expect(page).toHaveURL(/\/portal\/admin$/);
  await page.getByRole("navigation", { name: "Admin sections" }).getByRole("link", { name: "Packages" }).click();
  await expect(page).toHaveURL(/\/portal\/admin\/packages$/);
  await expect(page.getByRole("heading", { name: "Packages", exact: true })).toBeVisible();

  // The seeded packages have no session counts, so approval is blocked and the page says so.
  await expect(page.getByText("Requirements incomplete", { exact: true }).first()).toBeVisible();

  const form = page.getByRole("form", { name: "Edit Car Training" });
  await form.getByLabel("Price (LKR)").fill("16000");
  await form.getByRole("button", { name: "Save price and availability" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByText("New applications use the new price.")).toBeVisible();
  await page.getByRole("button", { name: "Change price" }).click();
  await expect(page.getByText("Car Training saved.")).toBeVisible();
  await expect(page.getByRole("form", { name: "Edit Car Training" }).getByLabel("Price (LKR)")).toHaveValue("16000");
});

test("session requirements: add a row, save, then confirm, and the status follows each step", async ({ page }) => {
  await signIn(page, "admin", "ADMIN-1");
  await expect(page).toHaveURL(/\/portal\/admin$/);
  await page.goto("/portal/admin/packages");

  const row = page.locator("li").filter({ hasText: "Car Training" }).first();
  await row.getByText("Session requirements", { exact: true }).click();
  await row.getByLabel("Total sessions").fill("15");
  await row.getByRole("button", { name: "Add row" }).click();
  await row.getByRole("button", { name: "Save requirements" }).click();
  await expect(page.getByText("Car Training: requirements saved.")).toBeVisible();
  await expect(row.getByText("Awaiting confirmation", { exact: true })).toBeVisible();

  await row.getByRole("button", { name: "Confirm requirements" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirm requirements" }).click();
  await expect(page.getByText("Car Training: requirements confirmed.")).toBeVisible();
  await expect(row.getByText("Requirements confirmed", { exact: true })).toBeVisible();
});
