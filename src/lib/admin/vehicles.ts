import { Prisma } from "@/generated/prisma/client";
import {
  LessonScheduleStatus,
  TransmissionType,
  VehicleAuditAction,
  VehicleStatus,
  VehicleType,
} from "@/generated/prisma/enums";
import { ADMIN_PAGE_SIZE, pageCount } from "@/lib/admin/query";
import { AuthError } from "@/lib/auth/http";
import { checkActivationEligibility } from "@/lib/admin/vehicle-eligibility";
import { parseCancellationReason } from "@/lib/lessons/cancellation";
import { requireExpectedUpdatedAt } from "@/lib/admin/entitlement-rules";
import { prisma } from "@/lib/prisma";
import { dateToString, parseDateOnly, schoolNow, timeToString } from "@/lib/student/time";

/**
 * Admin vehicle management, phase 1: records, status and audit. Retired vehicles use the existing INACTIVE status.
 * Every change is written to VehicleAuditLog in the same transaction as the change itself.
 */

const TEXT_MAX = 60;
const DESCRIPTION_MAX = 500;
const SEARCH_MAX = 60;
const REGISTRATION_PATTERN = /^[A-Z0-9][A-Z0-9-]*(?: [A-Z0-9-]+)*$/;

export type FieldErrors = Partial<Record<"registrationNumber" | "vehicleType" | "transmissionType" | "status" | "make" | "model" | "manufacturingYear" | "colour" | "description", string>>;

export type VehicleFields = {
  registrationNumber: string;
  vehicleType: VehicleType;
  make: string | null;
  model: string | null;
  manufacturingYear: number | null;
  colour: string | null;
  transmissionType: TransmissionType;
  description: string | null;
};

/** Normalises a registration number: trimmed, upper case, single spaces. */
export function normaliseRegistration(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, " ");
}

function optionalText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

/**
 * Checks one vehicle form. Returns field messages, so the form can show each one next to its input. Nothing
 * here touches the database; duplicate registration numbers are caught when the row is written.
 */
export function parseVehicleFields(body: Record<string, unknown>, options: { requireStatus: boolean }) {
  const errors: FieldErrors = {};
  const registrationNumber = normaliseRegistration(typeof body.registrationNumber === "string" ? body.registrationNumber : "");
  if (registrationNumber.length < 3 || registrationNumber.length > 20 || !REGISTRATION_PATTERN.test(registrationNumber)) {
    errors.registrationNumber = "Enter 3 to 20 letters, numbers, spaces or dashes, such as WP CAB-1234.";
  }

  const vehicleType = enumValue(body.vehicleType, Object.values(VehicleType));
  if (!vehicleType) errors.vehicleType = "Choose a vehicle type.";

  const transmissionType = enumValue(body.transmissionType, Object.values(TransmissionType));
  if (!transmissionType) errors.transmissionType = "Choose a transmission type.";

  let status: VehicleStatus | null = VehicleStatus.ACTIVE;
  if (options.requireStatus) {
    status = enumValue(body.status, Object.values(VehicleStatus));
    if (!status) errors.status = "Choose a status.";
  }

  const currentYear = schoolNow().date.slice(0, 4);
  let manufacturingYear: number | null = null;
  if (body.manufacturingYear !== undefined && body.manufacturingYear !== null && body.manufacturingYear !== "") {
    const year = typeof body.manufacturingYear === "number" ? body.manufacturingYear : Number(body.manufacturingYear);
    if (!Number.isInteger(year) || year < 1980 || year > Number(currentYear) + 1) {
      errors.manufacturingYear = `Enter a year from 1980 to ${Number(currentYear) + 1}.`;
    } else {
      manufacturingYear = year;
    }
  }

  const make = optionalText(body.make, TEXT_MAX);
  const model = optionalText(body.model, TEXT_MAX);
  const colour = optionalText(body.colour, TEXT_MAX);
  const description = optionalText(body.description, DESCRIPTION_MAX);
  if (typeof body.make === "string" && body.make.trim().length > TEXT_MAX) errors.make = `At most ${TEXT_MAX} characters.`;
  if (typeof body.model === "string" && body.model.trim().length > TEXT_MAX) errors.model = `At most ${TEXT_MAX} characters.`;
  if (typeof body.colour === "string" && body.colour.trim().length > TEXT_MAX) errors.colour = `At most ${TEXT_MAX} characters.`;
  if (typeof body.description === "string" && body.description.trim().length > DESCRIPTION_MAX) {
    errors.description = `At most ${DESCRIPTION_MAX} characters.`;
  }

  if (Object.keys(errors).length > 0 || !vehicleType || !transmissionType || !status) {
    return { ok: false as const, errors };
  }
  return {
    ok: true as const,
    fields: { registrationNumber, vehicleType, make, model, manufacturingYear, colour, transmissionType, description } satisfies VehicleFields,
    status,
  };
}

