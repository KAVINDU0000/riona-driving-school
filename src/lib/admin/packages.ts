import { AuthError } from "@/lib/auth/http";
import { prisma } from "@/lib/prisma";

/*
 * Package and price management for the admin portal. Only admins reach these functions (the API and the page
 * check the role first). Every value is checked here again, so a direct API call gets the same rules as the form.
 *
 * A price change is recorded in TrainingPackagePriceChange in the same transaction. Applications, enrollments and
 * payments keep the prices they were given, because those are stored as their own snapshot columns.
 */

const PACKAGE_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;
/** Matches NUMERIC(10,2): up to 8 whole digits and up to 2 decimals, with no sign and no separators. */
const PRICE_PATTERN = /^\d{1,8}(\.\d{1,2})?$/;
const MAX_PRICE = 99_999_999.99;
const MAX_SORT_ORDER = 9999;
const HISTORY_LIMIT = 50;

export type PriceEdit = {
  /** The new price, as a string with two decimals, for example "26000.00". */
  price: string;
  /** The price the admin saw when they opened the form. A mismatch means someone else changed it first. */
  expectedPrice: string;
  sortOrder: number;
  isActive: boolean;
};

/** Returns the package ID, or a 404 for anything that cannot be an ID. */
export function parsePackageId(value: string): string {
  if (!PACKAGE_ID_PATTERN.test(value)) {
    throw new AuthError(404, "That package was not found.");
  }
  return value;
}

/** Reads one LKR amount from the request. Only plain decimal text is accepted, so no float rounding happens on input. */
export function parsePriceText(value: unknown, label: string): string {
  const message = `${label} must be an amount in LKR with no more than two decimals, for example 26000 or 26000.50.`;
  if (typeof value !== "string") throw new AuthError(400, message);
  const text = value.trim();
  if (!PRICE_PATTERN.test(text)) throw new AuthError(400, message);
  const amount = Number(text);
  if (amount > MAX_PRICE) throw new AuthError(400, `${label} must be 99,999,999.99 or less.`);
  return amount.toFixed(2);
}

/** Checks a whole request body for a price edit. Anything missing or of the wrong type is refused with 400. */
export function parsePriceEdit(body: Record<string, unknown>): PriceEdit {
  const sortOrder = body.sortOrder;
  if (typeof sortOrder !== "number" || !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > MAX_SORT_ORDER) {
    throw new AuthError(400, `Sort order must be a whole number from 0 to ${MAX_SORT_ORDER}.`);
  }
  if (typeof body.isActive !== "boolean") {
    throw new AuthError(400, "Choose whether the package is offered (true or false).");
  }
  return {
    price: parsePriceText(body.price, "Price"),
    expectedPrice: parsePriceText(body.expectedPrice, "The current price"),
    sortOrder,
    isActive: body.isActive,
  };
}

/**
 * Applies one edit under a row lock. A stale expected price is refused with 409 and nothing is written.
 * A price that does not change writes no history row. Sort order and the active flag never write history.
 */
export async function updatePackage(packageId: string, adminUserId: string, edit: PriceEdit) {
  const id = parsePackageId(packageId);

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "TrainingPackage" WHERE id = ${id} FOR UPDATE`;
    const current = await tx.trainingPackage.findUnique({ where: { id }, select: { id: true, price: true } });
    if (!current) {
      throw new AuthError(404, "That package was not found.");
    }
    const currentPrice = current.price.toFixed(2);
    if (currentPrice !== edit.expectedPrice) {
      throw new AuthError(409, "This package's price was changed by someone else. Reload the page and check the price before saving.");
    }

    const priceChanged = currentPrice !== edit.price;
    const updated = await tx.trainingPackage.update({
      where: { id },
      data: { price: edit.price, sortOrder: edit.sortOrder, isActive: edit.isActive },
      select: { id: true, price: true, sortOrder: true, isActive: true },
    });
    if (priceChanged) {
      await tx.trainingPackagePriceChange.create({
        data: { packageId: id, previousPrice: current.price, newPrice: edit.price, changedByUserId: adminUserId },
      });
    }
    return { id: updated.id, price: updated.price.toFixed(2), sortOrder: updated.sortOrder, isActive: updated.isActive, priceChanged };
  });
}

/** Every package, active or not, with the counts the admin needs to judge a price or an approval blocker. */
export async function listPackagesForAdmin() {
  const rows = await prisma.trainingPackage.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      packageType: true,
      price: true,
      durationDays: true,
      sessionDurationMinutes: true,
      sortOrder: true,
      isActive: true,
      requirementsConfirmedAt: true,
      items: {
        select: { vehicleType: true, trainingType: true, requiredSessions: true },
        orderBy: [{ vehicleType: "asc" }, { trainingType: "asc" }],
      },
      _count: { select: { registrationRequests: true, enrollments: true, priceChanges: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    packageType: row.packageType,
    price: row.price.toFixed(2),
    durationDays: row.durationDays,
    sessionDurationMinutes: row.sessionDurationMinutes,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    requirements: row.items.map((item) => ({
      vehicleType: item.vehicleType,
      trainingType: item.trainingType,
      requiredSessions: item.requiredSessions,
    })),
    requirementsConfirmedAt: row.requirementsConfirmedAt?.toISOString() ?? null,
    sessionCounts: {
      rows: row.items.length,
      missing: row.items.filter((item) => item.requiredSessions === null).length,
    },
    applications: row._count.registrationRequests,
    enrollments: row._count.enrollments,
    priceChanges: row._count.priceChanges,
  }));
}

/** The most recent price changes across all packages, newest first. */
export async function listPriceChanges() {
  const rows = await prisma.trainingPackagePriceChange.findMany({
    orderBy: { changedAt: "desc" },
    take: HISTORY_LIMIT,
    select: {
      previousPrice: true,
      newPrice: true,
      changedAt: true,
      changedByUserId: true,
      package: { select: { name: true } },
    },
  });
  return rows.map((row) => ({
    packageName: row.package.name,
    previousPrice: row.previousPrice.toFixed(2),
    newPrice: row.newPrice.toFixed(2),
    changedAt: row.changedAt.toISOString(),
    changedBy: row.changedByUserId,
  }));
}
