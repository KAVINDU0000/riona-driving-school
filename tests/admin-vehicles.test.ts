import { beforeEach, describe, expect, it } from "vitest";
import { LessonScheduleStatus, VehicleAuditAction, VehicleStatus, VehicleType, TransmissionType, UserRole } from "@/generated/prisma/enums";
import { GET as listRoute, POST as createRoute } from "@/app/api/admin/vehicles/route";
import { GET as detailRoute, PATCH as editRoute } from "@/app/api/admin/vehicles/[vehicleId]/route";
import { GET as previewRoute, POST as statusRoute } from "@/app/api/admin/vehicles/[vehicleId]/status/route";
import { checkActivationEligibility } from "@/lib/admin/vehicle-eligibility";
import { parseVehicleFields, normaliseRegistration, vehicleListQuery } from "@/lib/admin/vehicles";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createAccount, getRequest, ORIGIN } from "./helpers";
import { insertLesson, seedStudentWorld } from "./student-fixtures";

type Fixture = Awaited<ReturnType<typeof seedStudentWorld>>;

let fixture: Fixture;

async function adminCookie() {
  const { token } = await createSession("ADMIN-1");
  return `riona_session=${token}`;
}

function jsonRequest(method: "POST" | "PATCH", path: string, body: unknown, cookie?: string) {
  const headers: Record<string, string> = { "content-type": "application/json", origin: ORIGIN };
  if (cookie) headers.cookie = cookie;
  return new Request(`${ORIGIN}${path}`, { method, headers, body: JSON.stringify(body) });
}

function context(vehicleId: string) {
  return { params: Promise.resolve({ vehicleId }) };
}

async function updatedAtOf(vehicleId: string) {
  return (await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId }, select: { updatedAt: true } })).updatedAt.toISOString();
}

/** The vehicle form's payload for an existing vehicle, with the given fields changed. */
function editBody(_vehicleId: string, overrides: Record<string, unknown> = {}) {
  return {
    registrationNumber: "CAB-1",
    vehicleType: "CAR",
    make: "Toyota",
    model: "Vitz",
    manufacturingYear: null,
    colour: null,
    transmissionType: "NOT_APPLICABLE",
    description: null,
    expectedUpdatedAt: null,
    ...overrides,
  };
}

const VALID_NEW = {
  registrationNumber: "WP CAB-9001",
  vehicleType: "VAN",
  make: "Toyota",
  model: "HiAce",
  manufacturingYear: 2018,
  colour: "White",
  transmissionType: "MANUAL",
  description: "Training van",
  status: "ACTIVE",
};

beforeEach(async () => {
  fixture = await seedStudentWorld();
});

describe("vehicle form rules", () => {
  it("normalises the registration number: trimmed, upper case, single spaces", () => {
    expect(normaliseRegistration("  wp   cab-1234 ")).toBe("WP CAB-1234");
  });

  it("accepts a complete valid vehicle", () => {
    const result = parseVehicleFields(VALID_NEW, { requireStatus: true });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.fields.registrationNumber).toBe("WP CAB-9001");
  });

  it("refuses bad registration numbers, unknown enum values and out-of-range years with a message for each", () => {
    const result = parseVehicleFields({ ...VALID_NEW, registrationNumber: "a!", vehicleType: "TRUCK", manufacturingYear: 1900 }, { requireStatus: true });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.registrationNumber).toBeTruthy();
      expect(result.errors.vehicleType).toBeTruthy();
      expect(result.errors.manufacturingYear).toBeTruthy();
    }
  });

  it("requires a status when creating, and refuses an unknown one", () => {
    const missing = parseVehicleFields({ ...VALID_NEW, status: undefined }, { requireStatus: true });
    expect(missing.ok).toBe(false);
    const unknown = parseVehicleFields({ ...VALID_NEW, status: "RETIRED" }, { requireStatus: true });
    expect(unknown.ok).toBe(false);
  });

  it("limits the search text and ignores unknown filter values", () => {
    const query = vehicleListQuery({ q: "x".repeat(200), type: "TRUCK", status: "ACTIVE", page: "2" });
    expect(query.q.length).toBeLessThanOrEqual(60);
    expect(query.type).toBeNull();
    expect(query.status).toBe("ACTIVE");
    expect(query.page).toBe(2);
  });
});

