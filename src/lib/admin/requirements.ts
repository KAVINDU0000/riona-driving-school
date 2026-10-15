import { PackageType, TrainingType, VehicleType } from "@/generated/prisma/enums";
import { parsePackageId } from "@/lib/admin/packages";
import { AuthError } from "@/lib/auth/http";
import { prisma } from "@/lib/prisma";

/*
 * Session requirements for each package: how many sessions a student must complete for each vehicle type and
 * training type. The school supplies every count. Nothing here invents a count or a combination.
 *
 * MAX_REQUIRED_SESSIONS is a technical validation limit chosen for this system, not a school-defined requirement.
 *
 * Approval uses the package's rows only after the school has confirmed them. Any edit clears the confirmation.
 * Enrollments copy the rows when they are approved, so later edits never change an existing enrollment.
 */

export const MAX_REQUIRED_SESSIONS = 500;
const VEHICLE_TYPES = Object.values(VehicleType);
const TRAINING_TYPES = Object.values(TrainingType);
/** Every vehicle type and training type combination. A package cannot have more rows than this. */
const MAX_ROWS = VEHICLE_TYPES.length * TRAINING_TYPES.length;

export type RequirementRow = {
  vehicleType: VehicleType;
  trainingType: TrainingType;
  requiredSessions: number;
};

export type RequirementStatus = "NOT_APPLICABLE" | "INCOMPLETE" | "AWAITING_CONFIRMATION" | "CONFIRMED";

/**
 * Reads the list sent by the editor. Each row must name a valid vehicle type and training type, carry a whole
 * number of sessions from 1 to MAX_REQUIRED_SESSIONS, and appear only once.
 */
export function parseRequirementRows(value: unknown): RequirementRow[] {
  if (!Array.isArray(value)) {
    throw new AuthError(400, "Send the requirements as a list.");
  }
  if (value.length > MAX_ROWS) {
    throw new AuthError(400, `A package can have at most ${MAX_ROWS} requirement rows.`);
  }

  const seen = new Set<string>();
  return value.map((item) => {
    if (!item || typeof item !== "object") {
      throw new AuthError(400, "Each requirement must be an object.");
    }
    const { vehicleType, trainingType, requiredSessions } = item as Record<string, unknown>;
    if (typeof vehicleType !== "string" || !(VEHICLE_TYPES as readonly string[]).includes(vehicleType)) {
      throw new AuthError(400, "Choose a valid vehicle type.");
    }
    if (typeof trainingType !== "string" || !(TRAINING_TYPES as readonly string[]).includes(trainingType)) {
      throw new AuthError(400, "Choose a valid training type.");
    }
    if (
      typeof requiredSessions !== "number" ||
      !Number.isInteger(requiredSessions) ||
      requiredSessions < 1 ||
      requiredSessions > MAX_REQUIRED_SESSIONS
    ) {
      throw new AuthError(400, `Required sessions must be a whole number from 1 to ${MAX_REQUIRED_SESSIONS}.`);
    }
    const key = `${vehicleType}|${trainingType}`;
    if (seen.has(key)) {
      throw new AuthError(400, "Each vehicle type and training type can appear only once.");
    }
    seen.add(key);
    return { vehicleType: vehicleType as VehicleType, trainingType: trainingType as TrainingType, requiredSessions };
  });
}

/**
 * The state a package is in for approval:
 * - NOT_APPLICABLE: per-session (DAILY) packages are not approved online, so they have no requirements.
 * - INCOMPLETE: no rows yet, or at least one row has no count.
 * - AWAITING_CONFIRMATION: every row has a count, but the school has not confirmed them.
 * - CONFIRMED: complete and confirmed. Approval may use these rows.
 */
export function requirementStatus(input: {
  packageType: PackageType;
  rows: { requiredSessions: number | null }[];
  confirmedAt: Date | string | null;
}): RequirementStatus {
  if (input.packageType === "DAILY") return "NOT_APPLICABLE";
  if (input.rows.length === 0 || input.rows.some((row) => row.requiredSessions === null)) return "INCOMPLETE";
  return input.confirmedAt ? "CONFIRMED" : "AWAITING_CONFIRMATION";
}

const rowKey = (vehicleType: string, trainingType: string) => `${vehicleType}|${trainingType}`;

/**
 * Replaces a package's full set of requirement rows in one transaction. Each added, changed or removed count is
 * written to TrainingPackageItemChange. Any change clears the package confirmation. A save with no real change
 * writes nothing and keeps the confirmation.
 */
