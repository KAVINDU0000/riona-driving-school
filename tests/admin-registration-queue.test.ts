// Database-backed. Non-destructive: no reset, no TRUNCATE, no broad delete. Every application is created by this run and tracked by
// exact ID; its email carries the run ID. Each test has its own scope token, and every list query is limited to that token, so
// totals and pages count only this test's applications. The real DAILY package (daily-car) is read only.
import "./test-mode-guard";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PaymentMethod, PaymentStatus } from "@/generated/prisma/enums";
import { GET as listRoute } from "@/app/api/admin/registrations/route";
import { AuthError } from "@/lib/auth/http";
import { resetRateLimits } from "@/lib/auth/rate-limit";
import { createSession } from "@/lib/auth/session";
import { ADMIN_PAGE_SIZE, parseSearchText } from "@/lib/admin/query";
import {
  approveRegistration,
  getRegistration,
  listRegistrations,
  parseRegistrationListQuery,
  rejectRegistration,
} from "@/lib/admin/registration-review";
import { prisma } from "@/lib/prisma";
import { getRequest } from "./helpers";
import {
  assertRealPackagesPresent,
  baseline,
  cleanupFixtures,
  createAdminFixture,
  createLegacyPackageFixture,
  errorText,
  newTracked,
  remainingFixtureRows,
  trackApprovedRows,
  verifyBaseline,
  type Baseline,
  type Tracked,
} from "./session-fixtures";

const DAILY_ID = "daily-car";

let t: Tracked;
let adminId: string;
let before: Baseline | undefined;
let dailyBefore: { price: string; isActive: boolean; updatedAt: string } | undefined;
let scope = "";
let packageId = "";
let counter = 0;

/** Parses a query string the way the API does. */
function query(search: string) {
  return parseRegistrationListQuery(new URLSearchParams(search));
}

/** The query for this test: the scope token, plus any extra parameters. */
function scoped(extra = "") {
  return query(`q=${encodeURIComponent(scope)}${extra ? `&${extra}` : ""}`);
}

function statusOf(action: () => unknown): number | undefined {
  try {
    action();
    return undefined;
  } catch (error) {
    return error instanceof AuthError ? error.status : undefined;
  }
}

/** Eight digits, derived from the scope, for NIC and phone searches that only this test's rows can match. */
function digitsOf(value: string) {
  return String(parseInt(value, 16) % 100000000).padStart(8, "0");
}

function emailFor(label: string) {
  counter += 1;
  return `${label}-${counter}-${scope}-${t.runId.toLowerCase()}@fixture.test`;
}

async function addApplication(
  overrides: Partial<{
    fullName: string;
    email: string;
    nicNumber: string;
    phoneNumber: string;
    referenceNumber: string;
    selectedPackageId: string;
    submittedAt: Date;
  }> = {},
) {
  counter += 1;
  const selectedPackageId = overrides.selectedPackageId ?? packageId;
  const row = await prisma.registrationRequest.create({
    data: {
      referenceNumber: overrides.referenceNumber ?? `RDS-${scope.toUpperCase()}${String(counter).padStart(2, "0")}`,
      fullName: overrides.fullName ?? `Applicant ${scope} ${counter}`,
      birthday: new Date("2000-05-10"),
      nicNumber: overrides.nicNumber ?? `NIC-${scope}-${counter}`,
      phoneNumber: overrides.phoneNumber ?? `0770${String(counter).padStart(6, "0")}`,
      address: "No. 12, Main Street, Colombo 03",
      email: overrides.email ?? emailFor("applicant"),
      // Never checked in these tests. Real hashes are covered in the registration tests.
      passwordHash: "not-used-in-this-test",
      selectedPackageId,
      packagePriceAtSubmission: selectedPackageId === DAILY_ID ? 2000 : 1000,
      ...(overrides.submittedAt ? { submittedAt: overrides.submittedAt } : {}),
    },
  });
  t.registrationIds.push(row.id);
  t.referenceNumbers.push(row.referenceNumber);
  return row;
}

beforeAll(async () => {
  await assertRealPackagesPresent();
  t = newTracked();
  before = await baseline();
  adminId = await createAdminFixture(t);
  const daily = await prisma.trainingPackage.findUniqueOrThrow({ where: { id: DAILY_ID }, select: { price: true, isActive: true, updatedAt: true } });
  dailyBefore = { price: daily.price.toFixed(2), isActive: daily.isActive, updatedAt: daily.updatedAt.toISOString() };
});

