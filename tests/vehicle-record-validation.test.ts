// Database-free. Application-level validation that mirrors the draft database constraints, and the latest-service-record rule.
import { describe, expect, it } from "vitest";
import {
  CERTIFICATE_NUMBER_MAX,
  FAULT_DESCRIPTION_MAX_CHARS,
  POLICY_INSURER_MAX,
  checkDecisionReason,
  checkDocumentName,
  checkEmissionTestRecord,
  checkFaultRecord,
  checkMoney,
  checkPolicyDates,
  checkPolicyFields,
  checkRevenueLicenceRecord,
  checkServiceRecord,
  moneyToCents,
} from "@/lib/vehicles/record-validation";
import { DOCUMENT_KINDS, checkDocumentMeta, serviceState } from "@/lib/vehicles/maintenance-rules";
import { latestNextService } from "@/lib/vehicles/compliance-rules";

const ok = (c: { ok: boolean }) => c.ok === true;

describe("money is exact cents, as Decimal(10,2) stores it", () => {
  it("converts whole and two-decimal amounts, and refuses a third decimal place", () => {
    expect(moneyToCents(1500.5)).toBe(150050);
    expect(moneyToCents(0.1 + 0.2)).toBe(30); // float noise is absorbed, not treated as a third decimal
    expect(moneyToCents(1.005)).toBeNull();
    expect(moneyToCents(Number.NaN)).toBeNull();
  });

  it("refuses a negative amount, and an amount too large for Decimal(10,2)", () => {
    expect(ok(checkMoney(-1, "Cost"))).toBe(false);
    expect(ok(checkMoney(99999999.99, "Cost"))).toBe(true);
    expect(ok(checkMoney(100000000, "Cost"))).toBe(false);
    expect(ok(checkMoney(0, "Cost"))).toBe(true);
  });
});

describe("document name length (database: 1 to 200)", () => {
  it("accepts 1 to 200 characters after trimming, and refuses blank or longer names", () => {
    expect(ok(checkDocumentName("  policy.pdf  "))).toBe(true);
    expect(ok(checkDocumentName("n".repeat(200)))).toBe(true);
    expect(ok(checkDocumentName("n".repeat(201)))).toBe(false);
    expect(ok(checkDocumentName("   "))).toBe(false);
  });
});

describe("document kinds match the database enum exactly", () => {
  it("are the five database values", () => {
    expect([...DOCUMENT_KINDS]).toEqual(["INSURANCE_POLICY", "EMISSION_CERTIFICATE", "REVENUE_LICENCE", "SERVICE_INVOICE", "INSPECTION_REPORT"]);
  });

  it("refuse the old names", () => {
    for (const kind of ["INSURANCE_CERTIFICATE", "REPAIR_DOCUMENT", "INSPECTION_CERTIFICATE"]) {
      expect(ok(checkDocumentMeta({ kind, mimeType: "application/pdf", fileSizeBytes: 10, originalFileName: "a.pdf" }))).toBe(false);
    }
  });
});

describe("insurance policy fields (database: insurer 1 to 200, policy number 1 to 100, premium at least zero)", () => {
  const base = { insurer: "Insurer A", policyNumber: "POL-1", coverage: "Comprehensive", premium: 25000 };

  it("accepts a complete, valid policy", () => {
    expect(ok(checkPolicyFields(base))).toBe(true);
  });

  it("refuses a blank or over-long insurer and policy number", () => {
    expect(ok(checkPolicyFields({ ...base, insurer: "  " }))).toBe(false);
    expect(ok(checkPolicyFields({ ...base, insurer: "x".repeat(POLICY_INSURER_MAX + 1) }))).toBe(false);
    expect(ok(checkPolicyFields({ ...base, policyNumber: "" }))).toBe(false);
    expect(ok(checkPolicyFields({ ...base, policyNumber: "p".repeat(101) }))).toBe(false);
  });

  it("requires a coverage type (application rule)", () => {
    expect(ok(checkPolicyFields({ ...base, coverage: " " }))).toBe(false);
  });

  it("refuses a negative premium and a premium with a third decimal place", () => {
    expect(ok(checkPolicyFields({ ...base, premium: -1 }))).toBe(false);
    expect(ok(checkPolicyFields({ ...base, premium: 10.001 }))).toBe(false);
  });

  it("refuses an expiry on or before the start, and a date that is not real", () => {
    expect(ok(checkPolicyDates("2026-01-01", "2026-12-31"))).toBe(true);
    expect(ok(checkPolicyDates("2026-01-01", "2026-01-01"))).toBe(false);
    expect(ok(checkPolicyDates("2026-02-30", "2026-12-31"))).toBe(false);
  });
});

