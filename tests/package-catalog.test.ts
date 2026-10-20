import { beforeEach, describe, expect, it } from "vitest";
import { packageGroups } from "@/data/packages";
import { vehicles } from "@/data/landing";
import { getPublicPackage, getPublicPackageCatalog } from "@/lib/packages/catalog";
import { allCatalogPackages, dailyRateFor, fixedPackagesFor } from "@/lib/packages/public";
import { prisma } from "@/lib/prisma";
import { resetDatabase } from "./helpers";
import { seedPackagesFromFixture } from "./package-fixtures";

beforeEach(async () => {
  await resetDatabase();
  await seedPackagesFromFixture();
});

describe("database-backed public catalog", () => {
  it("lists every active package under the same headings, in the school's order", async () => {
    const groups = await getPublicPackageCatalog();
    expect(groups.map((group) => group.label)).toEqual(packageGroups.map((group) => group.label));
    expect(groups.flatMap((group) => group.options.map((option) => option.id))).toEqual(
      packageGroups.flatMap((group) => group.options.map((option) => option.id)),
    );
  });

  it("takes the price from the database, so a changed price shows at once", async () => {
    await prisma.trainingPackage.update({ where: { id: "trial-car" }, data: { price: 15500 } });
    const option = allCatalogPackages(await getPublicPackageCatalog()).find((item) => item.id === "trial-car");
    expect(option?.price).toBe(15500);
  });

  it("marks per-session packages and builds their detail from the stored session length", async () => {
    expect(await getPublicPackage("daily-motorcycle")).toMatchObject({ price: 1000, pricing: "per-session", detail: "per 60-minute session" });
    const regular = await getPublicPackage("regular-car");
    expect(regular?.detail).toBe("15 days");
    expect(regular?.pricing).toBeUndefined();
  });

  it("uses the database sort order inside each heading", async () => {
    await prisma.trainingPackage.update({ where: { id: "trial-car" }, data: { sortOrder: 0 } });
    const trial = (await getPublicPackageCatalog()).find((group) => group.label === "Official driving trial preparation");
    expect(trial?.options[0].id).toBe("trial-car");
  });

  it("does not offer a package once it is turned off, and does not look it up", async () => {
    await prisma.trainingPackage.update({ where: { id: "trial-van" }, data: { isActive: false } });
    const ids = allCatalogPackages(await getPublicPackageCatalog()).map((option) => option.id);
    expect(ids).not.toContain("trial-van");
    expect(await getPublicPackage("trial-van")).toBeNull();
  });

  it("offers nothing when the database has no packages, and never falls back to the fixture", async () => {
    await resetDatabase();
    expect(await getPublicPackageCatalog()).toEqual([]);
    expect(await getPublicPackage("regular-car")).toBeNull();
  });
});

describe("vehicle pages use the database list", () => {
  it("gives each vehicle its daily rate and its fixed-fee packages", async () => {
    const all = allCatalogPackages(await getPublicPackageCatalog());
    expect(dailyRateFor(all, "car")?.price).toBe(2000);
    expect(dailyRateFor(all, "unknown-category")).toBeNull();
    expect(fixedPackagesFor(all, "car").map((option) => option.id)).toContain("trial-car");
    expect(fixedPackagesFor(all, "car").map((option) => option.id)).not.toContain("daily-car");
    for (const vehicle of vehicles) {
      for (const option of fixedPackagesFor(all, vehicle.key)) {
        expect(option.pricing).toBeUndefined();
      }
    }
  });

  it("shows no daily rate for a vehicle whose daily package is turned off", async () => {
    await prisma.trainingPackage.update({ where: { id: "daily-car" }, data: { isActive: false } });
    expect(dailyRateFor(allCatalogPackages(await getPublicPackageCatalog()), "car")).toBeNull();
  });
});