/**
 * Filter value for vehicles that are not taking lessons (MAINTENANCE or INACTIVE). It is a list filter only, never a
 * stored status. The dashboard card links here, so its count and this list match.
 */
export const NEEDS_ATTENTION = "NEEDS_ATTENTION";
const NEEDS_ATTENTION_STATUSES: VehicleStatus[] = [VehicleStatus.MAINTENANCE, VehicleStatus.INACTIVE];

/** Reads the list filters. Unknown values are ignored, so a bad link shows the full list rather than an error. */
export function vehicleListQuery(input: { q?: string; type?: string; status?: string; page?: string }) {
  const q = (input.q ?? "").trim().slice(0, SEARCH_MAX);
  const type = enumValue(input.type, Object.values(VehicleType));
  const status: VehicleStatus | typeof NEEDS_ATTENTION | null =
    input.status === NEEDS_ATTENTION ? NEEDS_ATTENTION : enumValue(input.status, Object.values(VehicleStatus));
  const page = /^[1-9][0-9]{0,5}$/.test(input.page ?? "") ? Number(input.page) : 1;
  return { q, type, status, page };
}

export async function listVehicles(query: ReturnType<typeof vehicleListQuery>) {
  const where: Prisma.VehicleWhereInput = {
    ...(query.type ? { vehicleType: query.type } : {}),
    ...(query.status === NEEDS_ATTENTION
      ? { status: { in: NEEDS_ATTENTION_STATUSES } }
      : query.status !== null
        ? { status: query.status }
        : {}),
    ...(query.q
      ? {
          OR: [
            { registrationNumber: { contains: query.q, mode: "insensitive" } },
            { make: { contains: query.q, mode: "insensitive" } },
            { model: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [total, vehicles] = await Promise.all([
    prisma.vehicle.count({ where }),
    prisma.vehicle.findMany({
      where,
      orderBy: [{ registrationNumber: "asc" }, { id: "asc" }],
      skip: (query.page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: {
        id: true,
        registrationNumber: true,
        vehicleType: true,
        make: true,
        model: true,
        status: true,
        updatedAt: true,
        _count: { select: { lessonSchedules: { where: { status: LessonScheduleStatus.SCHEDULED } } } },
      },
    }),
  ]);
  return {
    vehicles: vehicles.map((vehicle) => ({
      id: vehicle.id,
      registrationNumber: vehicle.registrationNumber,
      vehicleType: vehicle.vehicleType,
      make: vehicle.make,
      model: vehicle.model,
      status: vehicle.status,
      updatedAt: vehicle.updatedAt.toISOString(),
      scheduledLessons: vehicle._count.lessonSchedules,
    })),
    total,
    page: query.page,
    pageCount: pageCount(total),
  };
}

/** Lessons from today (school time) onward that are still scheduled. These are the lessons a status change must resolve. */
export async function futureScheduledLessons(vehicleId: string, tx: Prisma.TransactionClient = prisma) {
  const today = parseDateOnly(schoolNow().date)!;
  return tx.lessonSchedule.findMany({
    where: { vehicleId, status: LessonScheduleStatus.SCHEDULED, lessonDate: { gte: today } },
    orderBy: [{ lessonDate: "asc" }, { startTime: "asc" }, { id: "asc" }],
    select: {
      id: true,
      lessonDate: true,
      startTime: true,
      endTime: true,
      vehicleType: true,
      instructorUserId: true,
      studentUserId: true,
    },
  });
}

export type AffectedLesson = Awaited<ReturnType<typeof futureScheduledLessons>>[number];

/** Free ACTIVE vehicles of the same type for one lesson's time, so an admin can choose one for each lesson. */
async function candidatesFor(lesson: AffectedLesson, excludeVehicleId: string) {
  const vehicles = await prisma.vehicle.findMany({
    where: { vehicleType: lesson.vehicleType, status: VehicleStatus.ACTIVE, id: { not: excludeVehicleId } },
    orderBy: [{ registrationNumber: "asc" }, { id: "asc" }],
    select: { id: true, registrationNumber: true, make: true, model: true },
  });
  const free: typeof vehicles = [];
  for (const vehicle of vehicles) {
    const clash = await prisma.lessonSchedule.findFirst({
      where: {
        vehicleId: vehicle.id,
        lessonDate: lesson.lessonDate,
        status: LessonScheduleStatus.SCHEDULED,
        startTime: { lt: lesson.endTime },
        endTime: { gt: lesson.startTime },
      },
      select: { id: true },
    });
    if (!clash) free.push(vehicle);
  }
  return free.slice(0, 10);
}

/** What a status change would affect, with a free-vehicle choice for each lesson. Used by the admin before confirming. */
export async function previewStatusChange(vehicleId: string, status: VehicleStatus) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true, status: true } });
  if (!vehicle) throw new AuthError(404, "That vehicle was not found.");
  if (vehicle.status === status) throw new AuthError(409, "The vehicle already has this status.");

  // Activating a vehicle never affects lessons, but it must pass the eligibility rules first.
  const eligibility = status === VehicleStatus.ACTIVE ? await checkActivationEligibility(vehicleId) : null;
  const lessons = status === VehicleStatus.ACTIVE ? [] : await futureScheduledLessons(vehicleId);
  const affected = [];
  for (const lesson of lessons) {
    affected.push({
      id: lesson.id,
      lessonDate: dateToString(lesson.lessonDate),
      startTime: timeToString(lesson.startTime),
      endTime: timeToString(lesson.endTime),
      vehicleType: lesson.vehicleType,
      studentUserId: lesson.studentUserId,
      instructorUserId: lesson.instructorUserId,
      candidates: await candidatesFor(lesson, vehicleId),
    });
  }
  return { currentStatus: vehicle.status, status, affected, eligibility };
}

export type Resolution =
  | { lessonId: string; action: "REASSIGN"; vehicleId: string }
  | { lessonId: string; action: "CANCEL"; reason: string };

/** Checks the resolutions the admin sent. Each affected lesson needs exactly one, and nothing else may be listed. */
export function parseResolutions(value: unknown): Resolution[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new AuthError(400, "The lesson resolutions are not in the right form.");
  return value.map((item) => {
    const entry = item as Record<string, unknown>;
    const lessonId = typeof entry.lessonId === "string" ? entry.lessonId : "";
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(lessonId)) throw new AuthError(400, "A lesson in the resolutions is not valid.");
    if (entry.action === "REASSIGN") {
      const vehicleId = typeof entry.vehicleId === "string" ? entry.vehicleId : "";
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(vehicleId)) throw new AuthError(400, "Choose a vehicle to move the lesson to.");
      return { lessonId, action: "REASSIGN", vehicleId };
    }
    if (entry.action === "CANCEL") {
      return { lessonId, action: "CANCEL", reason: parseCancellationReason(entry.reason) };
    }
    throw new AuthError(400, "Each lesson needs a reassign or cancel choice.");
  });
}

