// Database-backed. Non-destructive: no reset, no TRUNCATE. Every package is created with this run's ID and tracked for cleanup.
// These check the rules the migration adds, directly against the database. The application checks the same rules
// first, but a direct write must still be refused.
import "./test-mode-guard";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  baseline,
  cleanupFixtures,
  errorText,
  newTracked,
  remainingFixtureRows,
  verifyBaseline,
  type Baseline,
  type Tracked,
} from "./session-fixtures";

let t: Tracked;
let before: Baseline | undefined;

/** A package ID that only this run can produce. */
function idOf(name: string) {
  return `SCH-${t.runId}-${name}`;
}

beforeAll(async () => {
  t = newTracked();
  before = await baseline();
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
  }
  if (failures.length > 0) throw new Error(failures.join("\n"));
});

describe("pricing table rules in the database", () => {
  it("gives a new package sort order 0 when none is set", async () => {
    const pkg = await prisma.trainingPackage.create({ data: { id: idOf("default"), name: "Default", packageType: "REGULAR", price: 1000 } });
    t.packageIds.push(pkg.id);
    expect(pkg.sortOrder).toBe(0);
  });

  it("refuses a negative price", async () => {
    const id = idOf("negative");
    await expect(
      prisma.trainingPackage.create({ data: { id, name: "Negative", packageType: "REGULAR", price: -1 } }),
    ).rejects.toThrow();
    expect(await prisma.trainingPackage.count({ where: { id } })).toBe(0);
  });

  it("refuses a per-session package that does not say how long one session lasts", async () => {
    const id = idOf("daily");
    await expect(
      prisma.trainingPackage.create({ data: { id, name: "Daily", packageType: "DAILY", price: 1000 } }),
    ).rejects.toThrow();
    expect(await prisma.trainingPackage.count({ where: { id } })).toBe(0);
  });

  it("refuses a requirement count outside 1 to 500 at the database", async () => {
    const id = idOf("req");
    const pkg = await prisma.trainingPackage.create({ data: { id, name: "Req", packageType: "REGULAR", price: 1000 } });
    t.packageIds.push(pkg.id);
    for (const requiredSessions of [0, 501]) {
      await expect(
        prisma.trainingPackageItem.create({ data: { packageId: id, vehicleType: "CAR", trainingType: "REGULAR", requiredSessions } }),
      ).rejects.toThrow();
    }
    const item = await prisma.trainingPackageItem.create({
      data: { packageId: id, vehicleType: "CAR", trainingType: "REGULAR", requiredSessions: 500 },
    });
    t.packageItemIds.push(item.id);
    expect(item).toBeDefined();
  });

  it("refuses to delete a package that has price history", async () => {
    const id = idOf("history");
    const pkg = await prisma.trainingPackage.create({ data: { id, name: "Kept", packageType: "REGULAR", price: 1000 } });
    t.packageIds.push(pkg.id);
    const change = await prisma.trainingPackagePriceChange.create({
      data: { packageId: id, previousPrice: 900, newPrice: 1000 },
    });
    t.priceChangeIds.push(change.id);
    await expect(prisma.trainingPackage.delete({ where: { id } })).rejects.toThrow();
    expect(await prisma.trainingPackage.count({ where: { id } })).toBe(1);
  });
});