/** Per-test setup for tests that read or write the database: a fresh scope and a fixture package with a valid count. */
async function setupScope() {
  scope = randomBytes(3).toString("hex");
  resetRateLimits();
  packageId = await createLegacyPackageFixture(t);
}

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

  if (dailyBefore) {
    try {
      const now = await prisma.trainingPackage.findUniqueOrThrow({ where: { id: DAILY_ID }, select: { price: true, isActive: true, updatedAt: true } });
      const after = { price: now.price.toFixed(2), isActive: now.isActive, updatedAt: now.updatedAt.toISOString() };
      if (JSON.stringify(after) !== JSON.stringify(dailyBefore)) failures.push("REAL PACKAGE: daily-car changed during the run.");
    } catch (error) {
      failures.push(`REAL PACKAGE: could not re-read daily-car (${errorText(error)}).`);
    }
  }

  if (failures.length > 0) throw new Error(failures.join("\n"));
});

describe("reading the registration query", () => {
  it("uses the defaults when nothing is given: pending, oldest first, page 1", () => {
    expect(query("")).toEqual({
      status: "PENDING",
      search: "",
      packageId: null,
      submittedFrom: null,
      submittedTo: null,
      order: "oldest",
      page: 1,
    });
  });

  it("refuses malformed values with 400 rather than querying with them", () => {
    expect(statusOf(() => query("status=DELETED"))).toBe(400);
    expect(statusOf(() => query("page=0"))).toBe(400);
    expect(statusOf(() => query("page=abc"))).toBe(400);
    expect(statusOf(() => query("package=../../etc"))).toBe(400);
    expect(statusOf(() => query("from=2026-02-30"))).toBe(400);
    expect(statusOf(() => query("from=10-03-2026"))).toBe(400);
    expect(statusOf(() => query("from=2026-03-02&to=2026-03-01"))).toBe(400);
    expect(statusOf(() => query("order=random"))).toBe(400);
    expect(statusOf(() => query(`q=${"x".repeat(101)}`))).toBe(400);
  });

  it("trims search text and accepts a valid date range", () => {
    expect(parseSearchText("  Nimal  ")).toBe("Nimal");
    const parsed = query("q=%20nimal%20&from=2026-03-01&to=2026-03-31&order=newest&page=2");
    expect(parsed).toMatchObject({ search: "nimal", submittedFrom: "2026-03-01", submittedTo: "2026-03-31", order: "newest", page: 2 });
  });
});

describe("searching and filtering applications", () => {
  beforeEach(setupScope);

  it("matches name, reference, email, NIC and phone, ignoring case", async () => {
    const digits = digitsOf(scope);
    const nimal = await addApplication({
      fullName: `Nimal${scope}`,
      referenceNumber: `RDS-${scope.toUpperCase()}01`,
      email: `nimal-${scope}@example.com`,
      nicNumber: `${digits}0101`,
      phoneNumber: `07${digits}`,
    });
    const kamal = await addApplication({
      fullName: `Kamal${scope}`,
      referenceNumber: `RDS-${scope.toUpperCase()}02`,
      email: `kamal-${scope}@example.org`,
    });

    const ids = async (search: string) => (await listRegistrations(query(`q=${encodeURIComponent(search)}`))).registrations.map((r) => r.id);
    expect(await ids(`nimal${scope}`.toUpperCase())).toEqual([nimal.id]);
    expect(await ids(`rds-${scope}02`)).toEqual([kamal.id]);
    expect(await ids(`KAMAL-${scope}@EXAMPLE`)).toEqual([kamal.id]);
    expect(await ids(`${digits}0101`)).toEqual([nimal.id]);
    expect(await ids(`07${digits}`)).toEqual([nimal.id]);
    expect(await ids(`nobody-${scope}`)).toEqual([]);
  });

  it("filters by package", async () => {
    const regular = await addApplication({ selectedPackageId: packageId });
    const daily = await addApplication({ selectedPackageId: DAILY_ID });
    expect((await listRegistrations(scoped(`package=${DAILY_ID}`))).registrations.map((r) => r.id)).toEqual([daily.id]);
    expect((await listRegistrations(scoped(`package=${packageId}`))).registrations.map((r) => r.id)).toEqual([regular.id]);
  });

  it("uses school-time day boundaries for the submission date filter", async () => {
    // 18:30 UTC is midnight in Asia/Colombo, so this one belongs to 11 March, the one before it to 10 March.
    const before = await addApplication({ submittedAt: new Date("2026-03-10T18:29:59.000Z") });
    const after = await addApplication({ submittedAt: new Date("2026-03-10T18:30:00.000Z") });

    const on = async (from: string, to: string) =>
      (await listRegistrations(scoped(`from=${from}&to=${to}`))).registrations.map((r) => r.id);
    expect(await on("2026-03-10", "2026-03-10")).toEqual([before.id]);
    expect(await on("2026-03-11", "2026-03-11")).toEqual([after.id]);
    expect(await on("2026-03-10", "2026-03-11")).toEqual([before.id, after.id]);
  });

  it("returns an empty page with a total of 0 when nothing matches", async () => {
    await addApplication();
    const result = await listRegistrations(query(`q=${encodeURIComponent(`no-such-applicant-${scope}`)}`));
    expect(result).toMatchObject({ total: 0, page: 1, pageCount: 1, registrations: [] });
  });
});

