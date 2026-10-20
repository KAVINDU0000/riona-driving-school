import { expect, test, type Page } from "@playwright/test";

type PackageRow = { id: string; name: string; detail: string; price: string };

// Expected values from src/data/packages.ts. Daily prices are per session, not totals.
const DAILY: PackageRow[] = [
  { id: "daily-car", name: "Car Daily Training", detail: "per 30-minute session", price: "LKR 2,000 per session" },
  { id: "daily-van", name: "Van Daily Training", detail: "per 30-minute session", price: "LKR 2,000 per session" },
  { id: "daily-motorcycle", name: "Motorcycle Daily Training", detail: "per 60-minute session", price: "LKR 1,000 per session" },
  { id: "daily-three-wheeler", name: "Three-Wheeler Daily Training", detail: "per 60-minute session", price: "LKR 1,500 per session" },
];

const CAR_VAN: PackageRow = { id: "regular-car-van", name: "Car and Van Training", detail: "15 days", price: "LKR 26,000" };
const CAR_TRIAL: PackageRow = { id: "trial-car", name: "Car Trial Preparation", detail: "", price: "LKR 15,000" };

const PER_SESSION_NOTE = "is charged per session";

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Matches the whole option text, so "Car Daily Training" never matches "Car Regular Training + Motorcycle ...". */
function option(page: Page, row: PackageRow) {
  const parts = [row.name, row.detail, row.price].filter(Boolean).map(escapeRegExp);
  const pattern = new RegExp(`^${parts.join("\\s*")}$`);
  return page.getByRole("listbox", { name: "Training packages" }).getByRole("option", { name: pattern });
}

function picker(page: Page) {
  return page.getByLabel(/Select training package/);
}

function registerButton(page: Page) {
  return page.getByRole("button", { name: "Register", exact: true });
}

/** Any registration POST is blocked and recorded, so a browser test can never reach the server with one. */
async function blockRegistrationSubmissions(page: Page) {
  const attempts: string[] = [];
  await page.route("**/api/registration", async (route) => {
    if (route.request().method() === "POST") {
      attempts.push(route.request().url());
      await route.abort();
      return;
    }
    await route.continue();
  });
  return attempts;
}

/**
 * Collects page and console errors. The account menu asks /api/auth/me on every page, and a signed-out
 * visitor gets an expected 401. That one response is ignored, and nothing else is.
 */
function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const expectedSignedOutCheck = message.location().url.includes("/api/auth/me") && message.text().includes("401");
    if (!expectedSignedOutCheck) errors.push(`console: ${message.text()}`);
  });
  return errors;
}

test.describe("signup page: per-session packages", () => {
  test("loads without a server error or browser error", async ({ page }) => {
    const errors = collectBrowserErrors(page);
    const response = await page.goto("/signup");

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Student Registration" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("lists all four daily packages with their per-session rates and session lengths", async ({ page }) => {
    const errors = collectBrowserErrors(page);
    await page.goto("/signup");
    await picker(page).click();

    for (const row of DAILY) {
      await expect(option(page, row)).toBeVisible();
    }
    expect(errors).toEqual([]);
  });

  test.describe("selecting a daily package", () => {
    for (const row of DAILY) {
      test(`${row.name}: shows the per-session notice and disables Register`, async ({ page }) => {
        const errors = collectBrowserErrors(page);
        const attempts = await blockRegistrationSubmissions(page);
        await page.goto("/signup");

        await picker(page).click();
        await option(page, row).click();

        const note = page.getByRole("note");
        await expect(note).toContainText(PER_SESSION_NOTE);
        await expect(note).toContainText(row.name);
        await expect(registerButton(page)).toBeDisabled();
        expect(attempts).toEqual([]);
        expect(errors).toEqual([]);
      });
    }
  });

  test("fixed-fee packages stay selectable and clear the per-session block", async ({ page }) => {
    const errors = collectBrowserErrors(page);
    const attempts = await blockRegistrationSubmissions(page);
    await page.goto("/signup");

    await picker(page).click();
    await option(page, DAILY[0]).click();
    await expect(registerButton(page)).toBeDisabled();

    await picker(page).click();
    await option(page, CAR_VAN).click();

    await expect(page.getByRole("note")).toHaveCount(0);
    await expect(registerButton(page)).toBeEnabled();
    await expect(picker(page)).toContainText(CAR_VAN.name);
    await expect(picker(page)).toContainText(CAR_VAN.price);

    await picker(page).click();
    await option(page, CAR_TRIAL).click();
    await expect(registerButton(page)).toBeEnabled();
    await expect(picker(page)).toContainText(CAR_TRIAL.name);

    expect(attempts).toEqual([]);
    expect(errors).toEqual([]);
  });
});

test.describe("payment page", () => {
  for (const row of DAILY) {
    test(`${row.name}: explains the per-session rate and offers no payment form`, async ({ page }) => {
      const errors = collectBrowserErrors(page);
      const response = await page.goto(`/payment?package=${row.id}`);

      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { name: "Per-session package" })).toBeVisible();
      await expect(page.getByText(`${row.name} is charged per session`)).toBeVisible();
      await expect(page.getByText(row.price)).toBeVisible();

      // The rate must not be offered as an amount to pay.
      await expect(page.getByRole("button", { name: /submit payment/i })).toHaveCount(0);
      await expect(page.getByText("Upload payment slip")).toHaveCount(0);
      await expect(page.getByText(/amount to pay|total due/i)).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  }

  test("regular package keeps its fixed price and payment form", async ({ page }) => {
    const errors = collectBrowserErrors(page);
    const response = await page.goto(`/payment?package=${CAR_VAN.id}`);

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Payment", exact: true })).toBeVisible();
    await expect(page.getByText(CAR_VAN.price).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /submit payment/i })).toBeVisible();
    await expect(page.getByText("Upload payment slip")).toBeVisible();
    await expect(page.getByText("per session")).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("trial package keeps its fixed price and payment form", async ({ page }) => {
    await page.goto(`/payment?package=${CAR_TRIAL.id}`);

    await expect(page.getByRole("heading", { name: "Payment", exact: true })).toBeVisible();
    await expect(page.getByText(CAR_TRIAL.price).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /submit payment/i })).toBeVisible();
    await expect(page.getByText("per session")).toHaveCount(0);
  });
});

test.describe("registration API refuses daily packages", () => {
  // A complete, otherwise valid application. Only the package differs, so each refusal is due to the package.
  function applicationFor(packageId: string) {
    return {
      fullName: "Browser Test Applicant",
      birthday: "2000-05-10",
      nicNumber: "200012345678",
      phoneNumber: "0771234567",
      email: "browser-test@example.com",
      password: "correct-horse-battery",
      address: "No. 1 Test Road, Colombo",
      packageId,
      additionalNote: "",
    };
  }

  for (const row of DAILY) {
    test(`${row.id} returns 422 with the per-session message`, async ({ request }) => {
      const response = await request.post("/api/registration", { data: applicationFor(row.id) });

      expect(response.status()).toBe(422);
      const body = (await response.json()) as { fields?: Record<string, string> };
      expect(body.fields?.packageId).toBe("This package is charged per session. Contact the school to register for it.");
    });
  }
});
