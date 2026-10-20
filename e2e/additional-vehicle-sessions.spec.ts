import { expect, test, type Page } from "@playwright/test";
import { packageGroups } from "../src/data/packages";
import { SESSION_VEHICLE_LABELS, regularVehiclesOf, sessionRuleFor, trialVehiclesOf, type SessionVehicle } from "../src/lib/registration/session-rules";

// Runs only with playwright.team-testing.config.ts. UI-only: it never creates a user account or a registration. Browser
// submissions are intercepted before they leave the page, so the server receives no request from this spec.

// The six corrected names, written out here so the check does not depend on the source file alone.
const EXPECTED_NAMES: Record<string, string> = {
  "extra-car-motorcycle": "Car Regular Training + Motorcycle Trial Preparation",
  "extra-car-three-wheeler": "Car Regular Training + Three-Wheeler Trial Preparation",
  "extra-car-three-wheeler-motorcycle": "Car Regular Training + Three-Wheeler and Motorcycle Trial Preparation",
  "extra-van-motorcycle": "Van Regular Training + Motorcycle Trial Preparation",
  "extra-van-three-wheeler": "Van Regular Training + Three-Wheeler Trial Preparation",
  "extra-van-three-wheeler-motorcycle": "Van Regular Training + Three-Wheeler and Motorcycle Trial Preparation",
};
const PACKAGE_IDS = Object.keys(EXPECTED_NAMES);

// Every Additional Vehicle package in the source must be one of the six checked here.
const sourceAdditional = packageGroups.find((g) => g.label === "Additional vehicle training")!.options.map((o) => o.id);

const APPLICANT = {
  fullName: "Fixture Applicant",
  dateOfBirth: "2001-03-04",
  nic: "200112345678",
  mobile: "0771234567",
  password: "correct-horse-battery",
  address: "No. 8, Temple Road, Galle",
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The vehicles the rule gives this package. Taken from the rule module, so the page is checked against it. */
function rulesFor(packageId: string) {
  const rule = sessionRuleFor(packageId);
  if (!rule || rule.kind !== "MIXED") throw new Error(`${packageId} is not an Additional vehicle package with a mixed rule`);
  return { regular: [...regularVehiclesOf(rule)] as SessionVehicle[], trial: [...trialVehiclesOf(rule)] as SessionVehicle[] };
}

/** Opens the signup page and chooses the package from the Training packages listbox, as a student would. */
async function choosePackage(page: Page, packageId: string) {
  await page.goto("/signup");
  await page.getByLabel(/Select training package/).click();
  const list = page.getByRole("listbox", { name: "Training packages" });
  await list.getByRole("option", { name: new RegExp(`^${escapeRegExp(EXPECTED_NAMES[packageId])}`) }).click();
}

function trialInput(page: Page, vehicle: SessionVehicle) {
  return page.getByLabel(`${SESSION_VEHICLE_LABELS[vehicle]} sessions`, { exact: true });
}

test.describe("Additional vehicle packages: names and session selectors", () => {
  test("the listbox shows the six corrected package names", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel(/Select training package/).click();
    const list = page.getByRole("listbox", { name: "Training packages" });
    for (const id of PACKAGE_IDS) {
      await expect(list.getByRole("option", { name: new RegExp(`^${escapeRegExp(EXPECTED_NAMES[id])}`) })).toBeVisible();
    }
    await expect(list.getByRole("option", { name: /Daily Training \+/ })).toHaveCount(0);
  });

  test("the six ids in the spec match the Additional vehicle group in the source", () => {
    expect([...PACKAGE_IDS].sort()).toEqual([...sourceAdditional].sort());
  });
});

for (const packageId of PACKAGE_IDS) {
  test.describe(`${packageId}`, () => {
    test("shows the Regular vehicle as fixed 15 sessions, with no input, and one 1-to-5 input per Trial vehicle", async ({ page }) => {
      const { regular, trial } = rulesFor(packageId);
      await choosePackage(page, packageId);

      await expect(page.getByText("Regular training is fixed at 15 sessions for each vehicle.")).toBeVisible();
      for (const vehicle of regular) {
        await expect(page.getByText(`${SESSION_VEHICLE_LABELS[vehicle]}: 15 sessions`, { exact: true })).toBeVisible();
        await expect(trialInput(page, vehicle)).toHaveCount(0);
      }
      for (const vehicle of trial) {
        const input = trialInput(page, vehicle);
        await expect(input).toHaveCount(1);
        await expect(input).toHaveAttribute("type", "number");
        await expect(input).toHaveAttribute("min", "1");
        await expect(input).toHaveAttribute("max", "5");
      }
    });

    test("Trial selections are independent: changing one does not change the others", async ({ page }) => {
      const { trial } = rulesFor(packageId);
      await choosePackage(page, packageId);

      const first = trial.map((_, i) => String(i + 2));
      for (const [i, vehicle] of trial.entries()) await trialInput(page, vehicle).fill(first[i]);
      for (const [i, vehicle] of trial.entries()) await expect(trialInput(page, vehicle)).toHaveValue(first[i]);

      await trialInput(page, trial[0]).fill("5");
      await expect(trialInput(page, trial[0])).toHaveValue("5");
      for (const [i, vehicle] of trial.entries()) {
        if (i === 0) continue;
        await expect(trialInput(page, vehicle)).toHaveValue(first[i]);
      }
    });

    test("the browser sends the Trial selections only, with no count for the Regular vehicle", async ({ page }) => {
      const { trial } = rulesFor(packageId);
      await choosePackage(page, packageId);

      const values = trial.map((_, i) => (i % 5) + 1);
      for (const [i, vehicle] of trial.entries()) await trialInput(page, vehicle).fill(String(values[i]));

      let sent: { packageId?: string; sessionSelections?: unknown } | undefined;
      // Intercepted in the browser: the request never reaches the server, so nothing is stored.
      await page.route("**/api/registration", async (route) => {
        sent = route.request().postDataJSON();
        await route.fulfill({ status: 422, contentType: "application/json", body: JSON.stringify({ error: "Intercepted by browser test. Not sent.", fields: {} }) });
      });

      await page.getByLabel("Full name *").fill(APPLICANT.fullName);
      await page.getByLabel("Date of birth *").fill(APPLICANT.dateOfBirth);
      await page.getByLabel("NIC number *").fill(APPLICANT.nic);
      await page.getByLabel("Mobile number *").fill(APPLICANT.mobile);
      await page.getByLabel("Email address *").fill(`tss-ui-${packageId}@fixture.test`);
      await page.getByLabel("Password *").fill(APPLICANT.password);
      await page.getByLabel("Residential address *").fill(APPLICANT.address);
      await page.getByRole("button", { name: "Register" }).click();

      await expect.poll(() => sent).toBeDefined();
      expect(sent?.packageId).toBe(packageId);
      expect(sent?.sessionSelections).toEqual(trial.map((vehicleType, i) => ({ vehicleType, requiredSessions: values[i] })));
    });
  });
}
