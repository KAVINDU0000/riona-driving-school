// Database-backed. NOT RUN. Prepared for the six Additional vehicle packages (Regular vehicle fixed at 15, Trial vehicles 1 to 5).
// Non-destructive: it never truncates, resets or seeds. It reads the six real packages and only creates rows it tracks
// by exact ID or by this run's fixture email (tests/session-fixtures.ts). It refuses to run unless TEST_MODE=non-destructive.
import "./test-mode-guard";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/registration/route";
import { approveRegistration } from "@/lib/admin/registration-review";
import { resetRateLimits } from "@/lib/auth/rate-limit";
import { packageRuleFor, sessionRuleFor, trialVehiclesOf, type SessionVehicle } from "@/lib/registration/session-rules";
import { prisma } from "@/lib/prisma";
import { postRequest } from "./helpers";
import {
  baseline,
  cleanupFixtures,
  createAdminFixture,
  errorText,
  newTracked,
  remainingFixtureRows,
  trackApprovedRows,
  trackRegistrationsByEmail,
  verifyBaseline,
  type Baseline,
  type Tracked,
} from "./session-fixtures";

// The six real Additional vehicle packages. Read-only in this test: never created, edited or deleted.
const MIXED_PACKAGES = [
  "extra-car-motorcycle",
  "extra-car-three-wheeler",
  "extra-car-three-wheeler-motorcycle",
  "extra-van-motorcycle",
  "extra-van-three-wheeler",
  "extra-van-three-wheeler-motorcycle",
] as const;

type Snapshot = {
  packages: { id: string; price: string; isActive: boolean; updatedAt: string }[];
  items: { id: string; packageId: string; vehicleType: string; trainingType: string; requiredSessions: number | null; updatedAt: string }[];
};

async function snapshotMixed(): Promise<Snapshot> {
  const packages = await prisma.trainingPackage.findMany({
    where: { id: { in: [...MIXED_PACKAGES] } },
    select: { id: true, price: true, isActive: true, updatedAt: true },
    orderBy: { id: "asc" },
  });
  const items = await prisma.trainingPackageItem.findMany({
    where: { packageId: { in: [...MIXED_PACKAGES] } },
    select: { id: true, packageId: true, vehicleType: true, trainingType: true, requiredSessions: true, updatedAt: true },
    orderBy: { id: "asc" },
  });
  return {
    packages: packages.map((p) => ({ id: p.id, price: p.price.toFixed(2), isActive: p.isActive, updatedAt: p.updatedAt.toISOString() })),
    items: items.map((i) => ({ ...i, updatedAt: i.updatedAt.toISOString() })),
  };
}

let t: Tracked;
let adminId: string;
let before: Baseline | undefined;
let snapshotBefore: Snapshot | undefined;
let applicantSeq = 0;

function mixedRule(id: string) {
  const rule = sessionRuleFor(id);
  if (!rule || rule.kind !== "MIXED") throw new Error(`${id} is not a MIXED rule`);
  return rule;
}

/** A unique applicant for this run. The email carries the run ID, so it cannot match a real registration. */
function applicant(label: string) {
  applicantSeq += 1;
  const nic = `2097${String(Date.now() % 100000000).padStart(8, "0")}`;
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
  return { status, registrationId: rows[0]?.id ?? null, count: rows.length };
}

beforeAll(async () => {
  t = newTracked();
  before = await baseline();
  snapshotBefore = await snapshotMixed();
  adminId = await createAdminFixture(t);
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

  if (snapshotBefore) {
    try {
      const now = await snapshotMixed();
      if (JSON.stringify(now) !== JSON.stringify(snapshotBefore)) {
        failures.push("REAL PACKAGES: the six Additional vehicle package rows or items changed during the run. Report this before any further run.");
      }
    } catch (error) {
      failures.push(`REAL PACKAGES: could not re-read the rows (${errorText(error)}).`);
    }
  } else {
    failures.push("REAL PACKAGES: snapshot not taken, so the real package rows cannot be verified.");
  }

  if (failures.length > 0) throw new Error(failures.join("\n"));
});