export async function getVehicleDetail(vehicleId: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: {
      id: true,
      registrationNumber: true,
      vehicleType: true,
      make: true,
      model: true,
      manufacturingYear: true,
      colour: true,
      transmissionType: true,
      status: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      lessonSchedules: {
        orderBy: [{ lessonDate: "desc" }, { startTime: "desc" }],
        take: 20,
        select: { id: true, lessonDate: true, startTime: true, status: true, studentUserId: true, instructorUserId: true },
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          action: true,
          previousStatus: true,
          newStatus: true,
          changes: true,
          createdAt: true,
          actorUserId: true,
        },
      },
    },
  });
  if (!vehicle) throw new AuthError(404, "That vehicle was not found.");
  return {
    ...vehicle,
    createdAt: vehicle.createdAt.toISOString(),
    updatedAt: vehicle.updatedAt.toISOString(),
    lessonSchedules: vehicle.lessonSchedules.map((lesson) => ({
      ...lesson,
      lessonDate: dateToString(lesson.lessonDate),
      startTime: timeToString(lesson.startTime),
    })),
    auditLogs: vehicle.auditLogs.map((entry) => ({ ...entry, createdAt: entry.createdAt.toISOString() })),
  };
}

function duplicateRegistrationError(error: unknown): never | undefined {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new AuthError(409, "A vehicle with this registration number already exists.");
  }
  return undefined;
}

