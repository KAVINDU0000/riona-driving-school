import { describe, expect, it } from "vitest";
import { packageGroups } from "@/data/packages";
import { formatLkr, formatPackagePrice, isPerSession } from "@/lib/packages/format";

// The seed fixture is checked here so the test data stays correct. Live prices come from the database
// (see tests/package-catalog.test.ts).
const allOptions = packageGroups.flatMap((group) => group.options.map((option) => ({ ...option, group: group.label })));
const find = (id: string) => allOptions.find((option) => option.id === id);

describe("seed price list", () => {
  it("marks exactly the four daily packages as per-session", () => {
    const perSession = allOptions.filter(isPerSession).map((option) => option.id);
    expect(perSession.sort()).toEqual(["daily-car", "daily-motorcycle", "daily-three-wheeler", "daily-van"]);
    for (const option of allOptions.filter(isPerSession)) {
      expect(option.group).toBe("Daily individual training");
    }
  });

  it("keeps the source rates and session lengths for the daily packages", () => {
    const expected: Record<string, { price: number; detail: string }> = {
      "daily-car": { price: 2000, detail: "per 30-minute session" },
      "daily-van": { price: 2000, detail: "per 30-minute session" },
      "daily-motorcycle": { price: 1000, detail: "per 60-minute session" },
      "daily-three-wheeler": { price: 1500, detail: "per 60-minute session" },
    };
    for (const [id, want] of Object.entries(expected)) {
      expect(find(id)?.price).toBe(want.price);
      expect(find(id)?.detail).toBe(want.detail);
    }
  });

  it("leaves fixed-fee packages without a per-session marker", () => {
    const fixed = allOptions.filter((option) => !isPerSession(option));
    expect(fixed).toHaveLength(18);
    expect(fixed.every((option) => option.pricing === undefined)).toBe(true);
  });
});

describe("price formatting", () => {
  it("labels a per-session rate so it is never shown as a total", () => {
    expect(formatPackagePrice(find("daily-car")!)).toBe("LKR 2,000 per session");
    expect(formatPackagePrice(find("daily-motorcycle")!)).toBe("LKR 1,000 per session");
  });

  it("shows fixed-fee packages with no per-session wording", () => {
    expect(formatPackagePrice(find("regular-car-van")!)).toBe("LKR 26,000");
    expect(formatPackagePrice(find("trial-car")!)).toBe("LKR 15,000");
  });

  it("formats amounts with thousands separators and no locale dependence", () => {
    expect(formatLkr(26000)).toBe("LKR 26,000");
    expect(formatLkr(999)).toBe("LKR 999");
  });
});
