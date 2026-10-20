// Database-backed. Non-destructive: no reset, no TRUNCATE. Two packages are created for this run (one active, one inactive) and
// tracked for cleanup. Real packages are never read for update or deleted. Registrations use this run's fixture email and are
// tracked by that email.
import "./test-mode-guard";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/registration/route";
import { resetRateLimits } from "@/lib/auth/rate-limit";
import { prisma } from "@/lib/prisma";
import { getActivePackageIds } from "@/lib/registration/packages";
import { postRequest } from "./helpers";
import {
  baseline,
  cleanupFixtures,
  errorText,
  newTracked,
  remainingFixtureRows,
  trackRegistrationsByEmail,
  verifyBaseline,
  type Baseline,
  type Tracked,
} from "./session-fixtures";

let t: Tracked;
let before: Baseline | undefined;
let activeId = "";
let inactiveId = "";
let email = "";

/** The IDs of every active package in the database right now. Used to compare with the function under test. */
async function activeIdsInDatabase() {
  return (await prisma.trainingPackage.findMany({ where: { isActive: true }, select: { id: true } })).map((p) => p.id).sort();
}

beforeAll(async () => {
  t = newTracked();
  before = await baseline();
  activeId = `PAV-${t.runId}-active`;
  inactiveId = `PAV-${t.runId}-inactive`;
  email = `package-availability-${t.runId.toLowerCase()}@fixture.test`;
  const active = await prisma.trainingPackage.create({
    data: { id: activeId, name: "Fixture active package", packageType: "TRIAL_PREPARATION", price: 1000, isActive: true },
  });
  const inactive = await prisma.trainingPackage.create({
    data: { id: inactiveId, name: "Fixture inactive package", packageType: "TRIAL_PREPARATION", price: 1000, isActive: false },
  });
  t.packageIds.push(active.id, inactive.id);
});

beforeEach(() => {
  resetRateLimits();
});

afterAll(async () => {
  if (!t) return;
  const failures: string[] = [];
  try {
    // Registrations created by the POST tests are tracked by this run's email before the packages are removed.
    await trackRegistrationsByEmail(t, email);
    await cleanupFixtures(t);
  } catch (error) {
    failures.push(`CLEANUP FAILED (${errorText(error)}). Tracked IDs are listed in the message above.`);
    failures.push(...(await remainingFixtureRows(t)));
  }
  if (before) {
    try {
      await verifyBaseline(before);
    } catch (error) {
      failures.push(`BASELINE: ${errorText(error)}. ${error instanceof Error ? error.message : ""}`);
    }
  }
  if (failures.length > 0) throw new Error(failures.join("\n"));
});

describe("active packages in the database", () => {
  const VALID_BODY = {
    fullName: "Kasun Silva",
    birthday: "2001-03-04",
    nicNumber: "200112345678",
    phoneNumber: "0771234567",
    password: "correct-horse-battery",
    address: "No. 8, Temple Road, Galle",
  };

  it("returns exactly the active package ids in the database, and never an inactive one", async () => {
    const listed = (await getActivePackageIds()).sort();
    expect(listed).toEqual(await activeIdsInDatabase());
    expect(listed).toContain(activeId);
    expect(listed).not.toContain(inactiveId);
  });

  it("refuses a direct submission for a listed package that was deactivated, and stores nothing", async () => {
    const response = await POST(
      postRequest("/api/registration", { ...VALID_BODY, email, packageId: inactiveId, sessionSelections: [{ vehicleType: "VAN", requiredSessions: 2 }] }),
    );
    expect(response.status).toBe(422);
    const body = (await response.json()) as { fields: Record<string, string> };
    expect(body.fields.packageId).toBe("Select an available training package.");
    expect(await prisma.registrationRequest.count({ where: { email } })).toBe(0);
  });

  it("accepts the same submission for an active package", async () => {
    const response = await POST(
      postRequest("/api/registration", { ...VALID_BODY, email, packageId: activeId, sessionSelections: [{ vehicleType: "CAR", requiredSessions: 2 }] }),
    );
    expect(response.status).toBe(201);
    expect(await prisma.registrationRequest.count({ where: { email } })).toBe(1);
  });

  it("stops offering a package as soon as it is deactivated", async () => {
    await prisma.trainingPackage.update({ where: { id: activeId }, data: { isActive: false } });
    try {
      const listed = await getActivePackageIds();
      expect(listed).not.toContain(activeId);
      expect(listed.sort()).toEqual(await activeIdsInDatabase());
    } finally {
      // Restore the fixture so later tests see the same starting state.
      await prisma.trainingPackage.update({ where: { id: activeId }, data: { isActive: true } });
    }
  });
});
