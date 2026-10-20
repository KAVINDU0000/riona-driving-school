import { describe, expect, it } from "vitest";
import { CANCELLATION_REASON_MAX } from "@/lib/lessons/cancellation";
import {
  ENTITLEMENT_REASON_MAX,
  MAX_REQUIRED_SESSIONS,
  MIN_REQUIRED_SESSIONS,
  checkEntitlementInput,
  describeChange,
  formatChangeTime,
  pendingSummary,
} from "@/lib/admin/entitlement-input";

// The form's check. Pure: no database, no browser, no React.

const good = { count: "5", reason: "Initial allocation", used: 0 };

describe("entitlement form input check", () => {
  it("uses the agreed limits, and the reason limit matches the cancellation limit", () => {
    expect([MIN_REQUIRED_SESSIONS, MAX_REQUIRED_SESSIONS, ENTITLEMENT_REASON_MAX]).toEqual([1, 500, 300]);
    expect(ENTITLEMENT_REASON_MAX).toBe(CANCELLATION_REASON_MAX);
  });

  it("accepts a valid count and a trimmed reason", () => {
    expect(checkEntitlementInput({ ...good, reason: "  Initial allocation  " })).toEqual({ ok: true, count: 5, reason: "Initial allocation" });
  });

  it("accepts 1 and 500, and refuses 0, 501, fractions, blanks and non-numbers", () => {
    expect(checkEntitlementInput({ ...good, count: "1" }).ok).toBe(true);
    expect(checkEntitlementInput({ ...good, count: "500" }).ok).toBe(true);
    for (const bad of ["0", "501", "2.5", "", "   ", "abc", "-3"]) {
      const result = checkEntitlementInput({ ...good, count: bad });
      expect(result.ok, `count "${bad}"`).toBe(false);
      if (!result.ok) expect(result.message).toBe("Enter a whole number of sessions from 1 to 500.");
    }
  });

  it("refuses a count below the completed plus scheduled sessions, and accepts a count equal to them", () => {
    const below = checkEntitlementInput({ count: "2", reason: "Too low", used: 3 });
    expect(below).toEqual({ ok: false, message: "The count cannot be below the 3 sessions already completed or scheduled." });
    expect(checkEntitlementInput({ count: "3", reason: "Exactly used", used: 3 }).ok).toBe(true);
    const one = checkEntitlementInput({ count: "0", reason: "x", used: 1 });
    expect(one.ok).toBe(false);
    if (!one.ok) expect(one.message).toBe("Enter a whole number of sessions from 1 to 500.");
    const singular = checkEntitlementInput({ count: "1", reason: "Only one", used: 1 });
    expect(singular.ok).toBe(true);
    const belowOne = checkEntitlementInput({ count: "1", reason: "Only one", used: 2 });
    expect(belowOne).toEqual({ ok: false, message: "The count cannot be below the 2 sessions already completed or scheduled." });
  });

  it("requires a non-blank trimmed reason, and refuses one longer than 300 characters", () => {
    for (const reason of ["", "   ", "\t\n"]) {
      const result = checkEntitlementInput({ ...good, reason });
      expect(result).toEqual({ ok: false, message: "Enter the reason for confirming or changing this session count." });
    }
    expect(checkEntitlementInput({ ...good, reason: "x".repeat(300) }).ok).toBe(true);
    expect(checkEntitlementInput({ ...good, reason: "x".repeat(301) })).toEqual({ ok: false, message: "The reason must be 300 characters or fewer." });
  });
});

describe("pending allocation wording", () => {
  it("says nothing is waiting when none are, and counts the rest", () => {
    expect(pendingSummary(0)).toBe("No requirements are waiting for a session count.");
    expect(pendingSummary(1)).toBe("1 requirement is waiting for a session count. Students cannot book them until it is confirmed.");
    expect(pendingSummary(3)).toBe("3 requirements are waiting for a session count. Students cannot book them until it is confirmed.");
  });
});

describe("confirmation history time", () => {
  it("shows the time in Sri Lanka, so 17:42 UTC reads as 23:12 on the same day", () => {
    // 17:42:01 UTC is 23:12:01 in Asia/Colombo (UTC+05:30). The exact layout depends on the runtime's locale data, so
    // only the date and the clock time are checked.
    const text = formatChangeTime("2026-10-18T17:42:01.000Z");
    expect(text).toContain("18/10/2026");
    expect(text).toContain("23:12");
  });
});

describe("confirmation history wording", () => {
  it("describes the first confirmation, a repeat, and a change", () => {
    expect(describeChange({ previousRequiredSessions: null, newRequiredSessions: 5 })).toBe("Confirmed at 5 sessions");
    expect(describeChange({ previousRequiredSessions: 5, newRequiredSessions: 5 })).toBe("Confirmed again at 5 sessions");
    expect(describeChange({ previousRequiredSessions: 5, newRequiredSessions: 8 })).toBe("Changed from 5 to 8 sessions");
  });
});