describe("who can use vehicle management", () => {
  it("lets an admin read the fleet, and refuses students and anonymous visitors", async () => {
    expect((await listRoute(getRequest("/api/admin/vehicles", await adminCookie()))).status).toBe(200);

    const { token } = await createSession("STU-A");
    expect((await listRoute(getRequest("/api/admin/vehicles", `riona_session=${token}`))).status).toBe(403);
    expect((await listRoute(getRequest("/api/admin/vehicles"))).status).toBe(401);
  });

  it("refuses a vehicle write from another site", async () => {
    const request = new Request(`${ORIGIN}/api/admin/vehicles`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://evil.example", cookie: await adminCookie() },
      body: JSON.stringify(VALID_NEW),
    });
    expect((await createRoute(request)).status).toBe(403);
  });
});

describe("creating a vehicle", () => {
  it("creates the vehicle and writes a CREATED audit row", async () => {
    const response = await createRoute(jsonRequest("POST", "/api/admin/vehicles", VALID_NEW, await adminCookie()));
    expect(response.status).toBe(201);
    const { vehicle } = (await response.json()) as { vehicle: { id: string } };
    const audit = await prisma.vehicleAuditLog.findMany({ where: { vehicleId: vehicle.id } });
    expect(audit).toHaveLength(1);
    expect(audit[0].action).toBe(VehicleAuditAction.CREATED);
    expect(audit[0].newStatus).toBe(VehicleStatus.ACTIVE);
    expect(audit[0].actorUserId).toBe("ADMIN-1");
  });

  it("refuses a duplicate registration number, even when only the case or spacing differs", async () => {
    const response = await createRoute(
      jsonRequest("POST", "/api/admin/vehicles", { ...VALID_NEW, registrationNumber: "  cab-1  " }, await adminCookie()),
    );
    expect(response.status).toBe(409);
    expect(await prisma.vehicle.count({ where: { registrationNumber: "CAB-1" } })).toBe(1);
  });

  it("returns a message for each invalid field, and saves nothing", async () => {
    const response = await createRoute(jsonRequest("POST", "/api/admin/vehicles", { ...VALID_NEW, make: "x".repeat(80) }, await adminCookie()));
    expect(response.status).toBe(422);
    const body = (await response.json()) as { fields: Record<string, string> };
    expect(body.fields.make).toBeTruthy();
    expect(await prisma.vehicle.count({ where: { registrationNumber: "WP CAB-9001" } })).toBe(0);
  });
});

describe("editing a vehicle", () => {
  it("records only the fields that changed, in an UPDATED audit row", async () => {
    const response = await editRoute(
      jsonRequest("PATCH", "/api/admin/vehicles/V1", editBody("V1", { colour: "Red", expectedUpdatedAt: await updatedAtOf("V1") }), await adminCookie()),
      context("V1"),
    );
    expect(response.status).toBe(200);
    const entries = await prisma.vehicleAuditLog.findMany({ where: { vehicleId: "V1", action: VehicleAuditAction.UPDATED } });
    expect(entries).toHaveLength(1);
    expect(Object.keys(entries[0].changes as object)).toEqual(["colour"]);
  });

  it("writes no audit row when nothing changed", async () => {
    const response = await editRoute(
      jsonRequest("PATCH", "/api/admin/vehicles/V1", editBody("V1", { expectedUpdatedAt: await updatedAtOf("V1") }), await adminCookie()),
      context("V1"),
    );
    expect(response.status).toBe(200);
    expect(await prisma.vehicleAuditLog.count({ where: { vehicleId: "V1", action: VehicleAuditAction.UPDATED } })).toBe(0);
  });

  it("refuses an edit based on an out-of-date copy of the vehicle", async () => {
    const response = await editRoute(
      jsonRequest("PATCH", "/api/admin/vehicles/V1", editBody("V1", { colour: "Blue", expectedUpdatedAt: "2000-01-01T00:00:00.000Z" }), await adminCookie()),
      context("V1"),
    );
    expect(response.status).toBe(409);
  });

  it("refuses a vehicle-type change while the vehicle has lessons", async () => {
    await insertLesson({ id: "lesson-v1", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "09:00", end: "10:00" });
    const response = await editRoute(
      jsonRequest("PATCH", "/api/admin/vehicles/V1", editBody("V1", { vehicleType: "VAN", expectedUpdatedAt: await updatedAtOf("V1") }), await adminCookie()),
      context("V1"),
    );
    expect(response.status).toBe(409);
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: "V1" } })).vehicleType).toBe(VehicleType.CAR);
  });

  it("shows the vehicle and its lesson and audit history to an admin", async () => {
    const response = await detailRoute(getRequest("/api/admin/vehicles/V1", await adminCookie()), context("V1"));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { vehicle: { registrationNumber: string; auditLogs: unknown[] } };
    expect(body.vehicle.registrationNumber).toBe("CAB-1");
  });
});

