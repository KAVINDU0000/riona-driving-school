// Database-free. Phase B domain rules with an injected "today": VET and Revenue Licence states, renewal prerequisites on the renewal
// date, configurable reminder windows, the checklist, the known odometer reading, and the corrective-service link.
import { describe, expect, it } from "vitest";
import {
  CHECKLIST_ITEMS,
  DEFAULT_MAINTENANCE_SETTINGS,
  canLinkServiceToFault,
  checkOdometerReading,
  currentOdometerKm,
  mileageStatus,
  reminderKey,
  reminderOpenOn,
  remindersOpenToday,
  renewalPrerequisites,
  requireRenewalConfirmation,
  resolveReminderLeadDays,
  revenueStatus,
  validateChecklist,
  vetStatus,
  warningWindowDays,
  type MaintenanceSettings,
  type VetTestLite,
} from "@/lib/vehicles/compliance-rules";

const TODAY = "2026-10-20";
const W = 30; // warning window for VET and licences in these tests (the default largest lead time)
const test = (over: Partial<NonNullable<VetTestLite>> = {}): VetTestLite => ({
  testedOn: "2026-01-01",
  result: "PASS",
  certificateExpiresOn: null,
  nextDueOn: null,
  ...over,
});

describe("VET status", () => {
  it("is NOT_APPLICABLE when the administrator has recorded that the vehicle is not applicable", () => {
    expect(vetStatus({ kind: "NOT_APPLICABLE" }, test({ nextDueOn: "2020-01-01" }), TODAY, W).state).toBe("NOT_APPLICABLE");
  });

  it("is EXCEPTION_DOCUMENTED for a documented exception, and dates are not checked", () => {
    expect(vetStatus({ kind: "EXCEPTION_DOCUMENTED" }, test({ nextDueOn: "2020-01-01" }), TODAY, W).state).toBe("EXCEPTION_DOCUMENTED");
  });

  it("is NOT_RECORDED with no test and no decision", () => {
    expect(vetStatus(null, null, TODAY, W)).toEqual({ state: "NOT_RECORDED", dueOn: null, dueKind: null, result: null, resultRecorded: false });
  });

  it("is DUE_DATE_MISSING when a test has no recorded date, and never VALID", () => {
    expect(vetStatus(null, test(), TODAY, W).state).toBe("DUE_DATE_MISSING");
  });

  it("is VALID when the earlier date is beyond the warning window", () => {
    expect(vetStatus(null, test({ nextDueOn: "2026-11-20" }), TODAY, W).state).toBe("VALID"); // 31 days
  });

  it("is DUE_SOON at exactly the window, and on the due day itself", () => {
    expect(vetStatus(null, test({ nextDueOn: "2026-11-19" }), TODAY, W).state).toBe("DUE_SOON"); // 30 days
    expect(vetStatus(null, test({ nextDueOn: TODAY }), TODAY, W).state).toBe("DUE_SOON");
  });

  it("is OVERDUE when the next due date has passed, and EXPIRED when the certificate expiry has passed", () => {
    expect(vetStatus(null, test({ nextDueOn: "2026-10-19" }), TODAY, W)).toMatchObject({ state: "OVERDUE", dueKind: "NEXT_DUE" });
    expect(vetStatus(null, test({ certificateExpiresOn: "2026-10-19" }), TODAY, W)).toMatchObject({ state: "EXPIRED", dueKind: "CERTIFICATE_EXPIRY" });
  });

  it("uses the earlier of the two dates, and says which one decided", () => {
    const both = test({ certificateExpiresOn: "2026-12-31", nextDueOn: "2026-11-01" });
    expect(vetStatus(null, both, TODAY, W)).toMatchObject({ state: "DUE_SOON", dueOn: "2026-11-01", dueKind: "NEXT_DUE" }); // 12 days: inside the 30-day window
  });

  it("does not infer a result: a test with no result is still judged by its dates, and says the result is not recorded", () => {
    const status = vetStatus(null, test({ result: null, nextDueOn: "2027-06-01" }), TODAY, W);
    expect(status.state).toBe("VALID");
    expect(status.result).toBeNull();
    expect(status.resultRecorded).toBe(false);
  });

  it("shows a recorded FAIL as FAILED, whatever the dates say, and keeps the deciding date visible", () => {
    expect(vetStatus(null, test({ result: "FAIL", nextDueOn: "2027-06-01" }), TODAY, W)).toMatchObject({
      state: "FAILED",
      result: "FAIL",
      resultRecorded: true,
      dueOn: "2027-06-01",
      dueKind: "NEXT_DUE",
    });
    expect(vetStatus(null, test({ result: "FAIL", certificateExpiresOn: "2025-01-01" }), TODAY, W).state).toBe("FAILED");
  });
});

