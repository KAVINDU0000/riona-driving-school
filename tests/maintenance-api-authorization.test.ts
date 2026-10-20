// Database-backed. Administrator-only maintenance routes: 401 without a valid session, 403 for other roles and cross-site writes,
// 200 for an administrator. Runs only on the guarded disposable target (see tests/setup.ts). Resets the test tables first.
import { beforeAll, describe, expect, it } from "vitest";
import { AccountStatus, VehicleStatus } from "@/generated/prisma/enums";
import { UserRole } from "@/generated/prisma/enums";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { GET as overviewGet } from "@/app/api/admin/vehicles/[vehicleId]/maintenance/route";
import { POST as insurancePost } from "@/app/api/admin/vehicles/[vehicleId]/maintenance/insurance/route";
import { DELETE as documentDelete } from "@/app/api/admin/vehicles/[vehicleId]/maintenance/documents/[documentId]/route";
import { createAccount, resetDatabase, ORIGIN } from "./helpers";

const ADMIN = "ADMIN-AUTH";
const STUDENT = "STU-AUTH";
const INSTRUCTOR = "INS-AUTH";
const INACTIVE_ADMIN = "ADMIN-OFF";
let vehicleId = "";

async function cookieFor(userId: string) {
  const { token } = await createSession(userId);
  return `riona_session=${token}`;
}

function insuranceBody() {
  return JSON.stringify({ insurer: "Fixture", policyNumber: "AUTH-POL", coverage: "Comprehensive", startsOn: "2026-01-01", expiresOn: "2026-12-31", premium: 1000 });
}

function request(path: string, init: { method: string; cookie?: string; origin?: string | null; body?: string }) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (init.origin !== null) headers.origin = init.origin ?? ORIGIN;
  if (init.cookie) headers.cookie = init.cookie;
  return new Request(`${ORIGIN}${path}`, { method: init.method, headers, body: init.body });
}

const overviewPath = () => `/api/admin/vehicles/${vehicleId}/maintenance`;
const context = () => ({ params: Promise.resolve({ vehicleId }) });

beforeAll(async () => {
  await resetDatabase();
  await createAccount({ userId: ADMIN, email: "admin-auth@riona.test", role: UserRole.ADMIN });
  await createAccount({ userId: STUDENT, email: "stu-auth@riona.test", role: UserRole.STUDENT });
  await createAccount({ userId: INSTRUCTOR, email: "ins-auth@riona.test", role: UserRole.INSTRUCTOR });
  await createAccount({ userId: INACTIVE_ADMIN, email: "off-auth@riona.test", role: UserRole.ADMIN, status: AccountStatus.INACTIVE });
  const vehicle = await prisma.vehicle.create({ data: { registrationNumber: "AUTH-0001", vehicleType: "CAR", status: VehicleStatus.ACTIVE }, select: { id: true } });
  vehicleId = vehicle.id;
});

describe("maintenance routes: who may call them", () => {
  it("refuses the overview with no session (401)", async () => {
    const response = await overviewGet(request(overviewPath(), { method: "GET" }), context());
    expect(response.status).toBe(401);
  });

  it("refuses the overview for a session of an inactive administrator (401)", async () => {
    const response = await overviewGet(request(overviewPath(), { method: "GET", cookie: await cookieFor(INACTIVE_ADMIN) }), context());
    expect(response.status).toBe(401);
  });

  it("refuses the overview to a student (403)", async () => {
    const response = await overviewGet(request(overviewPath(), { method: "GET", cookie: await cookieFor(STUDENT) }), context());
    expect(response.status).toBe(403);
  });

  it("refuses the overview to an instructor (403)", async () => {
    const response = await overviewGet(request(overviewPath(), { method: "GET", cookie: await cookieFor(INSTRUCTOR) }), context());
    expect(response.status).toBe(403);
  });

  it("lets an administrator read the overview and history (200)", async () => {
    const response = await overviewGet(request(overviewPath(), { method: "GET", cookie: await cookieFor(ADMIN) }), context());
    expect(response.status).toBe(200);
    const body = (await response.json()) as { overview: { vehicle: { registrationNumber: string } }; history: unknown };
    expect(body.overview.vehicle.registrationNumber).toBe("AUTH-0001");
    expect(body.history).toBeDefined();
  });

  it("returns 404 for an unknown vehicle to an administrator", async () => {
    const response = await overviewGet(
      request(`/api/admin/vehicles/missing/maintenance`, { method: "GET", cookie: await cookieFor(ADMIN) }),
      { params: Promise.resolve({ vehicleId: "missing-vehicle" }) },
    );
    expect(response.status).toBe(404);
  });
});

describe("maintenance writes: who may change records", () => {
  it("refuses a student's insurance write (403) and writes no row", async () => {
    const response = await insurancePost(
      request(`/api/admin/vehicles/${vehicleId}/maintenance/insurance`, { method: "POST", cookie: await cookieFor(STUDENT), body: insuranceBody() }),
      context(),
    );
    expect(response.status).toBe(403);
    expect(await prisma.vehicleInsurancePolicy.count({ where: { vehicleId } })).toBe(0);
  });

  it("refuses an administrator's write that comes from another site (403) and writes no row", async () => {
    const response = await insurancePost(
      request(`/api/admin/vehicles/${vehicleId}/maintenance/insurance`, {
        method: "POST",
        cookie: await cookieFor(ADMIN),
        origin: "https://attacker.example",
        body: insuranceBody(),
      }),
      context(),
    );
    expect(response.status).toBe(403);
    expect(await prisma.vehicleInsurancePolicy.count({ where: { vehicleId } })).toBe(0);
  });

  it("lets an administrator record an insurance period (201)", async () => {
    const response = await insurancePost(
      request(`/api/admin/vehicles/${vehicleId}/maintenance/insurance`, { method: "POST", cookie: await cookieFor(ADMIN), body: insuranceBody() }),
      context(),
    );
    expect(response.status).toBe(201);
    expect(await prisma.vehicleInsurancePolicy.count({ where: { vehicleId } })).toBe(1);
  });

  it("refuses a student's document removal (403)", async () => {
    const response = await documentDelete(
      request(`/api/admin/vehicles/${vehicleId}/maintenance/documents/any`, {
        method: "DELETE",
        cookie: await cookieFor(STUDENT),
        body: JSON.stringify({ reason: "x" }),
      }),
      { params: Promise.resolve({ vehicleId, documentId: "any" }) },
    );
    expect(response.status).toBe(403);
  });
});