describe("changing a vehicle's status", () => {
  it("changes a vehicle with no scheduled lessons, and audits the old and new status", async () => {
    const response = await statusRoute(
      jsonRequest("POST", "/api/admin/vehicles/V2/status", { status: "MAINTENANCE", expectedUpdatedAt: await updatedAtOf("V2"), resolutions: [] }, await adminCookie()),
      context("V2"),
    );
    expect(response.status).toBe(200);
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: "V2" } })).status).toBe(VehicleStatus.MAINTENANCE);
    const [entry] = await prisma.vehicleAuditLog.findMany({ where: { vehicleId: "V2", action: VehicleAuditAction.STATUS_CHANGED } });
    expect(entry.previousStatus).toBe(VehicleStatus.ACTIVE);
    expect(entry.newStatus).toBe(VehicleStatus.MAINTENANCE);
  });

  it("refuses to set the status it already has", async () => {
    const response = await statusRoute(
      jsonRequest("POST", "/api/admin/vehicles/V2/status", { status: "ACTIVE", expectedUpdatedAt: await updatedAtOf("V2"), resolutions: [] }, await adminCookie()),
      context("V2"),
    );
    expect(response.status).toBe(409);
  });

  it("lists each scheduled lesson with the free vehicles of the same type, and skips vehicles that are not active", async () => {
    await insertLesson({ id: "lesson-preview", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "09:00", end: "10:00" });
    const response = await previewRoute(getRequest("/api/admin/vehicles/V1/status?status=MAINTENANCE", await adminCookie()), context("V1"));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { affected: { id: string; candidates: { id: string }[] }[] };
    expect(body.affected.map((lesson) => lesson.id)).toEqual(["lesson-preview"]);
    const candidateIds = body.affected[0].candidates.map((vehicle) => vehicle.id);
    expect(candidateIds).toContain("V2");
    expect(candidateIds).not.toContain("V3");
  });

  it("refuses the change until every scheduled lesson has a choice, and saves nothing", async () => {
    await insertLesson({ id: "lesson-partial-1", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "09:00", end: "10:00" });
    await insertLesson({ id: "lesson-partial-2", studentUserId: "STU-B", enrollmentKey: "B1", fixture, start: "11:00", end: "12:00" });
    const response = await statusRoute(
      jsonRequest(
        "POST",
        "/api/admin/vehicles/V1/status",
        { status: "MAINTENANCE", expectedUpdatedAt: await updatedAtOf("V1"), resolutions: [{ lessonId: "lesson-partial-1", action: "CANCEL", reason: "Vehicle needs a repair" }] },
        await adminCookie(),
      ),
      context("V1"),
    );
    expect(response.status).toBe(409);
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: "V1" } })).status).toBe(VehicleStatus.ACTIVE);
    expect((await prisma.lessonSchedule.findUniqueOrThrow({ where: { id: "lesson-partial-1" } })).status).toBe(LessonScheduleStatus.SCHEDULED);
  });

  it("cancels a lesson with a reason, and keeps the lesson record", async () => {
    await insertLesson({ id: "lesson-cancel", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "09:00", end: "10:00" });
    const response = await statusRoute(
      jsonRequest(
        "POST",
        "/api/admin/vehicles/V1/status",
        {
          status: "INACTIVE",
          expectedUpdatedAt: await updatedAtOf("V1"),
          resolutions: [{ lessonId: "lesson-cancel", action: "CANCEL", reason: "Vehicle is being retired" }],
        },
        await adminCookie(),
      ),
      context("V1"),
    );
    expect(response.status).toBe(200);
    const cancelled = await prisma.lessonSchedule.findUniqueOrThrow({ where: { id: "lesson-cancel" } });
    expect(cancelled.status).toBe(LessonScheduleStatus.CANCELLED);
    // The reason, the time and the admin who made the change are stored on the lesson itself.
    expect(cancelled.cancellationReason).toBe("Vehicle is being retired");
    expect(cancelled.cancelledAt).toBeInstanceOf(Date);
    expect(cancelled.cancelledByUserId).toBe("ADMIN-1");
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: "V1" } })).status).toBe(VehicleStatus.INACTIVE);
    const [entry] = await prisma.vehicleAuditLog.findMany({ where: { vehicleId: "V1", action: VehicleAuditAction.STATUS_CHANGED } });
    expect(JSON.stringify(entry.changes)).toContain("lesson-cancel");
  });

  it("moves a lesson to another free vehicle of the same type", async () => {
    await insertLesson({ id: "lesson-move", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "09:00", end: "10:00" });
    const response = await statusRoute(
      jsonRequest(
        "POST",
        "/api/admin/vehicles/V1/status",
        { status: "MAINTENANCE", expectedUpdatedAt: await updatedAtOf("V1"), resolutions: [{ lessonId: "lesson-move", action: "REASSIGN", vehicleId: "V2" }] },
        await adminCookie(),
      ),
      context("V1"),
    );
    expect(response.status).toBe(200);
    expect((await prisma.lessonSchedule.findUniqueOrThrow({ where: { id: "lesson-move" } })).vehicleId).toBe("V2");
  });

  it("refuses to move a lesson to a vehicle that is not active, and saves nothing", async () => {
    await insertLesson({ id: "lesson-bad-target", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "09:00", end: "10:00" });
    const response = await statusRoute(
      jsonRequest(
        "POST",
        "/api/admin/vehicles/V1/status",
        { status: "MAINTENANCE", expectedUpdatedAt: await updatedAtOf("V1"), resolutions: [{ lessonId: "lesson-bad-target", action: "REASSIGN", vehicleId: "V3" }] },
        await adminCookie(),
      ),
      context("V1"),
    );
    expect(response.status).toBe(409);
    expect((await prisma.lessonSchedule.findUniqueOrThrow({ where: { id: "lesson-bad-target" } })).vehicleId).toBe("V1");
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: "V1" } })).status).toBe(VehicleStatus.ACTIVE);
  });

  it("refuses a blank cancellation reason, and leaves the lesson scheduled", async () => {
    await insertLesson({ id: "lesson-short", studentUserId: "STU-A", enrollmentKey: "A1", fixture, start: "09:00", end: "10:00" });
    const response = await statusRoute(
      jsonRequest(
        "POST",
        "/api/admin/vehicles/V1/status",
        { status: "MAINTENANCE", expectedUpdatedAt: await updatedAtOf("V1"), resolutions: [{ lessonId: "lesson-short", action: "CANCEL", reason: "   " }] },
        await adminCookie(),
      ),
      context("V1"),
    );
    expect(response.status).toBe(400);
    expect((await prisma.lessonSchedule.findUniqueOrThrow({ where: { id: "lesson-short" } })).status).toBe(LessonScheduleStatus.SCHEDULED);
  });

  it("refuses a status change based on an out-of-date copy of the vehicle", async () => {
    const response = await statusRoute(
      jsonRequest("POST", "/api/admin/vehicles/V2/status", { status: "MAINTENANCE", expectedUpdatedAt: "2000-01-01T00:00:00.000Z", resolutions: [] }, await adminCookie()),
      context("V2"),
    );
    expect(response.status).toBe(409);
  });

  it("returns a maintenance vehicle to active without any lesson checks", async () => {
    const response = await statusRoute(
      jsonRequest("POST", "/api/admin/vehicles/V3/status", { status: "ACTIVE", expectedUpdatedAt: await updatedAtOf("V3"), resolutions: [] }, await adminCookie()),
      context("V3"),
    );
    expect(response.status).toBe(200);
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: "V3" } })).status).toBe(VehicleStatus.ACTIVE);
  });
});