describe("Revenue Licence status", () => {
  it("is NOT_APPLICABLE or EXCEPTION_DOCUMENTED when decided, and NOT_RECORDED with no licence", () => {
    expect(revenueStatus({ kind: "NOT_APPLICABLE" }, { dueOn: "2020-01-01" }, TODAY, W).state).toBe("NOT_APPLICABLE");
    expect(revenueStatus({ kind: "EXCEPTION_DOCUMENTED" }, null, TODAY, W).state).toBe("EXCEPTION_DOCUMENTED");
    expect(revenueStatus(null, null, TODAY, W).state).toBe("NOT_RECORDED");
  });

  it("is DUE_SOON on the due day, OVERDUE the day after, and ACTIVE beyond the window", () => {
    expect(revenueStatus(null, { dueOn: TODAY }, TODAY, W).state).toBe("DUE_SOON");
    expect(revenueStatus(null, { dueOn: "2026-10-19" }, TODAY, W)).toMatchObject({ state: "OVERDUE", daysLeft: -1 });
    expect(revenueStatus(null, { dueOn: "2026-11-20" }, TODAY, W).state).toBe("ACTIVE");
  });
});

describe("renewal prerequisites are checked on the renewal date, not today", () => {
  const policies = [{ id: "p1", startsOn: "2026-01-01", expiresOn: "2026-12-31" }];

  it("passes when insurance and VET are valid on the renewal date", () => {
    const check = renewalPrerequisites({
      renewalDate: "2026-11-01",
      policies,
      decision: null,
      latestTest: test({ nextDueOn: "2027-06-01" }),
      settings: DEFAULT_MAINTENANCE_SETTINGS,
    });
    expect(check.warnings).toEqual([]);
    expect(check.legalVerification).toBe("NOT_VERIFIED");
  });

  it("warns when insurance has expired by the renewal date, even though it is valid today", () => {
    const check = renewalPrerequisites({
      renewalDate: "2027-01-05",
      policies,
      decision: null,
      latestTest: test({ nextDueOn: "2028-01-01" }),
      settings: DEFAULT_MAINTENANCE_SETTINGS,
    });
    expect(check.insurance).toEqual({ state: "EXPIRED", ok: false });
    expect(check.warnings.length).toBe(1);
  });

  it("warns when the VET test is missing, and when it is overdue on the renewal date", () => {
    const missing = renewalPrerequisites({ renewalDate: TODAY, policies, decision: null, latestTest: null, settings: DEFAULT_MAINTENANCE_SETTINGS });
    expect(missing.vet).toEqual({ state: "NOT_RECORDED", ok: false });
    const overdue = renewalPrerequisites({
      renewalDate: "2026-12-01",
      policies,
      decision: null,
      latestTest: test({ nextDueOn: "2026-11-15" }),
      settings: DEFAULT_MAINTENANCE_SETTINGS,
    });
    expect(overdue.vet).toEqual({ state: "OVERDUE", ok: false });
  });

  it("does not block: a renewal with warnings needs a recorded confirmation, and records the statuses", () => {
    const check = renewalPrerequisites({ renewalDate: TODAY, policies: [], decision: null, latestTest: null, settings: DEFAULT_MAINTENANCE_SETTINGS });
    expect(requireRenewalConfirmation(check, false).ok).toBe(false);
    const confirmed = requireRenewalConfirmation(check, true);
    expect(confirmed).toMatchObject({ ok: true, confirmationRequired: true });
    if (confirmed.ok) expect(confirmed.auditStatuses).toEqual(check.warnings);
  });

  it("needs no confirmation when nothing is missing", () => {
    const clean = renewalPrerequisites({
      renewalDate: "2026-11-01",
      policies,
      decision: { kind: "NOT_APPLICABLE" },
      latestTest: null,
      settings: DEFAULT_MAINTENANCE_SETTINGS,
    });
    expect(requireRenewalConfirmation(clean, false)).toEqual({ ok: true, confirmationRequired: false, auditStatuses: [] });
  });
});

