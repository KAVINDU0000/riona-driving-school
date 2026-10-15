import { describe, expect, it } from "vitest";
import { formatLkr, formatPackagePrice, isPerSession, packageGroups } from "@/data/packages";
import { navLinks, vehicles } from "@/data/landing";
import {
  allPackages,
  cashDiscountNote,
  dailyRateFor,
  dailyPackageIdByVehicle,
  fixedPackagesFor,
  packageNameKeywordByVehicle,
  publicContact,
} from "@/data/public";

describe("public price content", () => {
  it("uses the price list's exact figures and labels, with no discounted amounts", () => {
    expect(formatLkr(26000)).toBe("LKR 26,000");
    expect(formatPackagePrice({ price: 2000, pricing: "per-session" })).toBe("LKR 2,000 per session");
    expect(formatPackagePrice({ price: 26000 })).toBe("LKR 26,000");
    // Every package fee is the price-list figure. No package is shown at a reduced amount.
    expect(allPackages().find((option) => option.id === "regular-car-van")?.price).toBe(26000);
    expect(cashDiscountNote).toContain("5%");
  });

  it("gives every vehicle category a daily rate from the price list, or none at all", () => {
    for (const vehicle of vehicles) {
      const daily = dailyRateFor(vehicle.key);
      if (daily) {
        expect(isPerSession(daily)).toBe(true);
        expect(daily.id).toBe(dailyPackageIdByVehicle[vehicle.key]);
      }
    }
    expect(dailyRateFor("car")?.price).toBe(2000);
    expect(dailyRateFor("motorbike")?.price).toBe(1000);
    expect(dailyRateFor("unknown-category")).toBeNull();
  });

  it("lists fixed-fee packages for a category, and never a per-session rate among them", () => {
    for (const vehicle of vehicles) {
      for (const option of fixedPackagesFor(vehicle.key)) {
        expect(isPerSession(option)).toBe(false);
        expect(option.name).toContain(packageNameKeywordByVehicle[vehicle.key]);
      }
    }
    expect(fixedPackagesFor("car").map((option) => option.id)).toContain("trial-car");
    expect(fixedPackagesFor("car").map((option) => option.id)).not.toContain("daily-car");
  });

  it("keeps every price-list group, so each section of the packages page has content", () => {
    expect(packageGroups.every((group) => group.options.length > 0)).toBe(true);
    expect(allPackages().every((option) => Number.isFinite(option.price) && option.price > 0)).toBe(true);
  });
});

describe("public navigation and contact content", () => {
  it("points every navigation link at a real route, never a home-page anchor", () => {
    for (const link of navLinks) {
      expect(link.href.startsWith("/")).toBe(true);
      expect(link.href.includes("#")).toBe(false);
      expect(link.href.startsWith("/portal")).toBe(false);
    }
  });

  it("uses tel and WhatsApp links for the verified contact channels only", () => {
    expect(publicContact.phoneHref.startsWith("tel:")).toBe(true);
    expect(publicContact.whatsapp.startsWith("https://wa.me/")).toBe(true);
  });
});
