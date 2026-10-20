// Database-free. Date boundaries, insurance states and renewals, service due states, repair transitions, lesson availability
// rules, fault warnings, document checks and retention. Every "today" is passed in, so the tests do not depend on the clock.
import { describe, expect, it } from "vitest";
import {
  DOCUMENT_MAX_BYTES,
  EXPIRY_WARNING_DAYS,
  PROVISIONAL_SERVICE_DUE_SOON_DAYS,
  PROVISIONAL_SERVICE_DUE_SOON_KM,
  addDays,
  canAccessVehicleDocuments,
  canMoveRepair,
  checkDocumentMeta,
  checkPolicyPeriod,
  checkRepairDates,
  daysBetween,
  insuranceStatus,
  isDateString,
  isSafetyCriticalOpenFault,
  maintenanceWarnings,
  openFaultWarnings,
  renewalHistory,
  retentionState,
  serviceState,
  sumCosts,
  vehicleAvailability,
  type FaultLite,
  type PolicyPeriod,
} from "@/lib/vehicles/maintenance-rules";

const TODAY = "2026-10-20";

const POLICY = { insurer: "Fixture Insurer", policyNumber: "POL-1", coverage: "Comprehensive", premium: 1000 };

describe("dates", () => {
  it("accepts only real calendar dates", () => {
    expect(isDateString("2028-02-29")).toBe(true);
    expect(isDateString("2026-02-29")).toBe(false);
    expect(isDateString("2026-13-01")).toBe(false);
    expect(isDateString("20-10-2026")).toBe(false);
  });

  it("counts whole days, negative when going back", () => {
    expect(daysBetween("2026-10-20", "2026-10-20")).toBe(0);
    expect(daysBetween("2026-10-20", "2026-11-19")).toBe(30);
    expect(daysBetween("2026-10-20", "2026-10-19")).toBe(-1);
  });

  it("adds days across month and year ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("insurance states", () => {
  const current: PolicyPeriod = { id: "p1", startsOn: "2026-01-01", expiresOn: "2026-12-31" };

  it("is ACTIVE with more than 30 days left", () => {
    const status = insuranceStatus([current], "2026-11-30"); // 31 days left
    expect(status.state).toBe("ACTIVE");
    expect(status.daysLeft).toBe(31);
  });

  it("is EXPIRING_SOON at exactly 30 days, and on the days after", () => {
    expect(insuranceStatus([current], "2026-12-01").state).toBe("EXPIRING_SOON"); // 30 days left
    expect(insuranceStatus([current], "2026-12-01").daysLeft).toBe(EXPIRY_WARNING_DAYS);
    expect(insuranceStatus([current], "2026-12-31").state).toBe("EXPIRING_SOON"); // expiry day itself
  });

  it("is still covered on the expiry day, and EXPIRED the day after", () => {
    expect(insuranceStatus([current], "2026-12-31").daysLeft).toBe(0);
    expect(insuranceStatus([current], "2027-01-01").state).toBe("EXPIRED");
  });

  it("is covered on the start day, and NOT_YET_STARTED the day before", () => {
    expect(insuranceStatus([current], "2026-01-01").state).not.toBe("NOT_YET_STARTED");
    const future: PolicyPeriod = { id: "p2", startsOn: "2027-01-01", expiresOn: "2027-12-31" };
    expect(insuranceStatus([future], "2026-12-31").state).toBe("NOT_YET_STARTED");
  });

  it("is MISSING when no policy has ever been recorded", () => {
    expect(insuranceStatus([], TODAY)).toEqual({ state: "MISSING", policy: null, daysLeft: null });
  });

  it("uses the policy that covers today when there is a renewal", () => {
    const renewal: PolicyPeriod = { id: "p2", startsOn: "2027-01-01", expiresOn: "2027-12-31", renewsPolicyId: "p1" };
    expect(insuranceStatus([current, renewal], "2027-01-01").policy?.id).toBe("p2");
    expect(insuranceStatus([current, renewal], "2026-12-31").policy?.id).toBe("p1");
  });
});

describe("insurance period validation", () => {
  const existing: PolicyPeriod[] = [{ id: "p1", startsOn: "2026-01-01", expiresOn: "2026-12-31" }];

  it("refuses an expiry on or before the start", () => {
    expect(checkPolicyPeriod({ ...POLICY, startsOn: "2027-01-01", expiresOn: "2027-01-01" }, [], null).ok).toBe(false);
    expect(checkPolicyPeriod({ ...POLICY, startsOn: "2027-01-02", expiresOn: "2027-01-01" }, [], null).ok).toBe(false);
  });

  it("refuses dates that are not real", () => {
    expect(checkPolicyPeriod({ ...POLICY, startsOn: "2027-02-30", expiresOn: "2027-12-31" }, [], null).ok).toBe(false);
  });

  it("refuses a period that starts on the day another one expires (inclusive overlap)", () => {
    const result = checkPolicyPeriod({ ...POLICY, startsOn: "2026-12-31", expiresOn: "2027-06-30" }, existing, null);
    expect(result.ok).toBe(false);
  });

  it("allows a period that starts the day after another expires", () => {
    expect(checkPolicyPeriod({ ...POLICY, startsOn: "2027-01-01", expiresOn: "2027-12-31" }, existing, null).ok).toBe(true);
  });

  it("refuses a period that wholly contains an existing one", () => {
    expect(checkPolicyPeriod({ ...POLICY, startsOn: "2025-06-01", expiresOn: "2027-06-01" }, existing, null).ok).toBe(false);
  });

  it("accepts a renewal that starts after the period it renews", () => {
    expect(checkPolicyPeriod({ ...POLICY, startsOn: "2027-01-01", expiresOn: "2027-12-31" }, existing, "p1").ok).toBe(true);
  });

  it("refuses a renewal of a policy that is not on this vehicle, or that starts before it", () => {
    expect(checkPolicyPeriod({ ...POLICY, startsOn: "2027-01-01", expiresOn: "2027-12-31" }, existing, "other-vehicle-policy").ok).toBe(false);
    expect(checkPolicyPeriod({ ...POLICY, startsOn: "2025-06-01", expiresOn: "2025-12-31" }, existing, "p1").ok).toBe(false);
  });
});

describe("renewal history", () => {
  it("returns the chain oldest first", () => {
    const policies: PolicyPeriod[] = [
      { id: "c", startsOn: "2028-01-01", expiresOn: "2028-12-31", renewsPolicyId: "b" },
      { id: "a", startsOn: "2026-01-01", expiresOn: "2026-12-31" },
      { id: "b", startsOn: "2027-01-01", expiresOn: "2027-12-31", renewsPolicyId: "a" },
    ];
    expect(renewalHistory(policies, "c").map((p) => p.id)).toEqual(["a", "b", "c"]);
  });

  it("stops at a missing link and does not loop on a cycle", () => {
    const broken: PolicyPeriod[] = [{ id: "b", startsOn: "2027-01-01", expiresOn: "2027-12-31", renewsPolicyId: "missing" }];
    expect(renewalHistory(broken, "b").map((p) => p.id)).toEqual(["b"]);
    const cycle: PolicyPeriod[] = [
      { id: "x", startsOn: "2026-01-01", expiresOn: "2026-12-31", renewsPolicyId: "y" },
      { id: "y", startsOn: "2027-01-01", expiresOn: "2027-12-31", renewsPolicyId: "x" },
    ];
    expect(renewalHistory(cycle, "x").length).toBe(2);
  });
});

describe("service due states (derived from the latest record next-service date and odometer)", () => {
  const next = (nextServiceDate: string | null, nextServiceOdometerKm: number | null = null) => ({ nextServiceDate, nextServiceOdometerKm });
  it("is DUE_SOON on the due day itself, and OVERDUE the day after", () => {
    expect(serviceState(next(TODAY), TODAY, null)).toBe("DUE_SOON");
    expect(serviceState(next("2026-10-19"), TODAY, null)).toBe("OVERDUE");
  });

  it("is DUE_SOON within 14 days, and SCHEDULED beyond that", () => {
    expect(serviceState(next("2026-11-03"), TODAY, null)).toBe("DUE_SOON"); // 14 days
    expect(serviceState(next("2026-11-04"), TODAY, null)).toBe("SCHEDULED"); // 15 days
  });

  it("is OVERDUE when the odometer reaches the due reading, and DUE_SOON within 500 km", () => {
    expect(serviceState(next(null, 10000), TODAY, 10000)).toBe("OVERDUE");
    expect(serviceState(next(null, 10000), TODAY, 9500)).toBe("DUE_SOON");
    expect(serviceState(next(null, 10000), TODAY, 9499)).toBe("SCHEDULED");
  });

  it("ignores the odometer when no current reading is known", () => {
    expect(serviceState(next(null, 10000), TODAY, null)).toBe("SCHEDULED");
  });

  it("is NOT_SET when the latest record gives neither a date nor an odometer, or there is no record", () => {
    expect(serviceState(next(null, null), TODAY, 10000)).toBe("NOT_SET");
    expect(serviceState(null, TODAY, 10000)).toBe("NOT_SET");
  });
});

describe("state moves", () => {
  it("moves repairs forward only, and closed repairs never move", () => {
    expect(canMoveRepair("REPORTED", "DIAGNOSED")).toBe(true);
    expect(canMoveRepair("IN_REPAIR", "COMPLETED")).toBe(true);
    expect(canMoveRepair("DIAGNOSED", "REPORTED")).toBe(false);
    expect(canMoveRepair("COMPLETED", "IN_REPAIR")).toBe(false);
    expect(canMoveRepair("CANCELLED", "IN_REPAIR")).toBe(false);
  });
});

describe("repair dates", () => {
  it("refuses a future report, a completion before the report, and a future completion", () => {
    expect(checkRepairDates("2026-10-21", null, TODAY).ok).toBe(false);
    expect(checkRepairDates("2026-10-10", "2026-10-09", TODAY).ok).toBe(false);
    expect(checkRepairDates("2026-10-10", "2026-10-21", TODAY).ok).toBe(false);
  });

  it("accepts a report and completion on the same day", () => {
    expect(checkRepairDates(TODAY, TODAY, TODAY).ok).toBe(true);
  });
});

describe("safety-critical faults are an administrator warning, never a booking block", () => {
  const minor: FaultLite = { status: "REPORTED", severity: "LOW", makesUnavailable: false };
  const unavailable: FaultLite = { status: "IN_REPAIR", severity: "MEDIUM", makesUnavailable: true };
  const critical: FaultLite = { status: "DIAGNOSED", severity: "CRITICAL", makesUnavailable: false };
  const closedCritical: FaultLite = { status: "COMPLETED", severity: "CRITICAL", makesUnavailable: true };

  it("an open fault is safety-critical when it makes the vehicle unavailable or is CRITICAL; a closed one never is", () => {
    expect(isSafetyCriticalOpenFault(minor)).toBe(false);
    expect(isSafetyCriticalOpenFault(unavailable)).toBe(true);
    expect(isSafetyCriticalOpenFault(critical)).toBe(true);
    expect(isSafetyCriticalOpenFault(closedCritical)).toBe(false);
  });

  it("an ACTIVE vehicle stays available with an open safety-critical fault, which is only a warning", () => {
    const warnings = openFaultWarnings([unavailable, critical]);
    expect(warnings).toEqual(["2 open safety-critical fault(s) recorded for this vehicle. Review them. Booking is not blocked by faults."]);
    expect(vehicleAvailability("ACTIVE", warnings)).toEqual({ available: true, warnings });
  });

  it("no warning is produced for minor or closed faults", () => {
    expect(openFaultWarnings([minor, closedCritical])).toEqual([]);
  });

  it("a vehicle that is not ACTIVE is unavailable, whatever its faults say", () => {
    expect(vehicleAvailability("MAINTENANCE", [])).toMatchObject({ available: false, reason: "STATUS_NOT_ACTIVE" });
    expect(vehicleAvailability("INACTIVE", [])).toMatchObject({ available: false, reason: "STATUS_NOT_ACTIVE" });
  });

  it("warnings never change availability", () => {
    const warnings = ["Insurance expires in 3 day(s)."];
    expect(vehicleAvailability("ACTIVE", warnings)).toEqual({ available: true, warnings });
  });

  it("the service thresholds are provisional defaults (14 days, 500 km), not permanent rules", () => {
    expect(PROVISIONAL_SERVICE_DUE_SOON_DAYS).toBe(14);
    expect(PROVISIONAL_SERVICE_DUE_SOON_KM).toBe(500);
  });
});

describe("maintenance warnings", () => {
  const services = [
    { id: "s1", state: "OVERDUE" as const },
    { id: "s2", state: "DUE_SOON" as const },
  ];

  it("names each insurance state that needs attention", () => {
    expect(maintenanceWarnings({ insurance: insuranceStatus([], TODAY), services: [] })).toContain("No insurance is recorded for this vehicle.");
    const expired = insuranceStatus([{ startsOn: "2025-01-01", expiresOn: "2025-12-31" }], TODAY);
    expect(maintenanceWarnings({ insurance: expired, services: [] })).toContain("Insurance for this vehicle has expired.");
    const soon = insuranceStatus([{ startsOn: "2026-01-01", expiresOn: "2026-10-30" }], TODAY);
    expect(maintenanceWarnings({ insurance: soon, services: [] })).toContain("Insurance expires in 10 day(s).");
  });

  it("counts overdue and due-soon service items", () => {
    const active = insuranceStatus([{ startsOn: "2026-01-01", expiresOn: "2027-12-31" }], TODAY);
    expect(maintenanceWarnings({ insurance: active, services })).toEqual(["1 service item(s) overdue.", "1 service item(s) due soon."]);
  });

  it("is empty for a vehicle with current insurance and no service items due", () => {
    const active = insuranceStatus([{ startsOn: "2026-01-01", expiresOn: "2027-12-31" }], TODAY);
    expect(maintenanceWarnings({ insurance: active, services: [] })).toEqual([]);
  });

  it("includes the administrator fault warning, and it is only a warning", () => {
    const active = insuranceStatus([{ startsOn: "2026-01-01", expiresOn: "2027-12-31" }], TODAY);
    const critical: FaultLite = { status: "REPORTED", severity: "CRITICAL", makesUnavailable: false };
    const warnings = maintenanceWarnings({ insurance: active, services: [], faults: [critical] });
    expect(warnings).toEqual([openFaultWarnings([critical])[0]]);
    expect(vehicleAvailability("ACTIVE", warnings).available).toBe(true);
  });
});

describe("costs", () => {
  it("adds money to the cent without floating-point drift", () => {
    expect(sumCosts([0.1, 0.2])).toBe(0.3);
    expect(sumCosts([])).toBe(0);
    expect(sumCosts([1500, 250.5])).toBe(1750.5);
  });
});

describe("document access and checks", () => {
  it("only administrators may access vehicle documents", () => {
    expect(canAccessVehicleDocuments("ADMIN")).toBe(true);
    expect(canAccessVehicleDocuments("INSTRUCTOR")).toBe(false);
    expect(canAccessVehicleDocuments("STUDENT")).toBe(false);
    expect(canAccessVehicleDocuments(undefined)).toBe(false);
  });

  it("accepts the five database kinds and the three file types", () => {
    for (const kind of ["INSURANCE_POLICY", "EMISSION_CERTIFICATE", "REVENUE_LICENCE", "SERVICE_INVOICE", "INSPECTION_REPORT"]) {
      expect(checkDocumentMeta({ kind, mimeType: "application/pdf", fileSizeBytes: 10, originalFileName: "a.pdf" }).ok).toBe(true);
    }
  });

  it("refuses other types, empty and oversized files, and an unnamed file", () => {
    expect(checkDocumentMeta({ kind: "INSURANCE_POLICY", mimeType: "image/gif", fileSizeBytes: 10, originalFileName: "a.gif" }).ok).toBe(false);
    expect(checkDocumentMeta({ kind: "OTHER", mimeType: "application/pdf", fileSizeBytes: 10, originalFileName: "a.pdf" }).ok).toBe(false);
    expect(checkDocumentMeta({ kind: "SERVICE_INVOICE", mimeType: "application/pdf", fileSizeBytes: 0, originalFileName: "a.pdf" }).ok).toBe(false);
    expect(checkDocumentMeta({ kind: "SERVICE_INVOICE", mimeType: "application/pdf", fileSizeBytes: DOCUMENT_MAX_BYTES + 1, originalFileName: "a.pdf" }).ok).toBe(false);
    expect(checkDocumentMeta({ kind: "SERVICE_INVOICE", mimeType: "application/pdf", fileSizeBytes: DOCUMENT_MAX_BYTES, originalFileName: "a.pdf" }).ok).toBe(true);
    expect(checkDocumentMeta({ kind: "SERVICE_INVOICE", mimeType: "application/pdf", fileSizeBytes: 10, originalFileName: "   " }).ok).toBe(false);
  });
});

describe("document retention", () => {
  const deleted = new Date("2025-10-20T00:00:00Z");

  it("a live document is ACTIVE", () => {
    expect(retentionState(null, new Date("2026-10-20T00:00:00Z"))).toBe("ACTIVE");
  });

  it("a soft-deleted document is kept for 364 days, and becomes REVIEW_DUE at 365", () => {
    const day364 = new Date(deleted.getTime() + 364 * 24 * 60 * 60 * 1000);
    const day365 = new Date(deleted.getTime() + 365 * 24 * 60 * 60 * 1000);
    expect(retentionState(deleted, day364)).toBe("DELETED_RETAINED");
    expect(retentionState(deleted, day365)).toBe("REVIEW_DUE");
  });

  it("a deletion timestamp in the future is treated as just deleted, not as due", () => {
    expect(retentionState(new Date("2026-10-21T00:00:00Z"), new Date("2026-10-20T00:00:00Z"))).toBe("DELETED_RETAINED");
  });
});