describe("reminder windows are configurable", () => {
  it("defaults to 30, 14 and 7 days", () => {
    expect(DEFAULT_MAINTENANCE_SETTINGS.reminderLeadDays).toEqual([30, 14, 7]);
    expect(warningWindowDays(DEFAULT_MAINTENANCE_SETTINGS)).toBe(30);
  });

  it("opens each window on exactly the lead day, and closes on the due day", () => {
    expect(reminderOpenOn("2026-11-19", "2026-10-20", 30)).toBe(true); // exactly 30 days before
    expect(reminderOpenOn("2026-11-19", "2026-10-19", 30)).toBe(false); // one day before the window
    expect(reminderOpenOn("2026-11-19", "2026-11-19", 30)).toBe(true); // the due day
    expect(reminderOpenOn("2026-11-19", "2026-11-20", 30)).toBe(false); // after the due day
  });

  it("lists every open window today, largest first, using the configured lead times", () => {
    const settings: MaintenanceSettings = { ...DEFAULT_MAINTENANCE_SETTINGS, reminderLeadDays: [7, 60, 14] };
    expect(remindersOpenToday("2026-11-03", "2026-10-20", settings)).toEqual([60, 14]); // 14 days before: the 60 and 14 windows are both open
    expect(remindersOpenToday("2026-12-19", "2026-10-20", settings)).toEqual([60]);
  });

  it("accepts only whole, in-range, unique lead times, sorted largest first", () => {
    expect(resolveReminderLeadDays([7, 30, 14])).toEqual({ ok: true, leadDays: [30, 14, 7] });
    expect(resolveReminderLeadDays([]).ok).toBe(false);
    expect(resolveReminderLeadDays([0]).ok).toBe(false);
    expect(resolveReminderLeadDays([366]).ok).toBe(false);
    expect(resolveReminderLeadDays([7.5]).ok).toBe(false);
    expect(resolveReminderLeadDays([7, 7]).ok).toBe(false);
    expect(resolveReminderLeadDays([1, 2, 3, 4, 5, 6]).ok).toBe(false);
    expect(resolveReminderLeadDays("30").ok).toBe(false);
  });

  it("builds the same key for the same reminder, so generation is idempotent", () => {
    const a = reminderKey({ vehicleId: "v1", category: "SERVICE", targetRecordId: "s1", dueOn: "2026-11-01", leadDays: 14 });
    const b = reminderKey({ vehicleId: "v1", category: "SERVICE", targetRecordId: "s1", dueOn: "2026-11-01", leadDays: 14 });
    const renewed = reminderKey({ vehicleId: "v1", category: "SERVICE", targetRecordId: "s2", dueOn: "2026-11-01", leadDays: 14 });
    expect(a).toBe(b);
    expect(renewed).not.toBe(a);
  });
});

describe("service checklist", () => {
  it("has the nine items the school listed", () => {
    expect(CHECKLIST_ITEMS).toEqual(["ENGINE", "BRAKES", "SUSPENSION", "STEERING", "TYRES", "BATTERY", "LIGHTS", "LEAKS", "ELECTRICAL"]);
  });

  it("stores a missing item as NOT_CHECKED, so it is never mistaken for a pass", () => {
    const result = validateChecklist([{ item: "BRAKES", result: "PASS" }]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items).toHaveLength(9);
      expect(result.items.find((i) => i.item === "ENGINE")).toEqual({ item: "ENGINE", result: "NOT_CHECKED", note: null });
    }
  });

  it("refuses unknown items, repeated items, unknown results, and notes that are too long", () => {
    expect(validateChecklist([{ item: "WIPERS", result: "PASS" }]).ok).toBe(false);
    expect(validateChecklist([{ item: "BRAKES", result: "PASS" }, { item: "BRAKES", result: "FAIL" }]).ok).toBe(false);
    expect(validateChecklist([{ item: "BRAKES", result: "GOOD" }]).ok).toBe(false);
    expect(validateChecklist([{ item: "BRAKES", result: "ATTENTION", note: "x".repeat(501) }]).ok).toBe(false);
    expect(validateChecklist("ENGINE").ok).toBe(false);
    expect(validateChecklist([null]).ok).toBe(false);
  });

  it("trims notes and turns an empty note into none", () => {
    const result = validateChecklist([{ item: "TYRES", result: "ATTENTION", note: "   " }]);
    expect(result.ok && result.items.find((i) => i.item === "TYRES")?.note).toBeNull();
  });
});