describe("paging and order", () => {
  beforeEach(setupScope);

  it("pages through every match once, even when submission times are identical", async () => {
    const sameTime = new Date("2026-04-01T04:00:00.000Z");
    for (let index = 0; index < ADMIN_PAGE_SIZE + 5; index += 1) {
      await addApplication({ submittedAt: sameTime });
    }

    const first = await listRegistrations(scoped("page=1"));
    const second = await listRegistrations(scoped("page=2"));
    expect(first.total).toBe(ADMIN_PAGE_SIZE + 5);
    expect(first.pageCount).toBe(2);
    expect(first.registrations).toHaveLength(ADMIN_PAGE_SIZE);
    expect(second.registrations).toHaveLength(5);

    const ids = [...first.registrations, ...second.registrations].map((r) => r.id);
    expect(new Set(ids).size).toBe(ADMIN_PAGE_SIZE + 5);
  });

  it("lists newest first when asked, and oldest first by default", async () => {
    const older = await addApplication({ submittedAt: new Date("2026-03-01T00:00:00Z") });
    const newer = await addApplication({ submittedAt: new Date("2026-03-05T00:00:00Z") });
    expect((await listRegistrations(scoped(""))).registrations.map((r) => r.id)).toEqual([older.id, newer.id]);
    expect((await listRegistrations(scoped("order=newest"))).registrations.map((r) => r.id)).toEqual([newer.id, older.id]);
  });
});

describe("application detail and history", () => {
  beforeEach(setupScope);

  it("records the approval, the enrollment and the payment in order, and never returns the password hash", async () => {
    const applicant = await addApplication({ fullName: `Nimal${scope}`, submittedAt: new Date("2026-03-01T03:00:00Z") });
    const payment = await prisma.payment.create({
      data: { registrationRequestId: applicant.id, amount: 1000, paymentMethod: PaymentMethod.BANK_TRANSFER, paymentDate: new Date("2026-03-02"), status: PaymentStatus.PENDING },
    });
    t.paymentIds.push(payment.id);
    try {
      await approveRegistration(applicant.id, adminId);
    } finally {
      await trackApprovedRows(t, applicant.email);
    }

    const detail = await getRegistration(applicant.id);
    const events = detail.history.map((entry) => entry.event);
    expect(events[0]).toBe("Submitted");
    expect(events).toContain(`Approved by ${adminId}`);
    expect(events).toContain("Enrollment created");
    expect(events).toContain("Payment recorded");
    expect(detail.history.find((entry) => entry.event === `Approved by ${adminId}`)?.detail).toMatch(/^Student ID STU-\d{3,}$/);
    expect(detail.payments).toHaveLength(1);
    expect(JSON.stringify(detail)).not.toContain("not-used-in-this-test");
    expect("passwordHash" in detail).toBe(false);
  });

  it("shows the rejection reason in the history", async () => {
    const applicant = await addApplication();
    await rejectRegistration(applicant.id, adminId, "Documents do not match the NIC.");
    const detail = await getRegistration(applicant.id);
    expect(detail.history.map((entry) => entry.event)).toEqual(["Submitted", `Rejected by ${adminId}`]);
    expect(detail.history[1].detail).toBe("Documents do not match the NIC.");
  });

  it("lets only one of two concurrent rejections succeed, and the other is refused with 409", async () => {
    const applicant = await addApplication();
    const results = await Promise.allSettled([
      rejectRegistration(applicant.id, adminId, "Duplicate application received."),
      rejectRegistration(applicant.id, adminId, "Duplicate application received."),
    ]);
    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const refused = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(refused).toHaveLength(1);
    expect(refused[0].reason).toBeInstanceOf(AuthError);
    expect((refused[0].reason as AuthError).status).toBe(409);
  });
});

describe("the list route", () => {
  beforeEach(setupScope);

  it("returns one page with the total and the page metadata, and refuses a bad page with 400", async () => {
    await addApplication();
    await addApplication();
    const { token } = await createSession(adminId);
    const cookie = `riona_session=${token}`;

    const ok = await listRoute(getRequest(`/api/admin/registrations?status=PENDING&page=1&q=${encodeURIComponent(scope)}`, cookie));
    const body = (await ok.json()) as { registrations: unknown[]; total: number; page: number; pageCount: number; pageSize: number };
    expect(ok.status).toBe(200);
    expect(body).toMatchObject({ total: 2, page: 1, pageCount: 1, pageSize: ADMIN_PAGE_SIZE });
    expect(body.registrations).toHaveLength(2);

    const bad = await listRoute(getRequest("/api/admin/registrations?page=0", cookie));
    expect(bad.status).toBe(400);
  });
});
