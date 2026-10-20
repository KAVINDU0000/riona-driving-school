// Database-backed. Non-destructive: no reset, no TRUNCATE, no broad delete. Every row is created by this run and tracked by exact ID
// or by this run's fixture email (tests/session-fixtures.ts). Each test has its own scope token, so its list queries see only
// its own applications. The real DAILY package (daily-car) is read only and checked afterwards.
import "./test-mode-guard";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AccountStatus, UserRole } from "@/generated/prisma/enums";
import { GET as listRoute } from "@/app/api/admin/registrations/route";
import { GET as detailRoute } from "@/app/api/admin/registrations/[id]/route";
import { POST as approveRoute } from "@/app/api/admin/registrations/[id]/approve/route";
import { POST as rejectRoute } from "@/app/api/admin/registrations/[id]/reject/route";
import { POST as studentLogin } from "@/app/api/auth/student/login/route";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { resetRateLimits } from "@/lib/auth/rate-limit";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createAccount, getRequest, postRequest } from "./helpers";
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

const APPLICANT_PASSWORD = "applicant-chooses-this-1";
const DAILY_ID = "daily-car";

let t: Tracked;
let adminId: string;
let studentId: string;
let studentEmail: string;
let studentNic: string;
let instructorId: string;
let before: Baseline | undefined;
let dailyBefore: { price: string; isActive: boolean; updatedAt: string } | undefined;
let scope = "";
let packageId = "";
let seq = 0;

const UNCONFIRMED_MESSAGE = "This package's session requirements have not been confirmed yet, so the application cannot be approved. Contact the school.";
const NULL_COUNT_MESSAGE = "This package has no session counts set yet, so it cannot be approved.";
// The approval code gives one message for a package with no count rows and for a null count, as the committed code did.
const NO_ROWS_MESSAGE = "This package has no session counts set yet, so it cannot be approved.";

/** An email that only this run and this test can produce. It always carries the run ID, so the tracked-row checks accept it. */
function fixtureEmail(label: string) {
  return `${label}-${scope}-${t.runId.toLowerCase()}@fixture.test`;
}

async function cookieFor(userId: string) {
  const { token } = await createSession(userId);
  return `riona_session=${token}`;
}

/** Creates an application for this test. It is tracked by exact ID, and its email carries the run ID. */
async function createPending(overrides: Partial<{ email: string; nicNumber: string; selectedPackageId: string }> = {}) {
  seq += 1;
  const selectedPackageId = overrides.selectedPackageId ?? packageId;
  const row = await prisma.registrationRequest.create({
    data: {
      referenceNumber: `RDS-${scope.toUpperCase()}${String(seq).padStart(2, "0")}`,
      fullName: `Applicant ${scope}`,
      birthday: new Date("2000-05-10"),
      nicNumber: overrides.nicNumber ?? `NIC-${scope}-${seq}`,
      phoneNumber: "0771234567",
      address: "No. 12, Main Street, Colombo 03",
      email: overrides.email ?? fixtureEmail(`applicant-${seq}`),
      passwordHash: await hashPassword(APPLICANT_PASSWORD),
      selectedPackageId,
      packagePriceAtSubmission: selectedPackageId === DAILY_ID ? 2000 : 1000,
    },
  });
  t.registrationIds.push(row.id);
  t.referenceNumbers.push(row.referenceNumber);
  return row;
}

/** Calls the approve handler for one application, as the route would receive it. */
function approve(id: string, cookie?: string, origin?: string | null) {
  return approveRoute(postRequest(`/api/admin/registrations/${id}/approve`, {}, { cookie, origin }), {
    params: Promise.resolve({ id }),
  });
}

/** Approves, then tracks whatever approval created, even when it was refused. */
async function approveTracked(id: string, email: string, cookie: string, origin?: string | null) {
  try {
    return await approve(id, cookie, origin);
  } finally {
    await trackApprovedRows(t, email);
  }
}

function reject(id: string, body: unknown, cookie?: string, origin?: string | null) {
  return rejectRoute(postRequest(`/api/admin/registrations/${id}/reject`, body, { cookie, origin }), {
    params: Promise.resolve({ id }),
  });
}

