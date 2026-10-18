/*
 * The main packages shown on /packages. Each one links to /packages/[slug], which lists its sub-packages. The labels
 * match the group headings in src/lib/packages/catalog.ts, which come from the package type in the database.
 */
export const PACKAGE_GROUPS = [
  {
    slug: "regular",
    label: "Regular training package",
    note: "A fixed total fee for the full regular training package.",
  },
  {
    slug: "trial-preparation",
    label: "Official driving trial preparation",
    note: "Preparation for the official driving trial. Preparation does not guarantee a pass, a test date or a licence.",
  },
  {
    slug: "additional-vehicle",
    label: "Additional vehicle training",
    note: "Fixed total fees for combined car, van, motorcycle and three-wheeler training.",
  },
  {
    slug: "daily-rates",
    label: "Daily individual training",
    note: "Charged per session, not as a package total. Each rate shows the length of one session. Per-session rates are arranged with the school.",
  },
] as const;

export function packageGroupBySlug(slug: string) {
  return PACKAGE_GROUPS.find((group) => group.slug === slug) ?? null;
}