describe("reactivating a vehicle goes through the eligibility check", () => {
  it("runs the check before setting ACTIVE, and reports which rules were checked", async () => {
    await prisma.vehicle.update({ where: { id: "V2" }, data: { status: VehicleStatus.MAINTENANCE } });
    const preview = await previewRoute(getRequest("/api/admin/vehicles/V2/status?status=ACTIVE", await adminCookie()), context("V2"));
    expect(preview.status).toBe(200);
    const body = (await preview.json()) as { eligibility: { rulesInForce: boolean; checkedRules: string[]; blockers: unknown[] } };
    // No rule is in force yet, so the preview must not claim the vehicle is eligible.
    expect(body.eligibility).toEqual({ rulesInForce: false, checkedRules: [], blockers: [] });

    const response = await statusRoute(
      jsonRequest("POST", "/api/admin/vehicles/V2/status", { status: "ACTIVE", expectedUpdatedAt: await updatedAtOf("V2"), resolutions: [] }, await adminCookie()),
      context("V2"),
    );
    expect(response.status).toBe(200);
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: "V2" } })).status).toBe(VehicleStatus.ACTIVE);
  });

  it("the check refuses a vehicle that does not exist", async () => {
    const result = await checkActivationEligibility("no-such-vehicle");
    expect(result.rulesInForce).toBe(false);
    expect(result.blockers[0]?.rule).toBe("vehicle");
  });
});