function detail(id: string, cookie?: string) {
  return detailRoute(getRequest(`/api/admin/registrations/${id}`, cookie), { params: Promise.resolve({ id }) });
}

/** A refused approval creates no account, no profile, no enrollment, and leaves the application pending. */
async function expectNothingCreated(registrationId: string, email: string, nicNumber: string) {
  expect(await prisma.user.count({ where: { email } })).toBe(0);
  expect(await prisma.studentProfile.count({ where: { nicNumber } })).toBe(0);
  expect(await prisma.enrollment.count({ where: { registrationRequestId: registrationId } })).toBe(0);
  const after = await prisma.registrationRequest.findUniqueOrThrow({ where: { id: registrationId } });
  expect(after.status).toBe("PENDING");
  expect(after.approvedStudentUserId).toBeNull();
}

beforeAll(async () => {
  await assertRealPackagesPresent();
  t = newTracked();
  before = await baseline();
  adminId = await createAdminFixture(t);

  studentId = `TSS-STU-${t.runId}`;
  studentEmail = `student-${t.runId.toLowerCase()}@fixture.test`;
  await createAccount({ userId: studentId, email: studentEmail, role: UserRole.STUDENT });
  t.studentUserIds.push(studentId);
  studentNic = `NIC-${studentId}`;

  instructorId = `TSS-INS-${t.runId}`;
  await prisma.user.create({
    data: {
      userId: instructorId,
      email: `instructor-${t.runId.toLowerCase()}@fixture.test`,
      passwordHash: "fixture-not-used",
      role: UserRole.INSTRUCTOR,
      status: AccountStatus.ACTIVE,
    },
  });
  t.userIds.push(instructorId);
  // An instructor can only use the system with an active profile (see isAccountEligible), so the fixture creates one.
  await prisma.instructorProfile.create({
    data: { userId: instructorId, fullName: `Instructor ${t.runId}`, phoneNumber: "0712345678", hireDate: new Date("2025-01-01"), status: AccountStatus.ACTIVE },
  });
  t.instructorUserIds.push(instructorId);

  const daily = await prisma.trainingPackage.findUniqueOrThrow({ where: { id: DAILY_ID }, select: { price: true, isActive: true, updatedAt: true } });
  dailyBefore = { price: daily.price.toFixed(2), isActive: daily.isActive, updatedAt: daily.updatedAt.toISOString() };
});

