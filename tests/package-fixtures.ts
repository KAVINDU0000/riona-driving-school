import { packageGroups } from "@/data/packages";
import type { PackageType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const TYPE_BY_GROUP: Record<string, PackageType> = {
  "Regular training package": "REGULAR",
  "Official driving trial preparation": "TRIAL_PREPARATION",
  "Additional vehicle training": "ADDITIONAL_VEHICLE",
  "Daily individual training": "DAILY",
};

/**
 * Inserts the seed price list (src/data/packages.ts) into the test database, in the school's order. The fixture is
 * test data only: the application reads prices from the database, so tests that need packages call this after
 * resetDatabase().
 */
export async function seedPackagesFromFixture() {
  const options = packageGroups.flatMap((group) => group.options.map((option) => ({ group: group.label, option })));
  await prisma.trainingPackage.createMany({
    data: options.map(({ group, option }, index) => {
      const packageType = TYPE_BY_GROUP[group];
      return {
        id: option.id,
        name: option.name,
        packageType,
        price: option.price,
        durationDays: option.id === "regular-car-van" ? 15 : null,
        sessionDurationMinutes: packageType === "DAILY" ? Number(/(\d+)-minute/.exec(option.detail ?? "")?.[1]) : null,
        isActive: true,
        sortOrder: index + 1,
      };
    }),
  });
}
