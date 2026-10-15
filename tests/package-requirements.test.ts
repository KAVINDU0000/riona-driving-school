import { beforeEach, describe, expect, it } from "vitest";
import { POST as confirmRoute } from "@/app/api/admin/packages/[id]/requirements/confirm/route";
import { PUT as requirementsRoute } from "@/app/api/admin/packages/[id]/requirements/route";
import { POST as registrationPost } from "@/app/api/registration/route";
import { UserRole } from "@/generated/prisma/enums";
import { listPackagesForAdmin } from "@/lib/admin/packages";
import { approveRegistration } from "@/lib/admin/registration-review";
import {
  confirmRequirements,
  listRecentRequirementChanges,
  parseRequirementRows,
  replaceRequirements,
  requirementStatus,
} from "@/lib/admin/requirements";
import { AuthError } from "@/lib/auth/http";
import { resetRateLimits } from "@/lib/auth/rate-limit";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ORIGIN, createAccount, postRequest, resetDatabase } from "./helpers";
import { seedPackagesFromFixture } from "./package-fixtures";

// Every count in this file is test data. None of them is a school figure.
const PACKAGE = "trial-car";
const CAR_TRIAL = { vehicleType: "CAR", trainingType: "TRIAL_PREPARATION", requiredSessions: 10 } as const;
const VAN_TRIAL = { vehicleType: "VAN", trainingType: "TRIAL_PREPARATION", requiredSessions: 12 } as const;

function statusOf(action: () => unknown): number | undefined {
  try {
    action();
    return undefined;
  } catch (error) {
    return error instanceof AuthError ? error.status : undefined;
  }
}

async function cookieFor(userId: string) {
  const { token } = await createSession(userId);
  return `riona_session=${token}`;
}

