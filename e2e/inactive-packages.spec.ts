import { isApprovedTestUrl } from "../tests/test-target";
import { expect, test } from "@playwright/test";

// The project has no type declarations for pg, so the small part used here is typed locally.
type PgClient = {
  connect(): Promise<void>;
  query(sql: string, params?: unknown[]): Promise<unknown>;
  end(): Promise<void>;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports -- pg has no types here, and an import would fail type checking.
const { Client } = require("pg") as { Client: new (config: { connectionString: string }) => PgClient };

const INACTIVE_ID = "trial-van";

/** Toggles one package in the disposable test database. Refuses any other target. */
async function setPackageActive(active: boolean) {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set.");
  const parsed = new URL(url);
  if (!(isApprovedTestUrl(parsed))) {
    throw new Error("Refusing to change packages: target is not localhost:15432/riona_fresh_test.");
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('UPDATE "TrainingPackage" SET "isActive" = $1, "updatedAt" = now() WHERE id = $2', [active, INACTIVE_ID]);
  } finally {
    await client.end();
  }
}

test.describe("inactive packages", () => {
  test.beforeAll(async () => {
    await setPackageActive(false);
  });

  test.afterAll(async () => {
    await setPackageActive(true);
  });

  test("are not offered on the signup page, while active and daily packages still are", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel(/Select training package/).click();
    const list = page.getByRole("listbox", { name: "Training packages" });

    await expect(list.getByRole("option", { name: /^Car Trial Preparation\s*LKR 15,000$/ })).toBeVisible();
    await expect(list.getByRole("option", { name: /^Car Daily Training\s*per 30-minute session\s*LKR 2,000 per session$/ })).toBeVisible();
    await expect(list.getByRole("option", { name: /^Van Trial Preparation\s*LKR 15,000$/ })).toHaveCount(0);
  });

  test("are refused by the registration API when submitted directly", async ({ request }) => {
    const response = await request.post("/api/registration", {
      data: {
        fullName: "Inactive Package Check",
        birthday: "2000-01-01",
        nicNumber: "200011112222",
        phoneNumber: "0771234567",
        email: "inactive.package@example.com",
        password: "correct-horse-battery",
        address: "No. 1, Station Road, Colombo",
        packageId: INACTIVE_ID,
        sessionSelections: [{ vehicleType: "VAN", requiredSessions: 2 }],
      },
    });
    expect(response.status()).toBe(422);
    const body = (await response.json()) as { fields: Record<string, string> };
    expect(body.fields.packageId).toBe("Select an available training package.");
  });
});
