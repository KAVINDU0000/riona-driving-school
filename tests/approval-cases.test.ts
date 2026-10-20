// Database-backed. Non-destructive: it never truncates, resets or seeds a shared table. It creates only fixtures it tracks by exact
// ID or by this run's fixture email (tests/session-fixtures.ts), and it never changes a real package row or item.
import "./test-mode-guard";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/registration/route";
import { approveRegistration } from "@/lib/admin/registration-review";
import { AuthError } from "@/lib/auth/http";
import { resetRateLimits } from "@/lib/auth/rate-limit";
import { prisma } from "@/lib/prisma";
import { postRequest } from "./helpers";
import {
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

type Preexisting = { id: string; status: string; updatedAt: string; approvedStudentUserId: string | null; selectedPackageId: string }[];

let t: Tracked;
let adminId: string;
let before: Baseline | undefined;
let pricesBefore: Awaited<ReturnType<typeof snapshotPrices>> | undefined;
let itemsBefore: Awaited<ReturnType<typeof snapshotRealItems>> | undefined;
let preexisting: Preexisting | undefined;
let applicantSeq = 0;

const UNCONFIRMED_MESSAGE = "This package's session requirements have not been confirmed yet, so the application cannot be approved. Contact the school.";
const NULL_COUNT_MESSAGE = "This package has no session counts set yet, so it cannot be approved.";

function applicant(label: string) {
  applicantSeq += 1;
  const nic = `2096${String(Date.now() % 100000000).padStart(8, "0")}`;
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

/** Submits through the public route. Rows are tracked by this run's email in a finally block, whatever the response. */
async function submit(body: Record<string, unknown>) {
  const email = String(body.email);
  let status: number | null = null;
  let rows: { id: string; referenceNumber: string }[] = [];
  try {
    const response = await POST(postRequest("/api/registration", body));
    status = response.status;
  } finally {
    rows = await trackRegistrationsByEmail(t, email);
  }
  return { status, registrationId: rows[0]?.id ?? null };
}

/** Approves and tracks whatever approval created, in a finally block. Returns the error for refused approvals. */
async function approve(registrationId: string, email: string) {
  try {
    return { ok: true as const, result: await approveRegistration(registrationId, adminId) };
  } catch (error) {
    return { ok: false as const, error };
  } finally {
    await trackApprovedRows(t, email);
  }
}

/** Nothing was created for a refused application: no account, no enrollment, and the application is still pending. */
async function expectNothingCreated(registrationId: string, email: string) {
  expect(await prisma.user.count({ where: { email } })).toBe(0);
  expect(await prisma.enrollment.count({ where: { registrationRequestId: registrationId } })).toBe(0);
  const row = await prisma.registrationRequest.findUniqueOrThrow({ where: { id: registrationId } });
  expect(row.status).toBe("PENDING");
  expect(row.approvedStudentUserId).toBeNull();
}

beforeAll(async () => {
  await assertRealPackagesPresent();
  t = newTracked();
  before = await baseline();
  pricesBefore = await snapshotPrices();
  itemsBefore = await snapshotRealItems();
  adminId = await createAdminFixture(t);
  preexisting = (await prisma.registrationRequest.findMany({
    select: { id: true, status: true, updatedAt: true, approvedStudentUserId: true, selectedPackageId: true },
    orderBy: { id: "asc" },
  })).map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() }));
});

beforeEach(() => {
  resetRateLimits();
});

afterAll(async () => {
  if (!t) return;
  const failures: string[] = [];

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

describe("approval: stored selections and fallback rules (approval-cases)", () => {
  it("approves an application with stored selections using its own counts, whatever the package's confirmation", async () => {
    const body = applicant("stored");
    const submitted = await submit({
      ...body,
      packageId: REAL_TRIAL_PACKAGE,
      sessionSelections: [
        { vehicleType: "CAR", requiredSessions: 2 },
        { vehicleType: "MOTORCYCLE", requiredSessions: 5 },
      ],
    });
    expect(submitted.status).toBe(201);

    const outcome = await approve(submitted.registrationId!, body.email);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const requirements = await prisma.enrollmentTrainingRequirement.findMany({
      where: { enrollmentId: outcome.result.enrollmentId },
      select: { vehicleType: true, trainingType: true, requiredSessions: true },
    });
    expect(requirements).toHaveLength(2);
    expect(requirements).toContainEqual({ vehicleType: "CAR", trainingType: "TRIAL_PREPARATION", requiredSessions: 2 });
    expect(requirements).toContainEqual({ vehicleType: "MOTORCYCLE", trainingType: "TRIAL_PREPARATION", requiredSessions: 5 });
  });

  it("refuses fallback approval while the package's requirements are unconfirmed, and creates nothing", async () => {
    const packageId = await createLegacyPackageFixture(t, { confirmed: false });
    const registration = await createPendingRegistrationFixture(t, packageId, 1);

    const outcome = await approve(registration.id, registration.email);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.error).toBeInstanceOf(AuthError);
    expect((outcome.error as AuthError).status).toBe(422);
    expect((outcome.error as AuthError).message).toBe(UNCONFIRMED_MESSAGE);
    await expectNothingCreated(registration.id, registration.email);
  });

  it("refuses fallback approval when a session count is null, even for a confirmed package, and creates nothing", async () => {
    const packageId = await createLegacyPackageFixture(t, { confirmed: true, requiredSessions: null });
    const registration = await createPendingRegistrationFixture(t, packageId, 2);

    const outcome = await approve(registration.id, registration.email);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.error).toBeInstanceOf(AuthError);
    expect((outcome.error as AuthError).status).toBe(422);
    expect((outcome.error as AuthError).message).toBe(NULL_COUNT_MESSAGE);
    await expectNothingCreated(registration.id, registration.email);
  });

  it("approves a valid confirmed fallback application with the package's own counts", async () => {
    const packageId = await createLegacyPackageFixture(t);
    const registration = await createPendingRegistrationFixture(t, packageId, 3);

    const outcome = await approve(registration.id, registration.email);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const requirements = await prisma.enrollmentTrainingRequirement.findMany({
      where: { enrollmentId: outcome.result.enrollmentId },
      select: { vehicleType: true, trainingType: true, requiredSessions: true },
    });
    expect(requirements).toEqual([{ vehicleType: "CAR", trainingType: "REGULAR", requiredSessions: 7 }]);
  });

  it("leaves every registration that existed before the run unchanged", async () => {
    const now = (
      await prisma.registrationRequest.findMany({
        select: { id: true, status: true, updatedAt: true, approvedStudentUserId: true, selectedPackageId: true },
        orderBy: { id: "asc" },
      })
    ).map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() }));
    // Every row that existed before the run must still be there, with the same status, time and approval link.
    const earlier = preexisting ?? [];
    expect(now.filter((r) => earlier.some((e) => e.id === r.id))).toEqual(earlier);
  });
});