export async function createVehicle(adminUserId: string, fields: VehicleFields, status: VehicleStatus) {
  try {
    return await prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.create({ data: { ...fields, status }, select: { id: true } });
      await tx.vehicleAuditLog.create({
        data: {
          vehicleId: vehicle.id,
          action: VehicleAuditAction.CREATED,
          newStatus: status,
          changes: { registrationNumber: { from: null, to: fields.registrationNumber }, vehicleType: { from: null, to: fields.vehicleType } },
          actorUserId: adminUserId,
        },
      });
      return vehicle;
    });
  } catch (error) {
    duplicateRegistrationError(error);
    throw error;
  }
}

/** Editable fields only. Status changes use changeVehicleStatus, so this never changes a vehicle's status. */
const EDITABLE: (keyof VehicleFields)[] = [
  "registrationNumber",
  "vehicleType",
  "make",
  "model",
  "manufacturingYear",
  "colour",
  "transmissionType",
  "description",
];

/**
 * Every vehicle change needs the vehicle's last-changed time, as the admin's page loaded it, so a stale page cannot
 * overwrite a newer change. The check itself is in entitlement-rules; here it is only given the vehicle wording.
 */
function vehicleStamp(value: string | null): string {
  return requireExpectedUpdatedAt(value, "The vehicle's last-changed time");
}

export async function updateVehicle(vehicleId: string, adminUserId: string, fields: VehicleFields, expectedUpdatedAt: string | null) {
  const expected = vehicleStamp(expectedUpdatedAt);
  try {
    return await prisma.$transaction(async (tx) => {
      // Lock the row, so two edits cannot both read the same old values.
      await tx.$queryRaw`SELECT id FROM "Vehicle" WHERE id = ${vehicleId} FOR UPDATE`;
      const current = await tx.vehicle.findUnique({ where: { id: vehicleId } });
      if (!current) throw new AuthError(404, "That vehicle was not found.");
      if (current.updatedAt.toISOString() !== expected) {
        throw new AuthError(409, "This vehicle was changed by someone else. Reload the page and try again.");
      }

      const changes: Record<string, { from: unknown; to: unknown }> = {};
      for (const key of EDITABLE) {
        const before = current[key];
        const after = fields[key];
        if (before !== after) changes[key] = { from: before, to: after };
      }
      if (Object.keys(changes).length === 0) return current;

      // The vehicle type is fixed for lessons that already use it, because each lesson records its type.
      if (changes.vehicleType) {
        const lessons = await tx.lessonSchedule.count({ where: { vehicleId } });
        if (lessons > 0) {
          throw new AuthError(409, "The vehicle type cannot be changed while the vehicle has lessons. Record a new vehicle instead.");
        }
      }

      const updated = await tx.vehicle.update({ where: { id: vehicleId }, data: fields });
      await tx.vehicleAuditLog.create({
        data: { vehicleId, action: VehicleAuditAction.UPDATED, changes: changes as Prisma.InputJsonObject, actorUserId: adminUserId },
      });
      return updated;
    });
  } catch (error) {
    duplicateRegistrationError(error);
    throw error;
  }
}

/**
 * Changes a vehicle's status. If scheduled lessons would be affected, every one must be resolved in this same request:
 * moved to another free vehicle of the same type, or cancelled with a reason. Nothing is cancelled or moved without
 * that choice, and if any part fails, nothing is saved.
 */
