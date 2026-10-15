import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDatabase } from "./helpers";

// These check the rules the migration adds, directly against the database. The application checks the same rules
// first, but a direct write must still be refused.
describe("pricing table rules in the database", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("gives a new package sort order 0 when none is set", async () => {
    const pkg = await prisma.trainingPackage.create({ data: { id: "schema-default", name: "Default", packageType: "REGULAR", price: 1000 } });
    expect(pkg.sortOrder).toBe(0);
  });

  it("refuses a negative price", async () => {
    await expect(
      prisma.trainingPackage.create({ data: { id: "schema-negative", name: "Negative", packageType: "REGULAR", price: -1 } }),
    ).rejects.toThrow();
  });

  it("refuses a per-session package that does not say how long one session lasts", async () => {
    await expect(
      prisma.trainingPackage.create({ data: { id: "schema-daily", name: "Daily", packageType: "DAILY", price: 1000 } }),
    ).rejects.toThrow();
  });

  it("refuses a requirement count outside 1 to 500 at the database", async () => {
    await prisma.trainingPackage.create({ data: { id: "schema-req", name: "Req", packageType: "REGULAR", price: 1000 } });
    for (const requiredSessions of [0, 501]) {
      await expect(
        prisma.trainingPackageItem.create({ data: { packageId: "schema-req", vehicleType: "CAR", trainingType: "REGULAR", requiredSessions } }),
      ).rejects.toThrow();
    }
    await expect(
      prisma.trainingPackageItem.create({ data: { packageId: "schema-req", vehicleType: "CAR", trainingType: "REGULAR", requiredSessions: 500 } }),
    ).resolves.toBeDefined();
  });

  it("refuses to delete a package that has price history", async () => {
    await prisma.trainingPackage.create({ data: { id: "schema-history", name: "Kept", packageType: "REGULAR", price: 1000 } });
    await prisma.trainingPackagePriceChange.create({
      data: { packageId: "schema-history", previousPrice: 900, newPrice: 1000 },
    });
    await expect(prisma.trainingPackage.delete({ where: { id: "schema-history" } })).rejects.toThrow();
  });
});
