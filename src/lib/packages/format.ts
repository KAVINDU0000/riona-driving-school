/*
 * Package types and price formatting shared by server and browser code. No database or fixture imports here, so
 * the browser bundle never carries a price list. Prices come from the database through src/lib/packages/catalog.ts.
 */

export type PackageType = "REGULAR" | "TRIAL_PREPARATION" | "ADDITIONAL_VEHICLE" | "DAILY";

/** One package as the public site and the signup form show it. `price` is LKR, from the database. */
export interface CatalogPackage {
  id: string;
  name: string;
  packageType: PackageType;
  /** LKR. For per-session packages this is the rate for one session, not a total fee. */
  price: number;
  detail?: string;
  /** Set for per-session packages. They cannot be registered online yet. */
  pricing?: "per-session";
  /** The section heading the package is listed under. */
  group: string;
}

export interface CatalogGroup {
  label: string;
  options: CatalogPackage[];
}

/** Formats an amount as "LKR 26,000" without locale-dependent output, so server and browser render the same text. */
export function formatLkr(amount: number) {
  return `LKR ${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

export function isPerSession(option: Pick<CatalogPackage, "pricing">) {
  return option.pricing === "per-session";
}

/** Price text for lists and summaries. Per-session rates are labelled so they are never read as a total. */
export function formatPackagePrice(option: Pick<CatalogPackage, "price" | "pricing">) {
  return isPerSession(option) ? `${formatLkr(option.price)} per session` : formatLkr(option.price);
}

/** Finds a package by ID in a list of groups. Returns undefined when it is not there. */
export function findInGroups(groups: CatalogGroup[], id: string): CatalogPackage | undefined {
  for (const group of groups) {
    const found = group.options.find((option) => option.id === id);
    if (found) return found;
  }
  return undefined;
}
