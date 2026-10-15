import { prisma } from "@/lib/prisma";
import { type CatalogGroup, type CatalogPackage, type PackageType } from "@/lib/packages/format";

/*
 * The live package catalog. The database is the only source: every public page, the signup form and the payment
 * page read from here. Only active packages are returned. Group headings are presentation text chosen by package
 * type, so a price or a package can never be added or removed by a heading.
 */

const GROUP_LABELS: Record<PackageType, string> = {
  REGULAR: "Regular training package",
  TRIAL_PREPARATION: "Official driving trial preparation",
  ADDITIONAL_VEHICLE: "Additional vehicle training",
  DAILY: "Daily individual training",
};

const GROUP_ORDER: PackageType[] = ["REGULAR", "TRIAL_PREPARATION", "ADDITIONAL_VEHICLE", "DAILY"];

const catalogSelect = {
  id: true,
  name: true,
  packageType: true,
  price: true,
  durationDays: true,
  sessionDurationMinutes: true,
} as const;

type CatalogRow = {
  id: string;
  name: string;
  packageType: PackageType;
  price: { toString(): string };
  durationDays: number | null;
  sessionDurationMinutes: number | null;
};

/** Converts a database row to the shape the pages use. The detail line is built from stored lengths only. */
export function toCatalogPackage(row: CatalogRow): CatalogPackage {
  const perSession = row.packageType === "DAILY";
  let detail: string | undefined;
  if (perSession && row.sessionDurationMinutes) detail = `per ${row.sessionDurationMinutes}-minute session`;
  else if (!perSession && row.durationDays) detail = `${row.durationDays} days`;
  return {
    id: row.id,
    name: row.name,
    packageType: row.packageType,
    price: Number(row.price.toString()),
    detail,
    ...(perSession ? { pricing: "per-session" as const } : {}),
    group: GROUP_LABELS[row.packageType],
  };
}

/** Groups packages under their headings, in the school's group order. Empty groups are left out. */
export function groupCatalog(packages: CatalogPackage[]): CatalogGroup[] {
  return GROUP_ORDER.map((type) => ({
    label: GROUP_LABELS[type],
    options: packages.filter((option) => option.packageType === type),
  })).filter((group) => group.options.length > 0);
}

/** Active packages from the database, in the order the school set. An empty list means nothing is offered. */
export async function getPublicPackageCatalog(): Promise<CatalogGroup[]> {
  const rows = await prisma.trainingPackage.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: catalogSelect,
  });
  return groupCatalog(rows.map(toCatalogPackage));
}

/** One active package by ID, or null. An inactive package is treated as not offered. */
export async function getPublicPackage(id: string): Promise<CatalogPackage | null> {
  const row = await prisma.trainingPackage.findFirst({ where: { id, isActive: true }, select: catalogSelect });
  return row ? toCatalogPackage(row) : null;
}
