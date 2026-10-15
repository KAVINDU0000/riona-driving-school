import { execSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
import globalSetup from "./global-setup";

/*
 * Applicant payment-slip submission and admin review, against the disposable test database only. The run is
 * refused unless the URL is exactly localhost:15432/riona_fresh_test.
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
if (!TEST_URL) {
  throw new Error("Set TEST_DATABASE_URL to the local riona_fresh_test database before running the browser tests.");
}
const parsedTarget = new URL(TEST_URL);
if (!(parsedTarget.hostname === "localhost" && parsedTarget.port === "15432" && parsedTarget.pathname === "/riona_fresh_test")) {
  throw new Error("Refusing to run: payment browser tests must use localhost:15432/riona_fresh_test.");
}

const PACKAGE_ID = "regular-car-van";
const PASSWORD = "applicant-pass-123";
// A PNG header plus padding: small, and its bytes are recognised as a PNG by the server.
const SLIP = {
  name: "bank-slip.png",
  mimeType: "image/png",
  buffer: Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(128, 7)]),
};

let suffix = "";
let referenceNumber = "";
let email = "";

test.beforeAll(async ({ request }) => {
  // Reset the test world, then restore the packages the applicant can choose.
  execSync("pnpm exec tsx tests/e2e-instructor-seed.ts", {
    env: { ...process.env, DATABASE_URL: TEST_URL, DIRECT_URL: TEST_URL },
    encoding: "utf8",
  });
  await globalSetup();

  // A new applicant, created through the public registration API, so the browser test starts from a real application.
  suffix = Date.now().toString().slice(-8);
  email = `payer-${suffix}@example.com`;
  const response = await request.post("/api/registration", {
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
  expect(response.status()).toBe(201);
  referenceNumber = ((await response.json()) as { referenceNumber: string }).referenceNumber;
});

test.afterAll(async () => {
  await globalSetup();
});

/** The signup step keeps the reference in the tab's session. The payment page reads it without showing it. */
async function openPaymentWithSignupSession(page: Page) {
  await page.addInitScript((reference) => window.sessionStorage.setItem("riona.applicationReference", reference), referenceNumber);
  await page.goto(`/payment?package=${PACKAGE_ID}`);
  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator("#referenceNumber")).toHaveCount(0);
}

async function fillPaymentForm(page: Page, password: string) {
  await openPaymentWithSignupSession(page);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("#bankName").fill("Bank of Ceylon");
  await page.locator("#accountName").fill("Nimal Perera");
  await page.locator("#accountNumber").fill("1234567890123456");
  await page.locator("#branch").fill("Colombo Fort");
  await page.locator("#paymentDate").fill("2026-10-10");
  await page.locator("#slip").setInputFiles({ name: SLIP.name, mimeType: SLIP.mimeType, buffer: SLIP.buffer });
}

test("without the signup session, the payment page says so and does not ask for a reference", async ({ page }) => {
  await page.goto(`/payment?package=${PACKAGE_ID}`);
  await expect(page.getByText("We could not find your application in this browser.")).toBeVisible();
  await expect(page.locator("#referenceNumber")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Submit payment" })).toBeDisabled();
});

test("a wrong password on the payment step is refused with a clear message", async ({ page }) => {
  await fillPaymentForm(page, "not-the-password");
  await page.getByRole("button", { name: "Submit payment" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "The reference number, email or password is not correct." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Payment slip received" })).toHaveCount(0);
});

test("the applicant submits a slip, and the page says it is waiting for review, not approved", async ({ page }) => {
  await fillPaymentForm(page, PASSWORD);
  await page.getByRole("button", { name: "Submit payment" }).click();
  await expect(page.getByRole("heading", { name: "Payment slip received" })).toBeVisible();
  await expect(page.getByText(referenceNumber, { exact: true })).toBeVisible();
  await expect(page.getByText("It is not approved yet.", { exact: false })).toBeVisible();
});

test("the admin opens the submitted slip from the registration detail, and an applicant cannot", async ({ page, request }) => {
  await page.goto("/login?role=admin");
  await page.getByPlaceholder("Enter admin ID").fill("ADMIN-1");
  await page.getByPlaceholder("Enter your password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/portal\/admin$/);

  await page.goto("/portal/admin/registrations");
  await page.getByLabel("Search applications").fill(referenceNumber);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  // Each queue row is one button: the applicant's name, then a line that includes the reference number.
  await page.getByRole("button", { name: new RegExp(referenceNumber) }).click();

  await expect(page.getByRole("heading", { name: "Payments recorded" })).toBeVisible();
  await expect(page.getByText("Awaiting review", { exact: false }).first()).toBeVisible();
  const slipLink = page.getByRole("link", { name: `Open slip: ${SLIP.name}` });
  await expect(slipLink).toBeVisible();

  // The admin's session can read the file. The file is an attachment, served without caching.
  const href = await slipLink.getAttribute("href");
  expect(href).toMatch(/^\/api\/admin\/payment-slips\/[^/]+$/);
  const file = await page.request.get(href as string);
  expect(file.status()).toBe(200);
  expect(file.headers()["content-disposition"]).toContain("attachment");

  // Without a session the same file is refused.
  const anonymous = await request.get(href as string);
  expect(anonymous.status()).toBe(401);
});
