import { isApprovedTestUrl } from "../tests/test-target";
import { execSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
import globalSetup from "./global-setup";

/*
 * Instructor portal, end to end, against the disposable test database only. The run is refused unless the URL is
 * exactly localhost:15432/riona_fresh_test. The app's Prisma client is pointed at that same database before any app
 * module loads, so the seeded accounts and lessons are the ones the browser signs in with.
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
if (!TEST_URL) {
  throw new Error("Set TEST_DATABASE_URL to the local riona_fresh_test database before running the browser tests.");
}
const parsedTarget = new URL(TEST_URL);
if (!(isApprovedTestUrl(parsedTarget))) {
  throw new Error("Refusing to run: instructor browser tests must use localhost:15432/riona_fresh_test.");
}
// Seeding runs in a child process through tsx, which resolves the app's @/ import aliases.
const PASSWORD = "correct-horse-battery";

type Seeded = { todayLessonId: string; otherLessonId: string };
let seeded: Seeded;

test.beforeAll(() => {
  const output = execSync("pnpm exec tsx tests/e2e-instructor-seed.ts", {
    env: { ...process.env, DATABASE_URL: TEST_URL, DIRECT_URL: TEST_URL },
    encoding: "utf8",
  });
  seeded = JSON.parse(output.trim().split(String.fromCharCode(10)).pop() ?? "{}") as Seeded;
});

test.afterAll(async () => {
  // The other browser specs expect the packages from global setup. Restore them after this file's reset.
  await globalSetup();
});

async function signIn(page: Page, role: "instructor" | "student", identifier: string) {
  await page.goto(`/login?role=${role}`);
  await page.getByPlaceholder(role === "instructor" ? "Enter instructor ID" : "Enter student ID").fill(identifier);
  await page.getByPlaceholder("Enter your password").fill(PASSWORD);
  await page.getByRole("button", { name: "Login" }).click();
}

test("an instructor signs in and sees only their own dashboard", async ({ page }) => {
  await signIn(page, "instructor", "INS-1");
  await expect(page).toHaveURL(/\/portal\/instructor$/);
  await expect(page.getByRole("heading", { name: "Today's schedule" })).toBeVisible();
  await expect(page.getByText("Student STU-A").first()).toBeVisible();
  await expect(page.getByText("Student STU-B")).toHaveCount(0);
});

test("an instructor cannot open another instructor's lesson", async ({ page }) => {
  await signIn(page, "instructor", "INS-1");
  await expect(page).toHaveURL(/\/portal\/instructor$/);
  const response = await page.goto(`/portal/instructor/lessons/${seeded.otherLessonId}`);
  expect(response?.status()).toBe(404);
});

test("the schedule shows the week grid and filters by status", async ({ page }) => {
  await signIn(page, "instructor", "INS-1");
  await expect(page).toHaveURL(/\/portal\/instructor$/);

  await page.goto("/portal/instructor/lessons?view=week");
  const grid = page.getByRole("region", { name: "Weekly schedule" });
  await expect(grid).toBeVisible();
  await expect(grid.getByText("Student STU-A").first()).toBeVisible();
  await expect(grid.getByText("Student STU-B")).toHaveCount(0);

  await page.getByRole("navigation", { name: "Filter by status" }).getByRole("link", { name: "Cancelled" }).click();
  await expect(page.getByText("No lessons in this period")).toBeVisible();
});

test("the list view shows upcoming lessons", async ({ page }) => {
  await signIn(page, "instructor", "INS-1");
  await expect(page).toHaveURL(/\/portal\/instructor$/);
  await page.goto("/portal/instructor/lessons?view=list");
  await expect(page.getByText(/^Next 30 days/)).toBeVisible();
});

test("an instructor records attendance, completes the lesson, and writes feedback", async ({ page }) => {
  await signIn(page, "instructor", "INS-1");
  await expect(page).toHaveURL(/\/portal\/instructor$/);
  await page.goto(`/portal/instructor/lessons/${seeded.todayLessonId}`);

  await page.getByRole("button", { name: "Present", exact: true }).click();
  await expect(page.getByText("Attendance set to Present.")).toBeVisible();

  await page.getByRole("button", { name: "Mark completed" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Mark completed" }).click();
  await expect(page.getByText("Lesson marked completed.")).toBeVisible();

  await page.getByLabel("Feedback for the student").fill("Good mirror checks and smooth clutch control.");
  await page.getByLabel("Rating (optional)").selectOption("4");
  await page.getByRole("button", { name: "Save feedback" }).click();
  await expect(page.getByText("Feedback saved.")).toBeVisible();
});

test("student progress is shown for a student the instructor teaches, and hidden for one they do not", async ({ page }) => {
  await signIn(page, "instructor", "INS-1");
  await expect(page).toHaveURL(/\/portal\/instructor$/);

  await page.goto("/portal/instructor/students/STU-A");
  await expect(page.getByRole("heading", { name: "Student progress" })).toBeVisible();
  await expect(page.getByText("sessions completed").first()).toBeVisible();

  const response = await page.goto("/portal/instructor/students/STU-B");
  expect(response?.status()).toBe(404);
});

test("the instructor profile accepts a valid mobile number and rejects an invalid one", async ({ page }) => {
  await signIn(page, "instructor", "INS-1");
  await expect(page).toHaveURL(/\/portal\/instructor$/);
  await page.goto("/portal/instructor/profile");

  const mobile = page.getByRole("textbox", { name: "Mobile number" });
  await mobile.fill("1234");
  await page.getByRole("button", { name: "Save mobile number" }).click();
  await expect(page.getByRole("region", { name: "Mobile number" }).getByRole("alert")).toContainText("10-digit mobile number");

  await mobile.fill("0799999999");
  await page.getByRole("button", { name: "Save mobile number" }).click();
  await expect(page.getByText("Mobile number saved.")).toBeVisible();
});

test("a signed-out visitor is sent to the instructor login", async ({ page }) => {
  await page.goto("/portal/instructor");
  await expect(page).toHaveURL(/\/login\?role=instructor/);
});

test("a student is sent to their own portal instead of the instructor portal", async ({ page }) => {
  await signIn(page, "student", "STU-A");
  await expect(page).toHaveURL(/\/portal\/student/);
  await page.goto("/portal/instructor");
  await expect(page).toHaveURL(/\/portal\/student/);
});

// The project has no type declarations for pg, so the small part used here is typed locally, as in the other browser specs.
type PgClient = {
  connect(): Promise<void>;
  query(sql: string, params?: unknown[]): Promise<unknown>;
  end(): Promise<void>;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports -- pg has no types here, and an import would fail type checking.
const { Client } = require("pg") as { Client: new (config: { connectionString: string }) => PgClient };

/** Sets one vehicle's status in the disposable test database. Refuses any other target. */
async function setVehicleStatus(vehicleId: string, status: "ACTIVE" | "MAINTENANCE" | "INACTIVE") {
  const client = new Client({ connectionString: TEST_URL! });
  await client.connect();
  try {
    await client.query('UPDATE "Vehicle" SET status = $1::"VehicleStatus", "updatedAt" = now() WHERE id = $2', [status, vehicleId]);
  } finally {
    await client.end();
  }
}

test("a lesson whose vehicle is under maintenance is flagged on the lesson page", async ({ page }) => {
  await setVehicleStatus("V1", "MAINTENANCE");
  try {
    await signIn(page, "instructor", "INS-1");
    await expect(page).toHaveURL(/\/portal\/instructor$/);
    await page.goto(`/portal/instructor/lessons/${seeded.todayLessonId}`);
    await expect(page.getByRole("status").filter({ hasText: "under maintenance" })).toBeVisible();
  } finally {
    await setVehicleStatus("V1", "ACTIVE");
  }
});
