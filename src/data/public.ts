import { packageDiscountNote, packageGroups, isPerSession, type PackageOption } from "@/data/packages";
import { site } from "@/data/landing";

/*
 * Public website content that is derived from the price list and the landing data. Keep figures in
 * src/data/packages.ts, not here. Nothing in this file creates a price, a discount or a contact detail.
 *
 * OWNER CONFIRMATION NEEDED before launch (see the public-site report):
 * - Phone and WhatsApp numbers come from src/data/landing.ts, which marks them as placeholders to confirm.
 * - The address comes from the live site footer. It has not been confirmed by the school.
 * - Opening hours, email, map location and the cash discount terms (validity, restrictions, eligible packages)
 *   are not in the project. They are left out until the school supplies them.
 */

export const publicContact = {
  phone: site.phone,
  phoneHref: site.phoneHref,
  whatsapp: site.whatsapp,
  address: "Pitipana Junction, Homagama, Sri Lanka",
} as const;

/** Vehicle category key (from src/data/landing.ts) to the package id of its per-session daily rate. */
export const dailyPackageIdByVehicle: Record<string, string> = {
  car: "daily-car",
  van: "daily-van",
  motorbike: "daily-motorcycle",
  "three-wheeler": "daily-three-wheeler",
};

/** Vehicle category key to the word the package names use for it, for example "Motorcycle Trial Preparation". */
export const packageNameKeywordByVehicle: Record<string, string> = {
  car: "Car",
  van: "Van",
  motorbike: "Motorcycle",
  "three-wheeler": "Three-Wheeler",
};

export type PackageEntry = PackageOption & { groupLabel: string };

export function allPackages(): PackageEntry[] {
  return packageGroups.flatMap((group) => group.options.map((option) => ({ ...option, groupLabel: group.label })));
}

/** The per-session daily rate for a vehicle category, or null when the price list has none. No fallback is used. */
export function dailyRateFor(vehicleKey: string): PackageEntry | null {
  const id = dailyPackageIdByVehicle[vehicleKey];
  if (!id) return null;
  return allPackages().find((option) => option.id === id) ?? null;
}

/**
 * Fixed-fee packages whose name mentions the vehicle category. Per-session daily rates are excluded, because they
 * are listed separately with their own unit.
 */
export function fixedPackagesFor(vehicleKey: string): PackageEntry[] {
  const keyword = packageNameKeywordByVehicle[vehicleKey];
  if (!keyword) return [];
  return allPackages().filter((option) => !isPerSession(option) && option.name.includes(keyword));
}

/**
 * The cash discount wording as the school supplied it. The percentage is not applied to any price on the site.
 * Eligibility, validity and restrictions are not in the project, so they are not shown.
 */
export const cashDiscountNote = packageDiscountNote;