describe("emission test dates", () => {
  const base = { testedOn: "2026-10-01", issuedOn: "2026-10-01", certificateExpiresOn: "2027-10-01", nextDueOn: "2027-10-01", certificateNumber: "CERT-1" };

  it("accepts consistent dates, and an unrecorded issue or due date", () => {
    expect(ok(checkEmissionTestRecord(base))).toBe(true);
    expect(ok(checkEmissionTestRecord({ ...base, issuedOn: null, certificateExpiresOn: null, nextDueOn: null, certificateNumber: null }))).toBe(true);
  });

  it("refuses a certificate that expires before it was issued, and a next due date before the test", () => {
    expect(ok(checkEmissionTestRecord({ ...base, certificateExpiresOn: "2026-09-30" }))).toBe(false);
    expect(ok(checkEmissionTestRecord({ ...base, nextDueOn: "2026-09-30" }))).toBe(false);
  });

  it("bounds the certificate number", () => {
    expect(ok(checkEmissionTestRecord({ ...base, certificateNumber: "c".repeat(CERTIFICATE_NUMBER_MAX) }))).toBe(true);
    expect(ok(checkEmissionTestRecord({ ...base, certificateNumber: "c".repeat(CERTIFICATE_NUMBER_MAX + 1) }))).toBe(false);
    expect(ok(checkEmissionTestRecord({ ...base, certificateNumber: "  " }))).toBe(false);
  });
});

describe("revenue licence dates", () => {
  it("requires a due date, and refuses a due or renewal date before the issue date", () => {
    expect(ok(checkRevenueLicenceRecord({ issuedOn: "2026-01-01", renewedOn: "2026-01-01", dueOn: "2027-01-01", licenceNumber: "RL-1" }))).toBe(true);
    expect(ok(checkRevenueLicenceRecord({ issuedOn: "2026-06-01", renewedOn: null, dueOn: "2026-05-31", licenceNumber: null }))).toBe(false);
    expect(ok(checkRevenueLicenceRecord({ issuedOn: "2026-06-01", renewedOn: "2026-05-31", dueOn: "2027-06-01", licenceNumber: null }))).toBe(false);
    expect(ok(checkRevenueLicenceRecord({ issuedOn: null, renewedOn: null, dueOn: "not-a-date", licenceNumber: null }))).toBe(false);
  });
});

