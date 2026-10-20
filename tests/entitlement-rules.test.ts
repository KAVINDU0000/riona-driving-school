import { describe, expect, it } from "vitest";
import { AuthError } from "@/lib/auth/http";
import { MAX_REQUIRED_SESSIONS, parseEntitlementCount, parseEntitlementReason, requireExpectedUpdatedAt } from "@/lib/admin/entitlement-rules";

// Pure rules only: no database is opened by these tests.

function refusal(action: () => unknown) {
  try {
    action();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe("entitlement count rule (1 to 500, integer)", () => {
  it("accepts the two ends of the range and everything between", () => {
    expect(MAX_REQUIRED_SESSIONS).toBe(500);
    expect(parseEntitlementCount(1)).toBe(1);
    expect(parseEntitlementCount(500)).toBe(500);
    expect(parseEntitlementCount(250)).toBe(250);
  });

  it("refuses 0, 501, negatives, fractions, non-numbers and missing values with 400", () => {
    for (const bad of [0, -1, 501, 2.5, Number.NaN, Number.POSITIVE_INFINITY, "3", "", null, undefined, true]) {
      const error = refusal(() => parseEntitlementCount(bad));
      expect(error, `count ${String(bad)}`).toBeInstanceOf(AuthError);
      expect((error as AuthError).status).toBe(400);
    }
  });
});

describe("entitlement reason rule (trimmed, 1 to 300 characters)", () => {
  it("returns the trimmed text", () => {
    expect(parseEntitlementReason("  Initial allocation  ")).toBe("Initial allocation");
  });

  it("refuses missing, empty, whitespace-only and non-string reasons with 400", () => {
    for (const bad of [undefined, null, "", "   ", "\t\n", 42, {}]) {
      const error = refusal(() => parseEntitlementReason(bad));
      expect(error, `reason ${JSON.stringify(bad)}`).toBeInstanceOf(AuthError);
      expect((error as AuthError).status).toBe(400);
    }
  });

  it("accepts exactly 300 characters and refuses 301", () => {
    expect(parseEntitlementReason("x".repeat(300))).toHaveLength(300);
    const error = refusal(() => parseEntitlementReason("x".repeat(301)));
    expect((error as AuthError).status).toBe(400);
  });
});

describe("expectedUpdatedAt rule (exact toISOString format)", () => {
  it("accepts a timestamp in the exact toISOString format", () => {
    expect(requireExpectedUpdatedAt("2026-10-18T10:00:00.000Z")).toBe("2026-10-18T10:00:00.000Z");
  });

  it("refuses missing, blank, malformed and differently formatted values with 400", () => {
    for (const bad of [null, "", "   ", "1", "2026-10-18", "2026-10-18T10:00:00Z", "2026-10-18 10:00:00.000Z"]) {
      const error = refusal(() => requireExpectedUpdatedAt(bad));
      expect(error, `stamp ${JSON.stringify(bad)}`).toBeInstanceOf(AuthError);
      expect((error as AuthError).status).toBe(400);
    }
  });

  it("uses the subject it is given in the refusal message", () => {
    const error = refusal(() => requireExpectedUpdatedAt(null, "The vehicle's last-changed time"));
    expect((error as AuthError).message).toBe("The vehicle's last-changed time is missing or invalid. Reload the page and try again.");
  });
});