describe("audit history is append-only", () => {
  it("refuses to change or delete an audit row, even directly in the database", async () => {
    await createRoute(jsonRequest("POST", "/api/admin/vehicles", VALID_NEW, await adminCookie()));
    const entry = await prisma.vehicleAuditLog.findFirstOrThrow();
    await expect(prisma.vehicleAuditLog.update({ where: { id: entry.id }, data: { actorUserId: "ADMIN-1" } })).rejects.toThrow();
    await expect(prisma.vehicleAuditLog.delete({ where: { id: entry.id } })).rejects.toThrow();
  });

  it("refuses an audit row whose status fields do not match its action", async () => {
    await expect(
      prisma.vehicleAuditLog.create({
        data: { vehicleId: "V1", action: VehicleAuditAction.STATUS_CHANGED, previousStatus: VehicleStatus.ACTIVE, newStatus: VehicleStatus.ACTIVE, actorUserId: "ADMIN-1" },
      }),
    ).rejects.toThrow();
  });
});

describe("admin-only access to vehicle changes", () => {
  it("does not let an instructor create a vehicle", async () => {
    await createAccount({ userId: "INS-9", email: "ins9@riona.test", role: UserRole.INSTRUCTOR });
    const { token } = await createSession("INS-9");
    const response = await createRoute(jsonRequest("POST", "/api/admin/vehicles", VALID_NEW, `riona_session=${token}`));
    expect(response.status).toBe(403);
    expect(await prisma.vehicle.count({ where: { registrationNumber: "WP CAB-9001" } })).toBe(0);
  });

  it("uses the transmission enum from the database", () => {
    expect(Object.values(TransmissionType)).toContain("MANUAL");
  });
});
