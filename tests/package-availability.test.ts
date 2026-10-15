import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/registration/route";
import { filterAvailablePackageGroups, isPerSession, packageGroups } from "@/data/packages";
import { resetRateLimits } from "@/lib/auth/rate-limit";
import { prisma } from "@/lib/prisma";
import { getActivePackageIds } from "@/lib/registration/packages";
import { postRequest, resetDatabase } from "./helpers";

const ALL_IDS = packageGroups.flatMap((group) => group.options.map((option) => option.id));

describe("filterAvailablePackageGroups", () => {
  it("keeps every package, in order and unchanged, when all are available", () => {
    expect(filterAvailablePackageGroups(packageGroups, ALL_IDS)).toEqual(packageGroups);
  });

  it("removes unavailable packages and keeps the rest in their original order", () => {
    const withoutTrialCar = ALL_IDS.filter((id) => id !== "trial-car");
    const groups = filterAvailablePackageGroups(packageGroups, withoutTrialCar);
    const ids = groups.flatMap((group) => group.options.map((option) => option.id));
    expect(ids).toEqual(withoutTrialCar);
    expect(ids).not.toContain("trial-car");
  });

  it("drops a group whose packages are all unavailable", () => {
    const groups = filterAvailablePackageGroups(packageGroups, ALL_IDS.filter((id) => id !== "regular-car-van"));
    expect(groups.map((group) => group.label)).not.toContain("Regular training package");
  });

  it("keeps the per-session flag and price on daily packages", () => {
    const daily = filterAvailablePackageGroups(packageGroups, ["daily-car"]).flatMap((group) => group.options);
    expect(daily).toEqual([expect.objectContaining({ id: "daily-car", price: 2000, pricing: "per-session" })]);
    expect(isPerSession(daily[0])).toBe(true);
  });

  it("offers nothing when no package is available", () => {
    expect(filterAvailablePackageGroups(packageGroups, [])).toEqual([]);
  });
});

describe("active packages in the database", () => {
  const VALID = {
    fullName: "Kasun Silva",
    birthday: "2001-03-04",
    nicNumber: "200112345678",
    phoneNumber: "0771234567",
    email: "kasun.silva@example.com",
    password: "correct-horse-battery",
    address: "No. 8, Temple Road, Galle",
  };

  beforeEach(async () => {
    await resetDatabase();
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "RegistrationRequest" CASCADE');
    resetRateLimits();
    await prisma.trainingPackage.create({ data: { id: "trial-car", name: "Car Trial Preparation", packageType: "TRIAL_PREPARATION", price: 15000, isActive: true } });
    await prisma.trainingPackage.create({ data: { id: "trial-van", name: "Van Trial Preparation", packageType: "TRIAL_PREPARATION", price: 15000, isActive: false } });
  });

  it("returns only the active package ids", async () => {
    expect((await getActivePackageIds()).sort()).toEqual(["trial-car"]);
  });

  it("refuses a direct submission for a listed package that was deactivated, and stores nothing", async () => {
    const response = await POST(postRequest("/api/registration", { ...VALID, packageId: "trial-van" }));
    expect(response.status).toBe(422);
    const body = (await response.json()) as { fields: Record<string, string> };
    expect(body.fields.packageId).toBe("Select an available training package.");
    expect(await prisma.registrationRequest.count()).toBe(0);
  });

  it("accepts the same submission for an active package", async () => {
    const response = await POST(postRequest("/api/registration", { ...VALID, packageId: "trial-car" }));
    expect(response.status).toBe(201);
    expect(await prisma.registrationRequest.count()).toBe(1);
  });

  it("stops offering a package as soon as it is deactivated", async () => {
    await prisma.trainingPackage.update({ where: { id: "trial-car" }, data: { isActive: false } });
    expect(await getActivePackageIds()).toEqual([]);
  });
});