export async function changeVehicleStatus(
  vehicleId: string,
  adminUserId: string,
  input: { status: VehicleStatus; expectedUpdatedAt: string | null; resolutions: Resolution[] },
) {
  const expected = vehicleStamp(input.expectedUpdatedAt);
  try {
    return await prisma.$transaction(async (tx) => {
      // Lock every vehicle this change touches in one sorted order: this vehicle exclusively (so booking waits for this change),
      // and each reassignment target shared. Two changes that move lessons onto each other's vehicles then queue in the same
      // order instead of each waiting on the other.
      const targetIds = input.resolutions.flatMap((item) => (item.action === "REASSIGN" ? [item.vehicleId] : []));
      const lockIds = [...new Set([vehicleId, ...targetIds])].sort();
      for (const id of lockIds) {
        if (id === vehicleId) {
          await tx.$queryRaw`SELECT id FROM "Vehicle" WHERE id = ${id} FOR UPDATE`;
        } else {
          await tx.$queryRaw`SELECT id FROM "Vehicle" WHERE id = ${id} FOR SHARE`;
        }
      }
      const vehicle = await tx.vehicle.findUnique({ where: { id: vehicleId } });
      if (!vehicle) throw new AuthError(404, "That vehicle was not found.");
      if (vehicle.updatedAt.toISOString() !== expected) {
        throw new AuthError(409, "This vehicle was changed by someone else. Reload the page and try again.");
      }
      if (vehicle.status === input.status) throw new AuthError(409, "The vehicle already has this status.");

      // Every path to ACTIVE goes through the centralized eligibility check, inside this locked transaction.
      if (input.status === VehicleStatus.ACTIVE) {
        const eligibility = await checkActivationEligibility(vehicleId, tx);
        if (eligibility.blockers.length > 0) {
          throw new AuthError(409, eligibility.blockers[0]?.message ?? "This vehicle cannot be made active yet.");
        }
      }

      const lessons = input.status === VehicleStatus.ACTIVE ? [] : await futureScheduledLessons(vehicleId, tx);
      const lessonIds = new Set(lessons.map((lesson) => lesson.id));
      const resolutionIds = new Set(input.resolutions.map((item) => item.lessonId));
      if (resolutionIds.size !== input.resolutions.length) throw new AuthError(400, "Each lesson can have only one choice.");
      for (const id of resolutionIds) {
        if (!lessonIds.has(id)) throw new AuthError(409, "The scheduled lessons have changed. Review them again and confirm.");
      }
      if (lessons.some((lesson) => !resolutionIds.has(lesson.id))) {
        throw new AuthError(409, "Choose what happens to every scheduled lesson before changing the status.");
      }

      const resolutionLog: { lessonId: string; action: string; vehicleId?: string; reason?: string }[] = [];
      for (const lesson of lessons) {
        const resolution = input.resolutions.find((item) => item.lessonId === lesson.id)!;
        if (resolution.action === "CANCEL") {
          // The reason and the admin who made the change are stored on the lesson as well as in the audit log.
          await tx.lessonSchedule.update({
            where: { id: lesson.id },
            data: {
              status: LessonScheduleStatus.CANCELLED,
              cancellationReason: resolution.reason,
              cancelledAt: new Date(),
              cancelledByUserId: adminUserId,
            },
          });
          resolutionLog.push({ lessonId: lesson.id, action: "CANCEL", reason: resolution.reason });
          continue;
        }

        if (resolution.vehicleId === vehicleId) throw new AuthError(400, "A lesson must move to a different vehicle.");
        const target = await tx.vehicle.findUnique({ where: { id: resolution.vehicleId }, select: { id: true, vehicleType: true, status: true } });
        if (!target || target.status !== VehicleStatus.ACTIVE || target.vehicleType !== lesson.vehicleType) {
          throw new AuthError(409, "The vehicle chosen for a lesson is no longer available. Review the lessons again.");
        }
        // Share-lock the target, so a booking or status change on it cannot slip in during this move.
        await tx.$queryRaw`SELECT id FROM "Vehicle" WHERE id = ${target.id} FOR SHARE`;
        try {
          await tx.lessonSchedule.update({ where: { id: lesson.id }, data: { vehicleId: target.id } });
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (message.includes("vehicle_no_overlap") || message.includes("Vehicle is not active")) {
            throw new AuthError(409, "A lesson cannot move to that vehicle at this time. Choose another vehicle.");
          }
          throw error;
        }
        resolutionLog.push({ lessonId: lesson.id, action: "REASSIGN", vehicleId: target.id });
      }

      const updated = await tx.vehicle.update({ where: { id: vehicleId }, data: { status: input.status } });
      await tx.vehicleAuditLog.create({
        data: {
          vehicleId,
          action: VehicleAuditAction.STATUS_CHANGED,
          previousStatus: vehicle.status,
          newStatus: input.status,
          changes: { affectedLessons: resolutionLog } as Prisma.InputJsonObject,
          actorUserId: adminUserId,
        },
      });
      return { status: updated.status, resolved: resolutionLog.length };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new AuthError(409, "Another change is in progress for this vehicle. Try again.");
    }
    throw error;
  }
}
