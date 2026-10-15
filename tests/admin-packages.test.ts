import { beforeEach, describe, expect, it } from "vitest";
import { PATCH } from "@/app/api/admin/packages/[id]/route";
import { POST as registrationPost } from "@/app/api/registration/route";
import { UserRole } from "@/generated/prisma/enums";
import { listPriceChanges, listPackagesForAdmin } from "@/lib/admin/packages";
import { resetRateLimits } from "@/lib/auth/rate-limit";
import { createSession } from "@/lib/auth/session";
import { getPublicPackage, getPublicPackageCatalog } from "@/lib/packages/catalog";
import { prisma } from "@/lib/prisma";
import { getActivePackageIds } from "@/lib/registration/packages";
import { ORIGIN, createAccount, postRequest, resetDatabase } from "./helpers";
import { seedPackagesFromFixture } from "./package-fixtures";

const PACKAGE = "trial-car";
const START_PRICE = "15000.00";

type Edit = { price?: unknown; expectedPrice?: unknown; sortOrder?: unknown; isActive?: unknown };

function edit(overrides: Edit = {}): Record<string, unknown> {
  return { price: "16500", expectedPrice: START_PRICE, sortOrder: 3, isActive: true, ...overrides };
}

/** Calls the PATCH handler as the route would receive it. Pass `origin: null` to send no Origin header. */
function patch(id: string, body: unknown, options: { cookie?: string; origin?: string | null } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (options.origin !== null) headers.origin = options.origin ?? ORIGIN;
  if (options.cookie) headers.cookie = options.cookie;
  const request = new Request(`${ORIGIN}/api/admin/packages/${id}`, {
    method: "PATCH",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return PATCH(request, { params: Promise.resolve({ id }) });
}

async function cookieFor(userId: string) {
  const { token } = await createSession(userId);
  return `riona_session=${token}`;
}

async function priceOf(id: string) {
  return (await prisma.trainingPackage.findUniqueOrThrow({ where: { id } })).price.toFixed(2);
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

describe("authorization", () => {
  it("refuses anonymous, student and instructor requests, and changes nothing", async () => {
    expect((await patch(PACKAGE, edit())).status).toBe(401);
    expect((await patch(PACKAGE, edit(), { cookie: await cookieFor("STU-A") })).status).toBe(403);
    expect((await patch(PACKAGE, edit(), { cookie: await cookieFor("INS-1") })).status).toBe(403);
    expect(await priceOf(PACKAGE)).toBe(START_PRICE);
    expect(await prisma.trainingPackagePriceChange.count()).toBe(0);
  });

  it("refuses a cross-site request even from a signed-in admin", async () => {
    const response = await patch(PACKAGE, edit(), { cookie: await cookieFor("ADMIN-1"), origin: "https://elsewhere.example" });
    expect(response.status).toBe(403);
    expect(await priceOf(PACKAGE)).toBe(START_PRICE);
  });
});

describe("validation", () => {
  it("refuses each malformed field with 400, and writes nothing", async () => {
    const cookie = await cookieFor("ADMIN-1");
    const malformed: Record<string, unknown>[] = [
      edit({ price: "-1" }),
      edit({ price: "16500.123" }),
      edit({ price: "1,650" }),
      edit({ price: "abc" }),
      edit({ price: 16500 }),
      edit({ price: "100000000" }),
      edit({ price: "" }),
      edit({ expectedPrice: undefined }),
      edit({ sortOrder: "3" }),
      edit({ sortOrder: 1.5 }),
      edit({ sortOrder: -1 }),
      edit({ sortOrder: 10000 }),
      edit({ isActive: "yes" }),
    ];
    for (const body of malformed) {
      expect((await patch(PACKAGE, body, { cookie })).status, JSON.stringify(body)).toBe(400);
    }
    expect(await priceOf(PACKAGE)).toBe(START_PRICE);
    expect(await prisma.trainingPackagePriceChange.count()).toBe(0);
  });

  it("accepts the largest amount the price column can hold", async () => {
    const response = await patch(PACKAGE, edit({ price: "99999999.99" }), { cookie: await cookieFor("ADMIN-1") });
    expect(response.status).toBe(200);
    expect(await priceOf(PACKAGE)).toBe("99999999.99");
  });

  it("returns 404 for an unknown package and for a malformed package ID", async () => {
    const cookie = await cookieFor("ADMIN-1");
    expect((await patch("no-such-package", edit(), { cookie })).status).toBe(404);
    expect((await patch("bad.id", edit(), { cookie })).status).toBe(404);
  });
});

describe("stale and simultaneous edits", () => {
  it("refuses a save made from a price that has since changed, and writes nothing", async () => {
    await prisma.trainingPackage.update({ where: { id: PACKAGE }, data: { price: 17000 } });
    const response = await patch(PACKAGE, edit(), { cookie: await cookieFor("ADMIN-1") });
    expect(response.status).toBe(409);
    expect(await priceOf(PACKAGE)).toBe("17000.00");
    expect(await prisma.trainingPackagePriceChange.count()).toBe(0);
  });

  it("lets only one of two simultaneous edits from the same price succeed", async () => {
    const cookie = await cookieFor("ADMIN-1");
    const results = await Promise.all([
      patch(PACKAGE, edit({ price: "16500" }), { cookie }),
      patch(PACKAGE, edit({ price: "17500" }), { cookie }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    expect(await prisma.trainingPackagePriceChange.count()).toBe(1);
  });
});

describe("price history", () => {
  it("records the previous price, the new price and the admin who made the change", async () => {
    const response = await patch(PACKAGE, edit(), { cookie: await cookieFor("ADMIN-1") });
    expect(response.status).toBe(200);
    expect(((await response.json()) as { package: { priceChanged: boolean } }).package.priceChanged).toBe(true);

    const [row] = await prisma.trainingPackagePriceChange.findMany();
    expect(row.packageId).toBe(PACKAGE);
    expect(Number(row.previousPrice)).toBe(15000);
    expect(Number(row.newPrice)).toBe(16500);
    expect(row.changedByUserId).toBe("ADMIN-1");
  });

  it("writes no history row when only the sort order or availability changes", async () => {
    const response = await patch(PACKAGE, edit({ price: "15000", sortOrder: 9, isActive: false }), {
      cookie: await cookieFor("ADMIN-1"),
    });
    expect(response.status).toBe(200);
    expect(await prisma.trainingPackagePriceChange.count()).toBe(0);
    const row = await prisma.trainingPackage.findUniqueOrThrow({ where: { id: PACKAGE } });
    expect(row.sortOrder).toBe(9);
    expect(row.isActive).toBe(false);
  });

  it("shows the change in the admin list and the history list", async () => {
    await patch(PACKAGE, edit(), { cookie: await cookieFor("ADMIN-1") });
    const packages = await listPackagesForAdmin();
    expect(packages.find((item) => item.id === PACKAGE)?.price).toBe("16500.00");
    const changes = await listPriceChanges();
    expect(changes).toEqual([
      expect.objectContaining({ packageName: "Car Trial Preparation", previousPrice: "15000.00", newPrice: "16500.00", changedBy: "ADMIN-1" }),
    ]);
  });

  it("reports the session-count state of each package for the approval check", async () => {
    await prisma.trainingPackageItem.create({
      data: { packageId: PACKAGE, vehicleType: "CAR", trainingType: "TRIAL_PREPARATION", requiredSessions: null },
    });
    const row = (await listPackagesForAdmin()).find((item) => item.id === PACKAGE);
    expect(row?.sessionCounts).toEqual({ rows: 1, missing: 1 });
    expect((await listPackagesForAdmin()).find((item) => item.id === "daily-car")?.sessionCounts).toEqual({ rows: 0, missing: 0 });
  });
});

describe("the change reaches the public site and new applications", () => {
  it("shows the new price in the catalog, and records it on a new application", async () => {
    await patch(PACKAGE, edit(), { cookie: await cookieFor("ADMIN-1") });
    expect((await getPublicPackage(PACKAGE))?.price).toBe(16500);
    expect(
      (await getPublicPackageCatalog()).flatMap((group) => group.options).find((option) => option.id === PACKAGE)?.price,
    ).toBe(16500);

    const response = await registrationPost(postRequest("/api/registration", { ...VALID_REGISTRATION, packageId: PACKAGE }));
    expect(response.status).toBe(201);
    const application = await prisma.registrationRequest.findFirstOrThrow({ where: { selectedPackageId: PACKAGE } });
    expect(Number(application.packagePriceAtSubmission)).toBe(16500);
  });

  it("removes a package from the catalog and from signup when it is turned off", async () => {
    await patch(PACKAGE, edit({ price: "15000", isActive: false }), { cookie: await cookieFor("ADMIN-1") });
    expect(await getPublicPackage(PACKAGE)).toBeNull();
    expect(await getActivePackageIds()).not.toContain(PACKAGE);
  });
});

describe("historical prices are preserved", () => {
  it("applications, enrollments and payments keep the prices they were given when the list price changes", async () => {
    const application = await prisma.registrationRequest.create({
      data: {
        referenceNumber: "RDS-HIST0001",
        fullName: "Historic Student",
        birthday: new Date("2000-01-01"),
        nicNumber: "NIC-HIST-1",
        phoneNumber: "0771111111",
        address: "Colombo",
        email: "historic@riona.test",
        passwordHash: "not-used-in-this-test",
        selectedPackageId: PACKAGE,
        packagePriceAtSubmission: 15000,
      },
    });
    const enrollment = await prisma.enrollment.create({
      data: { studentUserId: "STU-A", packageId: PACKAGE, registrationRequestId: application.id, agreedPrice: 15000, finalFee: 15000 },
    });
    const payment = await prisma.payment.create({
      data: {
        // A payment belongs to exactly one parent (Payment_exactly_one_parent_check), so it is linked to the enrollment.
        enrollmentId: enrollment.id,
        amount: 15000,
        paymentMethod: "BANK_TRANSFER",
        paymentDate: new Date(),
      },
    });

    const response = await patch(PACKAGE, edit({ price: "30000" }), { cookie: await cookieFor("ADMIN-1") });
    expect(response.status).toBe(200);
    expect(await priceOf(PACKAGE)).toBe("30000.00");

    const reloadedApplication = await prisma.registrationRequest.findUniqueOrThrow({ where: { id: application.id } });
    const reloadedEnrollment = await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } });
    const reloadedPayment = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(reloadedApplication.packagePriceAtSubmission.toFixed(2)).toBe("15000.00");
    expect(reloadedEnrollment.agreedPrice.toFixed(2)).toBe("15000.00");
    expect(reloadedEnrollment.finalFee.toFixed(2)).toBe("15000.00");
    expect(reloadedPayment.amount.toFixed(2)).toBe("15000.00");
  });
});
