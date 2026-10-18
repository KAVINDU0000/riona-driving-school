import { isPerSession, type CatalogGroup, type CatalogPackage } from "@/lib/packages/format";
import { vehicles } from "@/data/landing";
import { dailyPackageIdByVehicle, packageNameKeywordByVehicle } from "@/data/public";

/** Every active package from the catalog, flattened. */
export function allCatalogPackages(groups: CatalogGroup[]): CatalogPackage[] {
  return groups.flatMap((group) => group.options);
}

/** The per-session daily rate for a vehicle category, or null when the database has none. No fallback is used. */
export function dailyRateFor(packages: CatalogPackage[], vehicleKey: string): CatalogPackage | null {
  const id = dailyPackageIdByVehicle[vehicleKey];
  if (!id) return null;
  return packages.find((option) => option.id === id) ?? null;
}

/**
 * Fixed-fee packages whose name mentions the vehicle category. Per-session daily rates are excluded, because they
 * are listed separately with their own unit.
 */
export function fixedPackagesFor(packages: CatalogPackage[], vehicleKey: string): CatalogPackage[] {
  const keyword = packageNameKeywordByVehicle[vehicleKey];
  if (!keyword) return [];
  return packages.filter((option) => !isPerSession(option) && option.name.includes(keyword));
}

/** The vehicle category a package belongs to, found by the keyword in its name, or null when none matches. */
export function vehicleForPackage(option: Pick<CatalogPackage, "name">): (typeof vehicles)[number] | null {
  return (
    vehicles.find((vehicle) => {
      const keyword = packageNameKeywordByVehicle[vehicle.key];
      return Boolean(keyword) && option.name.includes(keyword);
    }) ?? null
  );
}
