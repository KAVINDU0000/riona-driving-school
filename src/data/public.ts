import { site } from "@/data/landing";

/*
 * Public website copy and mappings. No prices live here: every price is read from the database through
 * src/lib/packages/catalog.ts. The vehicle mappings below refer to package IDs, not prices.
 *
 * OWNER CONFIRMATION NEEDED before launch (see the public-site report):
 * - Phone and WhatsApp numbers come from src/data/landing.ts, which marks them as placeholders to confirm.
 * - The address comes from the live site footer. It has not been confirmed by the school.
 * - The map location is the Plus Code R2V7+RC5 Homagama, supplied by the school. Confirm it matches the address above.
 * - Opening hours, email and the cash discount terms (validity, restrictions, eligible packages) are not in the
 *   project. They are left out until the school supplies them.
 */

const MAP_PLACE = "R2V7+RC5 Homagama";

export const publicContact = {
  phone: site.phone,
  phoneHref: site.phoneHref,
  whatsapp: site.whatsapp,
  address: "Pitipana Junction, Homagama, Sri Lanka",
  plusCode: "R2V7+RC5",
  locality: "Homagama",
  mapsLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(MAP_PLACE)}`,
  mapsEmbed: `https://www.google.com/maps?q=${encodeURIComponent(MAP_PLACE)}&output=embed`,
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

/** The cash discount wording as the school supplied it. The percentage is not applied to any price on the site. */
export const packageDiscountNote = "5% discount when the full eligible package fee is paid in cash at once.";

/** Eligibility, validity and restrictions are not in the project, so they are not shown. */
export const cashDiscountNote = packageDiscountNote;

/**
 * Transmission shown on the Regular package cards. Each Regular package covers one vehicle with one transmission,
 * so the card shows that transmission instead of the shared "Automatic & Manual" vehicle tag.
 */
export const regularTransmissionByPackageId: Record<string, { tag: string; point: string }> = {
  "regular-car": { tag: "Automatic", point: "Automatic transmission lessons" },
  "regular-van": { tag: "Manual", point: "Manual transmission lessons" },
};
