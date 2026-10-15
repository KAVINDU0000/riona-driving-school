import { execSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
import globalSetup from "./global-setup";

/*
 * Rejected slip, resubmission and approval, end to end, against the disposable test database only. The run is
 * refused unless the URL is exactly localhost:15432/riona_fresh_test.
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
if (!TEST_URL) {
  throw new Error("Set TEST_DATABASE_URL to the local riona_fresh_test database before running the browser tests.");
}
const parsedTarget = new URL(TEST_URL);
if (!(parsedTarget.hostname === "localhost" && parsedTarget.port === "15432" && parsedTarget.pathname === "/riona_fresh_test")) {
  throw new Error("Refusing to run: status browser tests must use localhost:15432/riona_fresh_test.");
}

const PACKAGE_ID = "regular-car-van";
const PASSWORD = "applicant-pass-123";
const REJECTION_NOTE = "The slip is blurred, and the amount cannot be read.";
const SLIP = {
  name: "bank-slip.png",
  mimeType: "image/png",
  buffer: Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(128, 5)]),
};

let referenceNumber = "";
let email = "";
let adminToken = "";

const slipFields = {
  paymentMethod: "BANK_TRANSFER",
  paymentDate: "2026-10-10",
  reference: "",
  bankName: "Bank of Ceylon",
  accountName: "Nimal Perera",
  accountNumber: "1234567890123456",
  branch: "Colombo Fort",
};

test.beforeAll(async ({ request }) => {
  execSync("pnpm exec tsx tests/e2e-instructor-seed.ts", {
    env: { ...process.env, DATABASE_URL: TEST_URL, DIRECT_URL: TEST_URL },
    encoding: "utf8",
  });
  await globalSetup();

  // A test admin session, created directly, so these tests do not use up the sign-in rate limit.
  const session = execSync("pnpm exec tsx tests/e2e-admin-session.ts", {
    env: { ...process.env, DATABASE_URL: TEST_URL, DIRECT_URL: TEST_URL, TEST_DATABASE_URL: TEST_URL },
    encoding: "utf8",
  });
  adminToken = session.trim().split("\n").pop() ?? "";

  const suffix = Date.now().toString().slice(-8);
  email = `status-${suffix}@example.com`;
  const created = await request.post("/api/registration", {
    data: {
      fullName: "Nimal Perera",
      birthday: "2000-05-10",
      nicNumber: `2000${suffix}`,
      phoneNumber: "0771234567",
      email,
      password: PASSWORD,
      address: "No. 12, Main Street, Colombo 03",
      packageId: PACKAGE_ID,
      additionalNote: "",
    },
  });
  expect(created.status()).toBe(201);
  referenceNumber = ((await created.json()) as { referenceNumber: string }).referenceNumber;

  // The first slip is sent through the public endpoint, as the applicant's payment step would send it.
  const first = await request.post("/api/registration/payment", {
    multipart: {
      referenceNumber,
      email,
      password: PASSWORD,
      ...slipFields,
      slip: { name: SLIP.name, mimeType: SLIP.mimeType, buffer: SLIP.buffer },
    },
  });
  expect(first.status()).toBe(201);
});

test.afterAll(async () => {
  await globalSetup();
});

async function signInAsAdmin(page: Page) {
  await page.context().addCookies([{ name: "riona_session", value: adminToken, domain: "localhost", path: "/" }]);
  await page.goto("/portal/admin");
  await expect(page).toHaveURL(/\/portal\/admin$/);
}

async function openApplicationAsAdmin(page: Page) {
  await page.goto("/portal/admin/registrations");
  await page.getByLabel("Search applications").fill(referenceNumber);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("button", { name: new RegExp(referenceNumber) }).click();
  await expect(page.getByRole("heading", { name: "Payments recorded" })).toBeVisible();
}

async function checkStatus(page: Page, password = PASSWORD) {
  await page.goto("/application-status");
  await page.locator("#statusReference").fill(referenceNumber);
  await page.locator("#statusPassword").fill(password);
  await page.getByRole("button", { name: "Check status" }).click();
}

test("the admin rejects a slip with a reason, and the applicant sees it on the status page", async ({ page }) => {
  await signInAsAdmin(page);
  await openApplicationAsAdmin(page);
  await page.getByLabel("Rejection reason (the applicant sees this if you reject)").fill(REJECTION_NOTE);
  await page.getByRole("button", { name: "Reject payment" }).click();
  await expect(page.getByText("Payment rejected. The applicant will see the reason", { exact: false })).toBeVisible();

  // A wrong password does not show the status.
  await checkStatus(page, "not-the-password");
  await expect(page.getByRole("alert").filter({ hasText: "The reference number, email or password is not correct." })).toBeVisible();

  await checkStatus(page);
  await expect(page.getByRole("heading", { name: "Payment rejected" })).toBeVisible();
  await expect(page.getByText(`Reason: ${REJECTION_NOTE}`)).toBeVisible();
  await expect(page.getByRole("button", { name: "Resubmit payment" })).toBeVisible();
});

test("the applicant resubmits with the earlier bank details, and the admin approves it", async ({ page }) => {
  await checkStatus(page);
  await expect(page.getByRole("button", { name: "Resubmit payment" })).toBeVisible();
  await page.getByRole("button", { name: "Resubmit payment" }).click();

  // The bank details from the rejected slip are filled in again. The account number is typed again.
  await expect(page.locator("#bankName")).toHaveValue("Bank of Ceylon");
  await expect(page.locator("#branch")).toHaveValue("Colombo Fort");
  await expect(page.locator("#accountNumber")).toHaveValue("");
  await page.locator("#accountNumber").fill("1234567890123456");
  await page.locator("#paymentDate").fill("2026-10-11");
  await page.locator("#slip").setInputFiles({ name: "second-slip.png", mimeType: SLIP.mimeType, buffer: SLIP.buffer });
  await page.getByRole("button", { name: "Submit payment" }).click();
  await expect(page.getByRole("heading", { name: "Payment slip received" })).toBeVisible();

  await signInAsAdmin(page);
  await openApplicationAsAdmin(page);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Approve payment" }).click();
  await expect(page.getByText("Payment approved. The applicant will see it", { exact: false })).toBeVisible();

  await checkStatus(page);
  await expect(page.getByRole("heading", { name: "Payment approved" })).toBeVisible();
  await expect(page.getByText("WhatsApp you your user ID", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Resubmit payment" })).toHaveCount(0);
});