beforeEach(async () => {
  scope = randomBytes(3).toString("hex");
  seq = 0;
  resetRateLimits();
  packageId = await createLegacyPackageFixture(t);
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

describe("admin registration review", () => {
  describe("authorization", () => {
    it("refuses anonymous requests on every route with 401", async () => {
      const pending = await createPending();
      expect((await listRoute(getRequest("/api/admin/registrations"))).status).toBe(401);
      expect((await detail(pending.id)).status).toBe(401);
      expect((await approve(pending.id)).status).toBe(401);
      expect((await reject(pending.id, { reason: "Documents do not match" })).status).toBe(401);
    });

    it("refuses students and instructors on every route with 403, and changes nothing", async () => {
      const pending = await createPending();
      for (const userId of [studentId, instructorId]) {
        const cookie = await cookieFor(userId);
        expect((await listRoute(getRequest("/api/admin/registrations", cookie))).status).toBe(403);
        expect((await detail(pending.id, cookie)).status).toBe(403);
        expect((await approve(pending.id, cookie)).status).toBe(403);
        expect((await reject(pending.id, { reason: "Documents do not match" }, cookie)).status).toBe(403);
      }
      expect((await prisma.registrationRequest.findUniqueOrThrow({ where: { id: pending.id } })).status).toBe("PENDING");
      expect(await prisma.enrollment.count({ where: { registrationRequestId: pending.id } })).toBe(0);
    });

    it("refuses a cross-site approval even from an admin (403) and creates no account", async () => {
      const pending = await createPending();
      const response = await approve(pending.id, await cookieFor(adminId), "https://evil.example");
      expect(response.status).toBe(403);
      expect(await prisma.user.findUnique({ where: { email: pending.email } })).toBeNull();
    });
  });

  describe("reading applications", () => {
    it("lists pending applications by default, without the password hash", async () => {
      const a = await createPending({ email: fixtureEmail("a") });
      const b = await createPending({ email: fixtureEmail("b") });
      await prisma.registrationRequest.update({
        where: { id: b.id },
        data: { status: "REJECTED", reviewedAt: new Date(), reviewedByUserId: adminId, rejectionReason: "Documents do not match" },
      });

      // The scope token limits the list to this test's applications.
      const response = await listRoute(getRequest(`/api/admin/registrations?q=${scope}`, await cookieFor(adminId)));
      const body = (await response.json()) as { registrations: { email: string }[] };
      expect(response.status).toBe(200);
      expect(body.registrations.map((r) => r.email)).toEqual([a.email]);
      expect(JSON.stringify(body)).not.toContain("passwordHash");
    });

    it("returns 400 for an unknown status filter", async () => {
      const response = await listRoute(getRequest("/api/admin/registrations?status=DELETED", await cookieFor(adminId)));
      expect(response.status).toBe(400);
    });

    it("returns the detail without the password hash, and 404 for unknown or malformed IDs", async () => {
      const pending = await createPending();
      const cookie = await cookieFor(adminId);
      const response = await detail(pending.id, cookie);
      const body = (await response.json()) as { registration: Record<string, unknown> };
      expect(response.status).toBe(200);
      expect(body.registration.referenceNumber).toBe(pending.referenceNumber);
      expect("passwordHash" in body.registration).toBe(false);

      expect((await detail("does-not-exist", cookie)).status).toBe(404);
      expect((await detail("../../etc", cookie)).status).toBe(404);
    });
  });

  describe("approval", () => {
    it("refuses approval of a fallback application before the school confirms the package's counts, and creates nothing", async () => {
      const unconfirmed = await createLegacyPackageFixture(t, { confirmed: false, requiredSessions: null });
      const nicNumber = `NIC-UNC-${scope}`;
      const pending = await createPending({ email: fixtureEmail("unconfirmed"), nicNumber, selectedPackageId: unconfirmed });
      const response = await approveTracked(pending.id, pending.email, await cookieFor(adminId));

      expect(response.status).toBe(422);
      expect(((await response.json()) as { error: string }).error).toBe(UNCONFIRMED_MESSAGE);
      // Refused before any write: no account, profile or enrollment exists, and the application is still pending.
      await expectNothingCreated(pending.id, pending.email, nicNumber);
    });

    it("creates the student account, profile and enrollment, and links the application", async () => {
      const pending = await createPending({ email: fixtureEmail("create") });
      const response = await approveTracked(pending.id, pending.email, await cookieFor(adminId));
      const body = (await response.json()) as { userId: string; enrollmentId: string };

      expect(response.status).toBe(200);
      // The student ID is the next free one, whatever the database already holds.
      expect(body.userId).toMatch(/^STU-\d{3,}$/);

      const user = await prisma.user.findUniqueOrThrow({ where: { userId: body.userId } });
      expect(user.role).toBe(UserRole.STUDENT);
      expect(user.email).toBe(pending.email);
      // The applicant's own password keeps working. Nothing else is stored.
      expect(await verifyPassword(user.passwordHash, APPLICANT_PASSWORD)).toBe(true);

      const profile = await prisma.studentProfile.findUniqueOrThrow({ where: { userId: body.userId } });
      expect(profile.nicNumber).toBe(pending.nicNumber);

      const enrollment = await prisma.enrollment.findUniqueOrThrow({ where: { id: body.enrollmentId } });
      expect(enrollment.studentUserId).toBe(body.userId);
      expect(enrollment.registrationRequestId).toBe(pending.id);
      // The price is the one stored at submission, which is the fixture's price for this package.
      expect(Number(enrollment.agreedPrice)).toBe(pending.packagePriceAtSubmission.toNumber());
      expect(Number(enrollment.finalFee)).toBe(pending.packagePriceAtSubmission.toNumber());

      const reviewed = await prisma.registrationRequest.findUniqueOrThrow({ where: { id: pending.id } });
      expect(reviewed.status).toBe("APPROVED");
      expect(reviewed.approvedStudentUserId).toBe(body.userId);
      expect(reviewed.reviewedByUserId).toBe(adminId);
      expect(reviewed.reviewedAt).not.toBeNull();

      // No payment is recorded at approval.
      expect(await prisma.payment.count({ where: { registrationRequestId: pending.id } })).toBe(0);
    });

    it("lets the approved applicant sign in with the password chosen at signup", async () => {
      const pending = await createPending({ email: fixtureEmail("login") });
      const response = await approveTracked(pending.id, pending.email, await cookieFor(adminId));
      const { userId } = (await response.json()) as { userId: string };

      const login = await studentLogin(postRequest("/api/auth/student/login", { identifier: userId, password: APPLICANT_PASSWORD }));
      expect(login.status).toBe(200);
    });

    it("copies the training requirements from the package", async () => {
      const withTwenty = await createLegacyPackageFixture(t, { requiredSessions: 20 });
      const pending = await createPending({ email: fixtureEmail("requirements"), selectedPackageId: withTwenty });
      const response = await approveTracked(pending.id, pending.email, await cookieFor(adminId));
      const body = (await response.json()) as { enrollmentId: string };

      const requirements = await prisma.enrollmentTrainingRequirement.findMany({ where: { enrollmentId: body.enrollmentId } });
      expect(requirements).toHaveLength(1);
      expect(requirements[0]).toMatchObject({ vehicleType: "CAR", trainingType: "REGULAR", requiredSessions: 20 });
    });

    it("refuses a fallback application for a confirmed package whose session count is still null, and creates nothing", async () => {
      const nullCount = await createLegacyPackageFixture(t, { requiredSessions: null });
      const nicNumber = `NIC-NULL-${scope}`;
      const pending = await createPending({ email: fixtureEmail("null-count"), nicNumber, selectedPackageId: nullCount });
      const response = await approveTracked(pending.id, pending.email, await cookieFor(adminId));

      expect(response.status).toBe(422);
      expect(((await response.json()) as { error: string }).error).toBe(NULL_COUNT_MESSAGE);
      await expectNothingCreated(pending.id, pending.email, nicNumber);
    });

    it("refuses a package with no session-count rows at all, so it cannot create an enrollment with no requirements", async () => {
      const noRows = await createLegacyPackageFixture(t, { withItem: false });
      const nicNumber = `NIC-NONE-${scope}`;
      const pending = await createPending({ email: fixtureEmail("no-rows"), nicNumber, selectedPackageId: noRows });
      const response = await approveTracked(pending.id, pending.email, await cookieFor(adminId));

      expect(response.status).toBe(422);
      expect(((await response.json()) as { error: string }).error).toBe(NO_ROWS_MESSAGE);
      await expectNothingCreated(pending.id, pending.email, nicNumber);
    });

    it("refuses a second approval of the same application with 409, with no duplicate records", async () => {
      const pending = await createPending({ email: fixtureEmail("second") });
      const cookie = await cookieFor(adminId);
      expect((await approveTracked(pending.id, pending.email, cookie)).status).toBe(200);

      const again = await approveTracked(pending.id, pending.email, cookie);
      expect(again.status).toBe(409);
      expect(await prisma.user.count({ where: { email: pending.email } })).toBe(1);
      expect(await prisma.enrollment.count({ where: { registrationRequestId: pending.id } })).toBe(1);
    });

    it("lets only one of two concurrent approvals succeed", async () => {
      const pending = await createPending({ email: fixtureEmail("concurrent") });
      const cookie = await cookieFor(adminId);
      const responses = await Promise.all([
        approveTracked(pending.id, pending.email, cookie),
        approveTracked(pending.id, pending.email, cookie),
      ]);

      expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
      expect(await prisma.user.count({ where: { email: pending.email } })).toBe(1);
      expect(await prisma.enrollment.count({ where: { registrationRequestId: pending.id } })).toBe(1);
    });

    it("refuses a per-session daily package with 422, before creating anything", async () => {
      const email = fixtureEmail("daily");
      const pending = await createPending({ selectedPackageId: DAILY_ID, email });
      const response = await approveTracked(pending.id, email, await cookieFor(adminId));

      expect(response.status).toBe(422);
      expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
      expect(await prisma.enrollment.count({ where: { registrationRequestId: pending.id } })).toBe(0);
      expect((await prisma.registrationRequest.findUniqueOrThrow({ where: { id: pending.id } })).status).toBe("PENDING");
    });

    it("refuses approval when the package was deactivated after submission, and creates nothing", async () => {
      const email = fixtureEmail("retired");
      const nicNumber = `NIC-RET-${scope}`;
      const pending = await createPending({ email, nicNumber });
      await prisma.trainingPackage.update({ where: { id: packageId }, data: { isActive: false } });

      const response = await approveTracked(pending.id, email, await cookieFor(adminId));

      expect(response.status).toBe(422);
      await expectNothingCreated(pending.id, email, nicNumber);
    });

    it("refuses an email that already has an account, without merging", async () => {
      const pending = await createPending({ email: studentEmail });
      const response = await approveTracked(pending.id, studentEmail, await cookieFor(adminId));

      expect(response.status).toBe(409);
      const existing = await prisma.user.findUniqueOrThrow({ where: { email: studentEmail } });
      expect(existing.userId).toBe(studentId);
      expect(await prisma.enrollment.count({ where: { registrationRequestId: pending.id } })).toBe(0);
      expect((await prisma.registrationRequest.findUniqueOrThrow({ where: { id: pending.id } })).status).toBe("PENDING");
    });

    it("refuses a NIC that already has a student profile, without merging", async () => {
      const email = fixtureEmail("nic-owner");
      const pending = await createPending({ nicNumber: studentNic, email });
      const response = await approveTracked(pending.id, email, await cookieFor(adminId));

      expect(response.status).toBe(409);
      expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
      expect(await prisma.enrollment.count({ where: { registrationRequestId: pending.id } })).toBe(0);
    });
  });

  describe("rejection", () => {
    it("rejects a pending application with a reason and creates no account", async () => {
      const pending = await createPending({ email: fixtureEmail("reject") });
      const response = await reject(pending.id, { reason: "  Documents do not match the NIC  " }, await cookieFor(adminId));

      expect(response.status).toBe(200);
      const rejected = await prisma.registrationRequest.findUniqueOrThrow({ where: { id: pending.id } });
      expect(rejected.status).toBe("REJECTED");
      expect(rejected.rejectionReason).toBe("Documents do not match the NIC");
      expect(rejected.reviewedByUserId).toBe(adminId);
      expect(rejected.approvedStudentUserId).toBeNull();
      expect(await prisma.user.findUnique({ where: { email: pending.email } })).toBeNull();
    });

    it("refuses a missing, short or overlong reason with 400", async () => {
      const pending = await createPending();
      const cookie = await cookieFor(adminId);
      expect((await reject(pending.id, {}, cookie)).status).toBe(400);
      expect((await reject(pending.id, { reason: "too short" }, cookie)).status).toBe(400);
      expect((await reject(pending.id, { reason: "x".repeat(501) }, cookie)).status).toBe(400);
      expect((await prisma.registrationRequest.findUniqueOrThrow({ where: { id: pending.id } })).status).toBe("PENDING");
    });

    it("refuses to reject an application that was already reviewed, and blocks approval afterwards", async () => {
      const pending = await createPending({ email: fixtureEmail("reviewed") });
      const cookie = await cookieFor(adminId);
      expect((await reject(pending.id, { reason: "Documents do not match" }, cookie)).status).toBe(200);

      expect((await reject(pending.id, { reason: "Changed my mind again" }, cookie)).status).toBe(409);
      expect((await approveTracked(pending.id, pending.email, cookie)).status).toBe(409);
      expect(await prisma.enrollment.count({ where: { registrationRequestId: pending.id } })).toBe(0);
    });

    it("allows rejecting a per-session application", async () => {
      const pending = await createPending({ selectedPackageId: DAILY_ID, email: fixtureEmail("daily-reject") });
      const response = await reject(pending.id, { reason: "Not offered online yet" }, await cookieFor(adminId));
      expect(response.status).toBe(200);
    });
  });
});