export async function replaceRequirements(packageIdRaw: string, adminUserId: string, rows: RequirementRow[]) {
  const packageId = parsePackageId(packageIdRaw);

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "TrainingPackage" WHERE id = ${packageId} FOR UPDATE`;
    const pkg = await tx.trainingPackage.findUnique({ where: { id: packageId }, select: { id: true, packageType: true } });
    if (!pkg) {
      throw new AuthError(404, "That package was not found.");
    }
    if (pkg.packageType === PackageType.DAILY) {
      throw new AuthError(422, "Per-session packages do not use session requirements.");
    }

    const existing = await tx.trainingPackageItem.findMany({ where: { packageId } });
    const before = new Map(existing.map((item) => [rowKey(item.vehicleType, item.trainingType), item]));
    const after = new Map(rows.map((row) => [rowKey(row.vehicleType, row.trainingType), row]));

    const changes: {
      packageItemId: string | null;
      vehicleType: VehicleType;
      trainingType: TrainingType;
      previous: number | null;
      next: number | null;
    }[] = [];

    // Removed rows.
    for (const [key, item] of before) {
      if (after.has(key)) continue;
      await tx.trainingPackageItem.delete({ where: { id: item.id } });
      changes.push({
        packageItemId: item.id,
        vehicleType: item.vehicleType,
        trainingType: item.trainingType,
        previous: item.requiredSessions,
        next: null,
      });
    }

    // Added and changed rows.
    for (const row of rows) {
      const item = before.get(rowKey(row.vehicleType, row.trainingType));
      if (!item) {
        const created = await tx.trainingPackageItem.create({
          data: { packageId, vehicleType: row.vehicleType, trainingType: row.trainingType, requiredSessions: row.requiredSessions },
        });
        changes.push({ packageItemId: created.id, vehicleType: row.vehicleType, trainingType: row.trainingType, previous: null, next: row.requiredSessions });
      } else if (item.requiredSessions !== row.requiredSessions) {
        await tx.trainingPackageItem.update({ where: { id: item.id }, data: { requiredSessions: row.requiredSessions } });
        changes.push({ packageItemId: item.id, vehicleType: row.vehicleType, trainingType: row.trainingType, previous: item.requiredSessions, next: row.requiredSessions });
      }
    }

    if (changes.length === 0) {
      return { changed: 0, confirmationCleared: false };
    }

    await tx.trainingPackageItemChange.createMany({
      data: changes.map((change) => ({
        packageId,
        packageItemId: change.packageItemId,
        vehicleType: change.vehicleType,
        trainingType: change.trainingType,
        previousRequiredSessions: change.previous,
        newRequiredSessions: change.next,
        changedByUserId: adminUserId,
      })),
    });
    await tx.trainingPackage.update({
      where: { id: packageId },
      data: { requirementsConfirmedAt: null, requirementsConfirmedByUserId: null },
    });
    return { changed: changes.length, confirmationCleared: true };
  });
}

/**
 * Records the school's confirmation. Refused unless the package has at least one row and every row has a count.
 * Confirming a package that is already confirmed changes nothing.
 */
export async function confirmRequirements(packageIdRaw: string, adminUserId: string) {
  const packageId = parsePackageId(packageIdRaw);

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "TrainingPackage" WHERE id = ${packageId} FOR UPDATE`;
    const pkg = await tx.trainingPackage.findUnique({
      where: { id: packageId },
      select: { id: true, packageType: true, requirementsConfirmedAt: true },
    });
    if (!pkg) {
      throw new AuthError(404, "That package was not found.");
    }
    if (pkg.packageType === PackageType.DAILY) {
      throw new AuthError(422, "Per-session packages do not use session requirements.");
    }

    const rows = await tx.trainingPackageItem.findMany({ where: { packageId }, select: { requiredSessions: true } });
    if (rows.length === 0 || rows.some((row) => row.requiredSessions === null)) {
      throw new AuthError(422, "Enter a required session count for every row before confirming.");
    }
    if (pkg.requirementsConfirmedAt) {
      return { confirmedAt: pkg.requirementsConfirmedAt.toISOString(), alreadyConfirmed: true };
    }

    const confirmedAt = new Date();
    await tx.trainingPackage.update({
      where: { id: packageId },
      data: { requirementsConfirmedAt: confirmedAt, requirementsConfirmedByUserId: adminUserId },
    });
    return { confirmedAt: confirmedAt.toISOString(), alreadyConfirmed: false };
  });
}

/** Recent requirement changes for one package, newest first. */
export async function listRequirementChanges(packageIdRaw: string, limit = 20) {
  const packageId = parsePackageId(packageIdRaw);
  const rows = await prisma.trainingPackageItemChange.findMany({
    where: { packageId },
    orderBy: { changedAt: "desc" },
    take: limit,
    select: {
      vehicleType: true,
      trainingType: true,
      previousRequiredSessions: true,
      newRequiredSessions: true,
      changedAt: true,
      changedByUserId: true,
    },
  });
  return rows.map((row) => ({ ...row, changedAt: row.changedAt.toISOString() }));
}

/** Recent requirement changes across all packages, newest first, with the package name. For the admin history list. */
export async function listRecentRequirementChanges(limit = 50) {
  const rows = await prisma.trainingPackageItemChange.findMany({
    orderBy: { changedAt: "desc" },
    take: limit,
    select: {
      vehicleType: true,
      trainingType: true,
      previousRequiredSessions: true,
      newRequiredSessions: true,
      changedAt: true,
      changedByUserId: true,
      package: { select: { name: true } },
    },
  });
  return rows.map((row) => ({
    packageName: row.package.name,
    vehicleType: row.vehicleType,
    trainingType: row.trainingType,
    previous: row.previousRequiredSessions,
    next: row.newRequiredSessions,
    changedAt: row.changedAt.toISOString(),
    changedBy: row.changedByUserId,
  }));
}