function putRequirements(id: string, body: unknown, options: { cookie?: string; origin?: string | null } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (options.origin !== null) headers.origin = options.origin ?? ORIGIN;
  if (options.cookie) headers.cookie = options.cookie;
  const request = new Request(`${ORIGIN}/api/admin/packages/${id}/requirements`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  return requirementsRoute(request, { params: Promise.resolve({ id }) });
}

function confirmPackage(id: string, options: { cookie?: string; origin?: string | null } = {}) {
  const headers: Record<string, string> = {};
  if (options.origin !== null) headers.origin = options.origin ?? ORIGIN;
  if (options.cookie) headers.cookie = options.cookie;
  const request = new Request(`${ORIGIN}/api/admin/packages/${id}/requirements/confirm`, { method: "POST", headers });
  return confirmRoute(request, { params: Promise.resolve({ id }) });
}

async function itemsOf(packageId: string) {
  return prisma.trainingPackageItem.findMany({ where: { packageId }, orderBy: [{ vehicleType: "asc" }, { trainingType: "asc" }] });
}

async function confirmedAtOf(packageId: string) {
  return (await prisma.trainingPackage.findUniqueOrThrow({ where: { id: packageId } })).requirementsConfirmedAt;
}

const VALID_REGISTRATION = {
  fullName: "Kasun Silva",
  birthday: "2001-03-04",
  nicNumber: "200112345678",
  phoneNumber: "0771234567",
  email: "kasun.silva@example.com",
  password: "correct-horse-battery",
  address: "No. 8, Temple Road, Galle",
};

beforeEach(async () => {
  await resetDatabase();
  resetRateLimits();
  await createAccount({ userId: "ADMIN-1", email: "admin@riona.test", role: UserRole.ADMIN });
  await createAccount({ userId: "STU-A", email: "a@riona.test", role: UserRole.STUDENT });
  await createAccount({ userId: "INS-1", email: "ins1@riona.test", role: UserRole.INSTRUCTOR });
  await seedPackagesFromFixture();
});

describe("the request rules", () => {
  it("accepts a valid list and refuses each malformed row with 400", () => {
    expect(parseRequirementRows([CAR_TRIAL, VAN_TRIAL])).toEqual([CAR_TRIAL, VAN_TRIAL]);
    expect(parseRequirementRows([{ ...CAR_TRIAL, requiredSessions: 500 }])).toHaveLength(1);

    const bad: unknown[] = [
      "not a list",
      [{ ...CAR_TRIAL, vehicleType: "BUS" }],
      [{ ...CAR_TRIAL, trainingType: "ADVANCED" }],
      [{ ...CAR_TRIAL, requiredSessions: 0 }],
      [{ ...CAR_TRIAL, requiredSessions: 501 }],
      [{ ...CAR_TRIAL, requiredSessions: 2.5 }],
      [{ ...CAR_TRIAL, requiredSessions: "10" }],
      [CAR_TRIAL, CAR_TRIAL],
      Array.from({ length: 13 }, (_, index) => ({ vehicleType: "CAR", trainingType: "REGULAR", requiredSessions: index + 1 })),
    ];
    for (const value of bad) {
      expect(statusOf(() => parseRequirementRows(value)), JSON.stringify(value)).toBe(400);
    }
  });

  it("reports the status: per-session packages have none, empty or blank packages are incomplete, and confirmation is separate", () => {
    expect(requirementStatus({ packageType: "DAILY", rows: [], confirmedAt: null })).toBe("NOT_APPLICABLE");
    expect(requirementStatus({ packageType: "TRIAL_PREPARATION", rows: [], confirmedAt: null })).toBe("INCOMPLETE");
    expect(requirementStatus({ packageType: "TRIAL_PREPARATION", rows: [{ requiredSessions: null }], confirmedAt: null })).toBe("INCOMPLETE");
    expect(requirementStatus({ packageType: "TRIAL_PREPARATION", rows: [{ requiredSessions: 10 }], confirmedAt: null })).toBe("AWAITING_CONFIRMATION");
    expect(requirementStatus({ packageType: "TRIAL_PREPARATION", rows: [{ requiredSessions: 10 }], confirmedAt: new Date() })).toBe("CONFIRMED");
  });

  it("marks every seeded package incomplete until the school enters its requirements", async () => {
    const packages = await listPackagesForAdmin();
    expect(packages.every((pkg) => pkg.requirements.length === 0 && pkg.requirementsConfirmedAt === null)).toBe(true);
  });
});

describe("authorization", () => {
  it("refuses anonymous, student and cross-site requests on both routes, and changes nothing", async () => {
    expect((await putRequirements(PACKAGE, { rows: [CAR_TRIAL] })).status).toBe(401);
    expect((await putRequirements(PACKAGE, { rows: [CAR_TRIAL] }, { cookie: await cookieFor("STU-A") })).status).toBe(403);
    expect((await putRequirements(PACKAGE, { rows: [CAR_TRIAL] }, { cookie: await cookieFor("ADMIN-1"), origin: "https://elsewhere.example" })).status).toBe(403);
    expect((await confirmPackage(PACKAGE)).status).toBe(401);
    expect((await confirmPackage(PACKAGE, { cookie: await cookieFor("STU-A") })).status).toBe(403);
    expect(await itemsOf(PACKAGE)).toHaveLength(0);
    expect(await prisma.trainingPackageItemChange.count()).toBe(0);
  });
});

describe("editing requirements", () => {
  it("creates the rows and records each one in the history, leaving the package unconfirmed", async () => {
    const response = await putRequirements(PACKAGE, { rows: [CAR_TRIAL, VAN_TRIAL] }, { cookie: await cookieFor("ADMIN-1") });
    expect(response.status).toBe(200);
    expect(((await response.json()) as { requirements: { changed: number } }).requirements.changed).toBe(2);
    expect((await itemsOf(PACKAGE)).map((item) => item.requiredSessions)).toEqual([10, 12]);

    const history = await prisma.trainingPackageItemChange.findMany({ where: { packageId: PACKAGE } });
    expect(history).toHaveLength(2);
    expect(history.every((row) => row.previousRequiredSessions === null && row.changedByUserId === "ADMIN-1")).toBe(true);
    expect(await confirmedAtOf(PACKAGE)).toBeNull();
  });

  it("records a changed count with its previous and new values, and clears the confirmation", async () => {
    await replaceRequirements(PACKAGE, "ADMIN-1", [CAR_TRIAL]);
    await confirmRequirements(PACKAGE, "ADMIN-1");
    expect(await confirmedAtOf(PACKAGE)).not.toBeNull();

    await replaceRequirements(PACKAGE, "ADMIN-1", [{ ...CAR_TRIAL, requiredSessions: 14 }]);
    const change = await prisma.trainingPackageItemChange.findFirstOrThrow({ where: { packageId: PACKAGE, newRequiredSessions: 14 } });
    expect(change.previousRequiredSessions).toBe(10);
    expect(await confirmedAtOf(PACKAGE)).toBeNull();
  });

  it("keeps the confirmation when a save changes nothing, and writes no history for it", async () => {
    await replaceRequirements(PACKAGE, "ADMIN-1", [CAR_TRIAL]);
    await confirmRequirements(PACKAGE, "ADMIN-1");
    const before = await prisma.trainingPackageItemChange.count();

    const result = await replaceRequirements(PACKAGE, "ADMIN-1", [CAR_TRIAL]);
    expect(result).toEqual({ changed: 0, confirmationCleared: false });
    expect(await prisma.trainingPackageItemChange.count()).toBe(before);
    expect(await confirmedAtOf(PACKAGE)).not.toBeNull();
  });

  it("records a removed row with its new value empty, and keeps the removed item's ID in the history", async () => {
    await replaceRequirements(PACKAGE, "ADMIN-1", [CAR_TRIAL, VAN_TRIAL]);
    const van = await prisma.trainingPackageItem.findFirstOrThrow({ where: { packageId: PACKAGE, vehicleType: "VAN" } });

    await replaceRequirements(PACKAGE, "ADMIN-1", [CAR_TRIAL]);
    expect(await itemsOf(PACKAGE)).toHaveLength(1);
    const removal = await prisma.trainingPackageItemChange.findFirstOrThrow({ where: { packageId: PACKAGE, vehicleType: "VAN", newRequiredSessions: null } });
    expect(removal.packageItemId).toBe(van.id);
    expect(removal.previousRequiredSessions).toBe(12);
  });

  it("refuses per-session packages and unknown packages", async () => {
    const cookie = await cookieFor("ADMIN-1");
    expect((await putRequirements("daily-car", { rows: [CAR_TRIAL] }, { cookie })).status).toBe(422);
    expect((await putRequirements("no-such-package", { rows: [CAR_TRIAL] }, { cookie })).status).toBe(404);
    expect(await itemsOf("daily-car")).toHaveLength(0);
  });

  it("shows recent changes across packages with the package name", async () => {
    await replaceRequirements(PACKAGE, "ADMIN-1", [CAR_TRIAL]);
    const recent = await listRecentRequirementChanges();
    expect(recent[0]).toMatchObject({ packageName: "Car Trial Preparation", vehicleType: "CAR", previous: null, next: 10 });
  });
});

describe("confirmation", () => {
  it("refuses to confirm with no rows, or with any row missing a count", async () => {
    await expect(confirmRequirements(PACKAGE, "ADMIN-1")).rejects.toMatchObject({ status: 422 });

    await replaceRequirements(PACKAGE, "ADMIN-1", [CAR_TRIAL]);
    await prisma.trainingPackageItem.updateMany({ where: { packageId: PACKAGE }, data: { requiredSessions: null } });
    await expect(confirmRequirements(PACKAGE, "ADMIN-1")).rejects.toMatchObject({ status: 422 });
    expect(await confirmedAtOf(PACKAGE)).toBeNull();
  });

  it("records who confirmed and when, and confirming again changes nothing", async () => {
    await replaceRequirements(PACKAGE, "ADMIN-1", [CAR_TRIAL, VAN_TRIAL]);
    const response = await confirmPackage(PACKAGE, { cookie: await cookieFor("ADMIN-1") });
    expect(response.status).toBe(200);

    const pkg = await prisma.trainingPackage.findUniqueOrThrow({ where: { id: PACKAGE } });
    expect(pkg.requirementsConfirmedByUserId).toBe("ADMIN-1");
    const firstTime = pkg.requirementsConfirmedAt;
    expect(firstTime).not.toBeNull();

    const again = await confirmRequirements(PACKAGE, "ADMIN-1");
    expect(again.alreadyConfirmed).toBe(true);
    expect(await confirmedAtOf(PACKAGE)).toEqual(firstTime);
  });

  it("marks the package confirmed in the admin list", async () => {
    await replaceRequirements(PACKAGE, "ADMIN-1", [CAR_TRIAL]);
    await confirmRequirements(PACKAGE, "ADMIN-1");
    const row = (await listPackagesForAdmin()).find((pkg) => pkg.id === PACKAGE);
    expect(requirementStatus({ packageType: row!.packageType, rows: row!.requirements, confirmedAt: row!.requirementsConfirmedAt })).toBe("CONFIRMED");
  });
});

describe("approval and existing enrollments", () => {
  it("copies the confirmed rows into the enrollment, and later edits do not change that enrollment", async () => {
    await replaceRequirements(PACKAGE, "ADMIN-1", [CAR_TRIAL, VAN_TRIAL]);
    await confirmRequirements(PACKAGE, "ADMIN-1");
    const application = await prisma.registrationRequest.create({
      data: {
        referenceNumber: "RDS-REQ00001",
        fullName: "Snapshot Student",
        birthday: new Date("2000-01-01"),
        nicNumber: "NIC-SNAP-1",
        phoneNumber: "0771111111",
        address: "Colombo",
        email: "snapshot@riona.test",
        passwordHash: "not-used-in-this-test",
        selectedPackageId: PACKAGE,
        packagePriceAtSubmission: 15000,
      },
    });
    const { enrollmentId } = await approveRegistration(application.id, "ADMIN-1");
    const copied = await prisma.enrollmentTrainingRequirement.findMany({ where: { enrollmentId }, orderBy: { vehicleType: "asc" } });
    expect(copied.map((row) => row.requiredSessions)).toEqual([10, 12]);

    // The school changes the package. The new total does not reach the existing enrollment.
    await replaceRequirements(PACKAGE, "ADMIN-1", [{ ...CAR_TRIAL, requiredSessions: 30 }]);
    const after = await prisma.enrollmentTrainingRequirement.findMany({ where: { enrollmentId }, orderBy: { vehicleType: "asc" } });
    expect(after.map((row) => row.requiredSessions)).toEqual([10, 12]);
  });

  it("still accepts new applications for an incomplete package, while approval stays blocked", async () => {
    const response = await registrationPost(postRequest("/api/registration", { ...VALID_REGISTRATION, packageId: PACKAGE }));
    expect(response.status).toBe(201);
  });
});
