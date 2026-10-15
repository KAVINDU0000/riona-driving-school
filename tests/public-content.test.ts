import { describe, expect, it } from "vitest";
import { navLinks } from "@/data/landing";
import { cashDiscountNote, publicContact } from "@/data/public";
import { formatLkr, formatPackagePrice } from "@/lib/packages/format";

// Price figures come from the database. Those checks live in tests/package-catalog.test.ts.
describe("public price wording", () => {
  it("formats figures in the price list's style, and never shows a per-session rate as a total", () => {
    expect(formatLkr(26000)).toBe("LKR 26,000");
    expect(formatPackagePrice({ price: 2000, pricing: "per-session" })).toBe("LKR 2,000 per session");
    expect(formatPackagePrice({ price: 26000 })).toBe("LKR 26,000");
  });

  it("keeps the cash discount wording as the school supplied it, with no discounted amount", () => {
    expect(cashDiscountNote).toContain("5%");
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
