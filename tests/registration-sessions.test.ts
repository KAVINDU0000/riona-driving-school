// Database-backed. NOT RUN. Non-destructive: it never truncates, resets or seeds a shared table.
// Every row it creates is tracked by exact ID (tests/session-fixtures.ts) and deleted afterwards. Row counts and the
// real package rows are checked against snapshots taken before the run. It refuses to run unless TEST_MODE=non-destructive.
import "./test-mode-guard";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST } from "@/app/api/registration/route";
import { approveRegistration } from "@/lib/admin/registration-review";
import { resetRateLimits } from "@/lib/auth/rate-limit";
import { prisma } from "@/lib/prisma";
import { postRequest } from "./helpers";
import {
  REAL_REGULAR_PACKAGE,
  REAL_TRIAL_PACKAGE,
  assertRealPackagesPresent,
  baseline,
  cleanupFixtures,
  createAdminFixture,
  createLegacyPackageFixture,
  createPendingRegistrationFixture,
  errorText,
  newTracked,
  remainingFixtureRows,
  snapshotPrices,
  snapshotRealItems,
  trackApprovedRows,
  trackRegistrationsByEmail,
  verifyBaseline,
  verifyRealRows,
  type Baseline,
  type Tracked,
} from "./session-fixtures";

let t: Tracked;
let adminId: string;
let before: Baseline | undefined;
let pricesBefore: Awaited<ReturnType<typeof snapshotPrices>> | undefined;
let itemsBefore: Awaited<ReturnType<typeof snapshotRealItems>> | undefined;
let applicantSeq = 0;

/** A unique applicant for this run. The email carries the run ID, so it cannot match a real registration. */
function applicant(label: string) {
  applicantSeq += 1;
  const nic = `2098${String(Date.now() % 100000000).padStart(8, "0")}`;
  return {
    fullName: "Fixture Applicant",
    birthday: "2001-03-04",
    nicNumber: `${nic.slice(0, 11)}${applicantSeq % 10}`,
    phoneNumber: "0771234567",
    email: `tss-${t.runId.toLowerCase()}-${label}@fixture.test`,
    password: "correct-horse-battery",
    address: "No. 8, Temple Road, Galle",
  };
}

/**
 * Submits through the public route. The rows are tracked by this run's email in a finally block, so a row created
 * before a failure (an unreadable response, a failed lookup, or a refusal that still wrote a row) is still cleaned up.
 */
async function submitApplicant(body: Record<string, unknown>) {
  const email = String(body.email);
  let status: number | null = null;
  let rows: { id: string; referenceNumber: string }[] = [];
  try {
    const response = await POST(postRequest("/api/registration", body));
    status = response.status;
  } finally {
    rows = await trackRegistrationsByEmail(t, email);
  }
  return { status, registrationId: rows[0]?.id ?? null, count: rows.length };
}

beforeAll(async () => {
  await assertRealPackagesPresent();
  t = newTracked();
  before = await baseline();
  pricesBefore = await snapshotPrices();
  itemsBefore = await snapshotRealItems();
  adminId = await createAdminFixture(t);
  resetRateLimits();
});

afterAll(async () => {
  if (!t) return;
  const failures: string[] = [];

  // Cleanup runs first and stops at its first failed step. The checks below always run, whatever the cleanup outcome.
  try {
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
  } else {
    failures.push("BASELINE: not taken, so the counts cannot be verified.");
  }

  if (pricesBefore && itemsBefore) {
    try {
      await verifyRealRows(pricesBefore, itemsBefore);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : "Real package data could not be verified.");
    }
  } else {
    failures.push("REAL PACKAGES: snapshot not taken, so the real package rows cannot be verified.");
  }

  if (failures.length > 0) throw new Error(failures.join("\n"));
});

describe("session counts are stored with the registration (NOT RUN)", () => {
  it("stores the selected Trial counts per vehicle, at the unchanged package price", async () => {
    const result = await submitApplicant({
      ...applicant("trial"),
      packageId: REAL_TRIAL_PACKAGE,
      sessionSelections: [
        { vehicleType: "CAR", requiredSessions: 2 },
        { vehicleType: "MOTORCYCLE", requiredSessions: 5 },
      ],
    });
    expect(result.status).toBe(201);
    const registration = await prisma.registrationRequest.findUniqueOrThrow({
      where: { id: result.registrationId! },
      select: { packagePriceAtSubmission: true, sessionSelections: { select: { vehicleType: true, requiredSessions: true } } },
    });
    const real = (pricesBefore ?? []).find((p) => p.id === REAL_TRIAL_PACKAGE);
    expect(real).toBeDefined();
    expect(registration.packagePriceAtSubmission.toFixed(2)).toBe(real!.price);
    expect(Object.fromEntries(registration.sessionSelections.map((s) => [s.vehicleType, s.requiredSessions]))).toEqual({ CAR: 2, MOTORCYCLE: 5 });
  });

  it("refuses a tampered Regular count, and leaves no registration for that email", async () => {
    const body = applicant("tamper");
    const result = await submitApplicant({
      ...body,
      packageId: REAL_REGULAR_PACKAGE,
      sessionSelections: [
        { vehicleType: "CAR", requiredSessions: 3 },
        { vehicleType: "VAN", requiredSessions: 15 },
      ],
    });
    expect(result.status).toBe(422);
    expect(result.count).toBe(0);
  });

  it("approval creates enrollment requirements from the stored Trial counts", async () => {
    const body = applicant("approve");
    const result = await submitApplicant({
      ...body,
      packageId: REAL_TRIAL_PACKAGE,
      sessionSelections: [
        { vehicleType: "CAR", requiredSessions: 2 },
        { vehicleType: "MOTORCYCLE", requiredSessions: 5 },
      ],
    });
    expect(result.status).toBe(201);
    let approved: Awaited<ReturnType<typeof approveRegistration>> | undefined;
    try {
      approved = await approveRegistration(result.registrationId!, adminId);
    } finally {
      // Tracked whether or not approval returned, so an account created before a failure is still cleaned up.
      await trackApprovedRows(t, body.email);
    }
    const requirements = await prisma.enrollmentTrainingRequirement.findMany({
      where: { enrollmentId: approved!.enrollmentId },
      select: { vehicleType: true, requiredSessions: true },
    });
    expect(Object.fromEntries(requirements.map((r) => [r.vehicleType, r.requiredSessions]))).toEqual({ CAR: 2, MOTORCYCLE: 5 });
  });

  it("an application without stored counts uses the package's rows at approval, as before", async () => {
    const packageId = await createLegacyPackageFixture(t);
    const registration = await createPendingRegistrationFixture(t, packageId, 1);
    let approved: Awaited<ReturnType<typeof approveRegistration>> | undefined;
    try {
      approved = await approveRegistration(registration.id, adminId);
    } finally {
      await trackApprovedRows(t, registration.email);
    }
    const rows = await prisma.enrollmentTrainingRequirement.findMany({
      where: { enrollmentId: approved!.enrollmentId },
      select: { vehicleType: true, requiredSessions: true },
    });
    expect(rows.map((r) => [r.vehicleType, r.requiredSessions])).toEqual([["CAR", 7]]);
  });

  // Blocked: the session rules key off the real product IDs, and a later package edit can only be simulated by changing
  // the real package's items. That is not allowed in this run. It needs a separate decision (see the report).
  it.todo("a later package edit does not change a pending applicant's stored counts (BLOCKED: needs a non-real rule fixture)");
});
