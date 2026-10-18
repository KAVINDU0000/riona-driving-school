/**
 * One-time: inserts the training packages from src/data/packages.ts into the shared Neon branch `team-testing`.
 *
 *   pnpm exec tsx scripts/seed-team-testing-packages.ts
 *
 * - Refuses to run unless DATABASE_URL points at exactly the team-testing branch (pooled or direct host).
 *   It does not read .env.local, so it cannot pick up another database by accident.
 * - Inserts packages only. It creates no users, registrations, payments or package items.
 * - Runs in one transaction. Packages that already exist are never overwritten; differences are reported.
 */
import { packageGroups } from "../src/data/packages";
import { prisma } from "../src/lib/prisma";

const ALLOWED_HOSTS = new Set([
  "ep-green-sky-b36tbzuo-pooler.c-4.ap-southeast-1.aws.neon.tech",
  "ep-green-sky-b36tbzuo.c-4.ap-southeast-1.aws.neon.tech",
]);

type PackageTypeName = "REGULAR" | "TRIAL_PREPARATION" | "ADDITIONAL_VEHICLE" | "DAILY";

const PACKAGE_TYPE_BY_GROUP: Record<string, PackageTypeName> = {
  "Regular training package": "REGULAR",
  "Official driving trial preparation": "TRIAL_PREPARATION",
  "Additional vehicle training": "ADDITIONAL_VEHICLE",
  "Daily individual training": "DAILY",
};

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function assertTeamTestingBranch() {
  const raw = process.env.DATABASE_URL;
  if (!raw) fail("DATABASE_URL is not set.");
  let host: string;
  try {
    host = new URL(raw).hostname;
  } catch {
    fail("DATABASE_URL is not a valid URL.");
  }
  if (!ALLOWED_HOSTS.has(host)) {
    fail("Refusing to seed: DATABASE_URL is not the team-testing branch.");
  }
}

async function main() {
  assertTeamTestingBranch();

  const rows = packageGroups.flatMap((group) => {
    const packageType = PACKAGE_TYPE_BY_GROUP[group.label];
    if (!packageType) fail(`Unmapped package group: ${group.label}`);
    return group.options.map((option) => ({
      id: option.id,
      name: option.name,
      packageType,
      price: option.price,
      durationDays: Number(/(\d+) days/.exec(option.detail ?? "")?.[1]) || null,
      sessionDurationMinutes: Number(/(\d+)-minute/.exec(option.detail ?? "")?.[1]) || null,
      isActive: true,
      sortOrder: packageGroups.flatMap((item) => item.options).findIndex((item) => item.id === option.id) + 1,
    }));
  });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.trainingPackage.findMany({ where: { id: { in: rows.map((row) => row.id) } } });
      const existingById = new Map(existing.map((row) => [row.id, row]));

      const differences: string[] = [];
      for (const row of rows) {
        const current = existingById.get(row.id);
        if (!current) continue;
        const changed = (
          [
            ["name", current.name, row.name],
            ["packageType", current.packageType, row.packageType],
            ["price", Number(current.price), row.price],
            ["durationDays", current.durationDays, row.durationDays],
            ["sessionDurationMinutes", current.sessionDurationMinutes, row.sessionDurationMinutes],
            ["isActive", current.isActive, row.isActive],
          ] as const
        ).filter(([, a, b]) => a !== b);
        if (changed.length) differences.push(`${row.id}: ${changed.map(([field]) => field).join(", ")}`);
      }

      const missing = rows.filter((row) => !existingById.has(row.id));
      if (missing.length) await tx.trainingPackage.createMany({ data: missing });
      return { inserted: missing.length, alreadyPresent: existing.length, differences };
    });

    console.log(`Packages in source: ${rows.length}. Inserted: ${result.inserted}. Already present (left unchanged): ${result.alreadyPresent}.`);
    if (result.differences.length) {
      console.log("Existing packages that differ from src/data/packages.ts (not changed):");
      for (const line of result.differences) console.log(`  ${line}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Seeding failed:", error instanceof Error ? error.name : "UnknownError");
  process.exit(1);
});