describe.each(MIXED_PACKAGES.map((id) => [id]))("%s: Regular vehicle 15, Trial vehicles 1 to 5 (NOT RUN)", (packageId) => {
  const rule = mixedRule(packageId);
  const trial = trialVehiclesOf(rule) as SessionVehicle[];

  it("is classified as a MIXED rule with a Trial vehicle list", () => {
    expect(packageRuleFor(packageId)?.kind).toBe("MIXED");
    expect(trial.length).toBeGreaterThan(0);
  });

  it("stores the Regular 15 and the Trial counts, and approval creates the same requirements", async () => {
    const label = `ok-${packageId}`;
    const body = applicant(label);
    const selections = trial.map((vehicleType, i) => ({ vehicleType, requiredSessions: (i % 5) + 1 }));
    const result = await submit({ ...body, packageId, sessionSelections: selections });
    expect(result.status).toBe(201);

    const stored = await prisma.registrationSessionSelection.findMany({
      where: { registrationRequestId: result.registrationId! },
      select: { vehicleType: true, trainingType: true, requiredSessions: true },
    });
    expect(stored).toHaveLength(trial.length + 1);
    expect(stored).toContainEqual({ vehicleType: rule.regular, trainingType: "REGULAR", requiredSessions: 15 });
    for (const [i, vehicleType] of trial.entries()) {
      expect(stored).toContainEqual({ vehicleType, trainingType: "TRIAL_PREPARATION", requiredSessions: (i % 5) + 1 });
    }

    let approvedEnrollmentId: string | undefined;
    try {
      const approved = await approveRegistration(result.registrationId!, adminId);
      approvedEnrollmentId = approved.enrollmentId;
    } finally {
      await trackApprovedRows(t, body.email);
    }
    const requirements = await prisma.enrollmentTrainingRequirement.findMany({
      where: { enrollmentId: approvedEnrollmentId! },
      select: { vehicleType: true, trainingType: true, requiredSessions: true },
    });
    expect(requirements).toHaveLength(stored.length);
    for (const row of stored) expect(requirements).toContainEqual(row);
  });

  it("refuses a client count for the Regular vehicle, and creates no registration", async () => {
    const body = applicant(`tamper-${packageId}`);
    const sent = [
      { vehicleType: rule.regular, requiredSessions: 3 },
      ...trial.map((vehicleType) => ({ vehicleType, requiredSessions: 2 })),
    ];
    const result = await submit({ ...body, packageId, sessionSelections: sent });
    expect(result.status).toBe(422);
    expect(result.count).toBe(0);
  });

  it.each([
    ["missing Trial vehicle", (v: SessionVehicle[]) => v.slice(1)],
    ["duplicate Trial vehicle", (v: SessionVehicle[]) => [...v, v[0]]],
    ["out-of-range count", (v: SessionVehicle[]) => v.map((x, i) => ({ vehicleType: x, requiredSessions: i === 0 ? 6 : 2 }))],
    ["fractional count", (v: SessionVehicle[]) => v.map((x, i) => ({ vehicleType: x, requiredSessions: i === 0 ? 2.5 : 2 }))],
    ["null count", (v: SessionVehicle[]) => v.map((x, i) => ({ vehicleType: x, requiredSessions: i === 0 ? null : 2 }))],
    ["unsupported vehicle", (v: SessionVehicle[]) => [{ vehicleType: "BUS", requiredSessions: 2 }, ...v.slice(1)]],
    ["no selections", () => undefined],
  ])("refuses a %s, and creates no registration", async (_label, build) => {
    const body = applicant(`bad-${packageId}-${_label.replace(/\W+/g, "")}`);
    const selections = (build as (v: SessionVehicle[]) => unknown)(trial);
    const result = await submit({ ...body, packageId, sessionSelections: selections });
    expect(result.status).toBe(422);
    expect(result.count).toBe(0);
  });

  // Blocked: a package edit can only be simulated by changing a real package's items, which this run must not do.
  // A separate fixture rule is needed before this can run (see the report).
  it.todo("a package edit after submission does not change the saved selections (BLOCKED: needs a non-real rule fixture)");
});