describe("current odometer and mileage status", () => {
  it("uses the latest valid, non-superseded reading, and the higher one on the same date", () => {
    expect(
      currentOdometerKm([
        { serviceDate: "2026-03-01", odometerKm: 40000, superseded: false },
        { serviceDate: "2026-06-01", odometerKm: 45000, superseded: false },
        { serviceDate: "2026-06-01", odometerKm: 45500, superseded: false },
      ]),
    ).toBe(45500);
  });

  it("ignores superseded records and records with no reading", () => {
    expect(
      currentOdometerKm([
        { serviceDate: "2026-06-01", odometerKm: 99999, superseded: true },
        { serviceDate: "2026-07-01", odometerKm: null, superseded: false },
      ]),
    ).toBeNull();
  });

  it("says mileage cannot be determined when no reading is known, and never says up to date", () => {
    expect(mileageStatus(10000, null, 500)).toBe("CANNOT_DETERMINE");
    expect(mileageStatus(null, null, 500)).toBe("NOT_SET");
  });

  it("is OVERDUE at the due reading, DUE_SOON within the threshold, and OK beyond it", () => {
    expect(mileageStatus(10000, 10000, 500)).toBe("OVERDUE");
    expect(mileageStatus(10000, 9500, 500)).toBe("DUE_SOON");
    expect(mileageStatus(10000, 9499, 500)).toBe("OK");
  });

  it("accepts a reading that is equal or higher, and refuses a negative or non-integer reading", () => {
    expect(checkOdometerReading({ reading: 45000, current: 45000, explanation: null })).toEqual({ ok: true, regression: false, auditRequired: false });
    expect(checkOdometerReading({ reading: -1, current: null, explanation: null }).ok).toBe(false);
    expect(checkOdometerReading({ reading: 10.5, current: null, explanation: null }).ok).toBe(false);
  });

  it("refuses a lower reading without an explanation, and accepts it with one, marking it for audit", () => {
    expect(checkOdometerReading({ reading: 44000, current: 45000, explanation: null }).ok).toBe(false);
    expect(checkOdometerReading({ reading: 44000, current: 45000, explanation: "   " }).ok).toBe(false);
    expect(checkOdometerReading({ reading: 44000, current: 45000, explanation: "Clock was replaced" })).toEqual({
      ok: true,
      regression: true,
      auditRequired: true,
    });
  });
});

describe("corrective service and faults", () => {
  it("allows no link at all, which is the normal case for routine service and inspection", () => {
    expect(canLinkServiceToFault({ vehicleId: "v1", category: "ROUTINE_SERVICE" }, null)).toEqual({ ok: true });
    expect(canLinkServiceToFault({ vehicleId: "v1", category: "MECHANICAL_INSPECTION" }, null)).toEqual({ ok: true });
  });

  it("allows a corrective service to link to a fault on the same vehicle", () => {
    expect(canLinkServiceToFault({ vehicleId: "v1", category: "CORRECTIVE_SERVICE" }, { vehicleId: "v1" })).toEqual({ ok: true });
  });

  it("refuses a link from a routine service or inspection, and from a fault on another vehicle", () => {
    expect(canLinkServiceToFault({ vehicleId: "v1", category: "ROUTINE_SERVICE" }, { vehicleId: "v1" }).ok).toBe(false);
    expect(canLinkServiceToFault({ vehicleId: "v1", category: "CORRECTIVE_SERVICE" }, { vehicleId: "v2" }).ok).toBe(false);
  });
});