describe("service record: total, odometer and dates", () => {
  const base = {
    serviceDate: "2026-10-01",
    odometerKm: 45000,
    partsCost: 1500.5,
    labourCost: 500.25,
    totalCost: 2000.75,
    nextServiceDate: "2027-04-01",
    nextServiceOdometerKm: 50000,
  };

  it("accepts a service whose total equals parts plus labour exactly, in cents", () => {
    expect(ok(checkServiceRecord(base))).toBe(true);
  });

  it("refuses a total that differs by one cent from parts plus labour", () => {
    expect(ok(checkServiceRecord({ ...base, totalCost: 2000.76 }))).toBe(false);
    expect(ok(checkServiceRecord({ ...base, totalCost: 2000.74 }))).toBe(false);
  });

  it("refuses a negative cost and a negative or fractional odometer reading", () => {
    expect(ok(checkServiceRecord({ ...base, partsCost: -1, totalCost: -1 + base.labourCost }))).toBe(false);
    expect(ok(checkServiceRecord({ ...base, odometerKm: -1 }))).toBe(false);
    expect(ok(checkServiceRecord({ ...base, odometerKm: 10.5 }))).toBe(false);
  });

  it("refuses a next service date before the service date, and a next odometer below the reading", () => {
    expect(ok(checkServiceRecord({ ...base, nextServiceDate: "2026-09-30" }))).toBe(false);
    expect(ok(checkServiceRecord({ ...base, nextServiceOdometerKm: 44000 }))).toBe(false);
  });

  it("accepts a service with no odometer reading and no next due point", () => {
    expect(ok(checkServiceRecord({ ...base, odometerKm: null, nextServiceDate: null, nextServiceOdometerKm: null }))).toBe(true);
  });
});

describe("fault record", () => {
  it("bounds the description, refuses a negative repair cost, and refuses completion before the report", () => {
    expect(ok(checkFaultRecord({ description: "Brake noise", repairCost: 0, reportedAt: "2026-10-01", completedAt: "2026-10-02" }))).toBe(true);
    expect(ok(checkFaultRecord({ description: "x".repeat(FAULT_DESCRIPTION_MAX_CHARS + 1), repairCost: null, reportedAt: "2026-10-01", completedAt: null }))).toBe(false);
    expect(ok(checkFaultRecord({ description: "  ", repairCost: null, reportedAt: "2026-10-01", completedAt: null }))).toBe(false);
    expect(ok(checkFaultRecord({ description: "x", repairCost: -5, reportedAt: "2026-10-01", completedAt: null }))).toBe(false);
    expect(ok(checkFaultRecord({ description: "x", repairCost: null, reportedAt: "2026-10-05", completedAt: "2026-10-04" }))).toBe(false);
  });
});

describe("decision reason", () => {
  it("requires a reason of 1 to 1000 characters", () => {
    expect(ok(checkDecisionReason("Not subject to testing"))).toBe(true);
    expect(ok(checkDecisionReason("  "))).toBe(false);
    expect(ok(checkDecisionReason("r".repeat(1001)))).toBe(false);
  });
});

describe("latest valid service record gives the next-service point", () => {
  const rec = (serviceDate: string, nextServiceDate: string | null, nextServiceOdometerKm: number | null, superseded = false) => ({
    serviceDate,
    nextServiceDate,
    nextServiceOdometerKm,
    superseded,
  });

  it("uses the most recent non-superseded record, not the first one listed", () => {
    expect(latestNextService([rec("2026-01-01", "2026-06-01", null), rec("2026-06-01", "2027-06-01", 60000)])).toEqual({
      nextServiceDate: "2027-06-01",
      nextServiceOdometerKm: 60000,
    });
  });

  it("ignores a superseded record, even when it is the latest", () => {
    expect(latestNextService([rec("2026-01-01", "2026-06-01", null), rec("2026-06-01", "2099-01-01", null, true)])).toEqual({
      nextServiceDate: "2026-06-01",
      nextServiceOdometerKm: null,
    });
  });

  it("returns null when there is no valid record", () => {
    expect(latestNextService([])).toBeNull();
    expect(latestNextService([rec("2026-01-01", "2026-06-01", null, true)])).toBeNull();
  });

  it("on the same service date, keeps the later next-service date so the schedule is never understated", () => {
    expect(latestNextService([rec("2026-06-01", "2026-09-01", null), rec("2026-06-01", "2026-12-01", null)])).toEqual({
      nextServiceDate: "2026-12-01",
      nextServiceOdometerKm: null,
    });
  });

  it("feeds the derived service state: a record with no next point is NOT_SET", () => {
    const latest = latestNextService([rec("2026-06-01", null, null)]);
    expect(serviceState(latest, "2026-10-20", 45000)).toBe("NOT_SET");
  });
});
