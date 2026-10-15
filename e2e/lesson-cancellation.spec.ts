import { execSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
import globalSetup from "./global-setup";

/*
 * Lesson cancellation, end to end, against the disposable test database only. The run is refused unless the URL is
 * exactly localhost:15432/riona_fresh_test. Sessions are created by the seed script, so the browser never signs in
 * through the form (which would use up the sign-in rate limit).
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
if (!TEST_URL) {
  throw new Error("Set TEST_DATABASE_URL to the local riona_fresh_test database before running the browser tests.");
}
const parsedTarget = new URL(TEST_URL);
if (!(parsedTarget.hostname === "localhost" && parsedTarget.port === "15432" && parsedTarget.pathname === "/riona_fresh_test")) {
  throw new Error("Refusing to run: lesson cancellation browser tests must use localhost:15432/riona_fresh_test.");
}

const DB_ENV = { ...process.env, DATABASE_URL: TEST_URL, DIRECT_URL: TEST_URL, TEST_DATABASE_URL: TEST_URL };

type Tokens = { instructor: string; student: string; otherStudent: string };
type LessonState = {
  lesson: { status: string; cancellationReason: string | null; cancelledByUserId: string | null; cancelledAtSet: boolean };
  remainingSessions: number;
  enrollment: { status: string; agreedPrice: string; finalFee: string };
  payments: { id: string; amount: string; status: string; reviewedByUserId: string | null }[];
};

let tokens: Tokens;

function readState(lessonId: string): LessonState {
  const output = execSync(`pnpm exec tsx tests/e2e-cancellation-state.ts ${lessonId}`, { env: DB_ENV, encoding: "utf8" });
  return JSON.parse(output.trim().split("\n").pop() ?? "{}") as LessonState;
}

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  const output = execSync("pnpm exec tsx tests/e2e-cancellation-seed.ts", { env: DB_ENV, encoding: "utf8" });
  tokens = (JSON.parse(output.trim().split("\n").pop() ?? "{}") as { tokens: Tokens }).tokens;
});

test.afterAll(async () => {
  // The other browser specs expect the packages from global setup. Restore them after this file's reset.
  await globalSetup();
});

async function useSession(page: Page, token: string) {
  await page.context().addCookies([{ name: "riona_session", value: token, domain: "localhost", path: "/" }]);
}

test("the instructor's cancel dialog will not accept a blank reason, and the lesson stays scheduled", async ({ page }) => {
  await useSession(page, tokens.instructor);
  await page.goto("/portal/instructor/lessons/CX-SCHED");
  await page.getByRole("button", { name: "Cancel lesson", exact: true }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel lesson", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Enter the reason for cancelling this lesson.");

  expect(readState("CX-SCHED").lesson.status).toBe("SCHEDULED");
});

test("cancelling with a reason keeps the lesson, restores the session, and changes no payment", async ({ page }) => {
  const before = readState("CX-SCHED");
  expect(before.remainingSessions).toBe(2);
  expect(before.payments).toHaveLength(1);

  await useSession(page, tokens.instructor);
  await page.goto("/portal/instructor/lessons/CX-SCHED");
  await page.getByRole("button", { name: "Cancel lesson", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: /Reason for cancelling/ }).fill("  Instructor is unwell  ");
  await dialog.getByRole("button", { name: "Cancel lesson", exact: true }).click();

  await expect(page.getByRole("status").filter({ hasText: "Lesson cancelled. Its record has been kept." })).toBeVisible();

  const after = readState("CX-SCHED");
  expect(after.lesson).toEqual({
    status: "CANCELLED",
    cancellationReason: "Instructor is unwell",
    cancelledByUserId: "INS-1",
    cancelledAtSet: true,
  });
  // Session balance: the cancelled lesson no longer counts, so the session comes back.
  expect(after.remainingSessions).toBe(3);
  // Nothing about payments or the enrollment changed, and no refund or credit appeared.
  expect(after.payments).toEqual(before.payments);
  expect(after.enrollment).toEqual(before.enrollment);
});

test("the student sees the reason, who cancelled it, and the lesson time", async ({ page }) => {
  await useSession(page, tokens.student);
  await page.goto("/portal/student/lessons");

  const instructorCancelled = page.locator("li").filter({ hasText: "09:00–09:30" });
  await expect(instructorCancelled.getByText("Cancelled by your instructor on", { exact: false })).toBeVisible();
  await expect(instructorCancelled.getByText("Reason: Instructor is unwell")).toBeVisible();

  const schoolCancelled = page.locator("li").filter({ hasText: "10:30–11:00" });
  await expect(schoolCancelled.getByText("Cancelled by the school on", { exact: false })).toBeVisible();
  await expect(schoolCancelled.getByText("Reason: Vehicle is being retired")).toBeVisible();
});

test("a cancelled lesson from before reasons were recorded shows that no reason exists", async ({ page }) => {
  await useSession(page, tokens.student);
  await page.goto("/portal/student/lessons");

  const historical = page.locator("li").filter({ hasText: "10:00–10:30" });
  await expect(historical.getByText("No reason was recorded for this cancellation.")).toBeVisible();
  await expect(page.getByText("No reason was recorded for this cancellation.")).toHaveCount(1);
});

test("a student cannot see or cancel another student's lesson", async ({ page }) => {
  await useSession(page, tokens.student);
  await page.goto("/portal/student/lessons");
  await expect(page.getByText("09:00–09:30").first()).toBeVisible();
  await expect(page.getByText("11:00–11:30")).toHaveCount(0);

  // Asking the API directly as the student gets a refusal, and the other student's lesson is unchanged.
  const response = await page.request.post("/api/instructor/lessons/CX-OTHER/cancel", {
    headers: { origin: "http://localhost:3200", "content-type": "application/json" },
    data: { reason: "Not mine to cancel" },
  });
  expect(response.status()).toBe(403);
  expect(readState("CX-OTHER").lesson.status).toBe("SCHEDULED");
});

test("another student's signed-in session cannot reach the first student's lesson page", async ({ page }) => {
  await useSession(page, tokens.otherStudent);
  await page.goto("/portal/student/lessons");
  await expect(page.getByText("11:00–11:30")).toBeVisible();
  await expect(page.getByText("09:00–09:30")).toHaveCount(0);
  await expect(page.getByText("Reason: Instructor is unwell")).toHaveCount(0);
});
