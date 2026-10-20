// Database-free. Request parsing for vehicle maintenance, and the private-storage directory rules.
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  parseComplianceDecisionInput,
  parseDeletionReason,
  parseDocumentKind,
  parseFaultInput,
  parseFaultUpdateInput,
  parseInsuranceInput,
  parseReminderSettingsInput,
  parseRevenueLicenceInput,
  parseServiceInput,
  parseVetTestInput,
} from "@/lib/vehicles/maintenance-input";
import { maintenanceStorageDir } from "@/lib/vehicles/document-storage";

const TODAY = "2026-10-20";
const messageOf = (result: { ok: boolean; message?: string }) => (result.ok ? null : result.message);

const validInsurance = {
  insurer: "Fixture Insurer",
  policyNumber: "POL-1",
  coverage: "Comprehensive",
  startsOn: "2026-01-01",
  expiresOn: "2026-12-31",
  premium: 25000,
};

describe("insurance input", () => {
  it("accepts a complete policy and trims text", () => {
    const parsed = parseInsuranceInput({ ...validInsurance, insurer: "  Fixture Insurer  ", notes: "  " });
    expect(parsed).toMatchObject({ ok: true, value: { insurer: "Fixture Insurer", notes: null, renewsPolicyId: null } });
  });

  it("refuses a missing insurer, a premium sent as text, an expiry before the start, and an invented date", () => {
    expect(messageOf(parseInsuranceInput({ ...validInsurance, insurer: "" }))).toBe("Enter insurer.");
    expect(messageOf(parseInsuranceInput({ ...validInsurance, premium: "25000" }))).toBe("Premium must be a number.");
    expect(messageOf(parseInsuranceInput({ ...validInsurance, expiresOn: "2025-12-31" }))).toBe("The expiry date must be after the start date.");
    expect(messageOf(parseInsuranceInput({ ...validInsurance, startsOn: "2026-02-30" }))).toMatch(/real calendar date/);
  });

  it("refuses text over its limit", () => {
    expect(messageOf(parseInsuranceInput({ ...validInsurance, policyNumber: "p".repeat(101) }))).toBe("Policy number can be at most 100 characters.");
  });
});

describe("emission test and decision input", () => {
  it("accepts a FAIL result and a result that is not recorded", () => {
    expect(parseVetTestInput({ testedOn: "2026-10-01", result: "FAIL" })).toMatchObject({ ok: true, value: { result: "FAIL" } });
    expect(parseVetTestInput({ testedOn: "2026-10-01", result: "" })).toMatchObject({ ok: true, value: { result: null } });
  });

  it("refuses an unknown result, a certificate that expires before it was issued, and a next due date before the test", () => {
    expect(messageOf(parseVetTestInput({ testedOn: "2026-10-01", result: "MAYBE" }))).toMatch(/PASS or FAIL/);
    expect(messageOf(parseVetTestInput({ testedOn: "2026-10-01", issuedOn: "2026-10-01", certificateExpiresOn: "2026-09-01" }))).toMatch(/expiry date cannot be before its issue date/);
    expect(messageOf(parseVetTestInput({ testedOn: "2026-10-01", nextDueOn: "2026-09-01" }))).toMatch(/next due date cannot be before the test date/);
  });

  it("requires a category, a decision, and a reason", () => {
    expect(parseComplianceDecisionInput({ category: "EMISSION_TEST", decision: "NOT_APPLICABLE", reason: "Electric vehicle" })).toMatchObject({ ok: true });
    expect(messageOf(parseComplianceDecisionInput({ category: "INSURANCE", decision: "NOT_APPLICABLE", reason: "x" }))).toMatch(/valid category/);
    expect(messageOf(parseComplianceDecisionInput({ category: "EMISSION_TEST", decision: "NOT_APPLICABLE", reason: "   " }))).toMatch(/reason/);
  });
});

describe("Revenue Licence input", () => {
  it("refuses a due date before the issue date and a renewal before the issue date", () => {
    expect(messageOf(parseRevenueLicenceInput({ dueOn: "2026-01-01", issuedOn: "2026-06-01" }))).toMatch(/due date cannot be before the issue date/);
    expect(messageOf(parseRevenueLicenceInput({ dueOn: "2027-01-01", issuedOn: "2026-06-01", renewedOn: "2026-05-01" }))).toMatch(/renewal date cannot be before the issue date/);
  });

  it("defaults the renewal confirmation to false, and reads it only when it is true", () => {
    expect(parseRevenueLicenceInput({ dueOn: "2027-01-01" })).toMatchObject({ ok: true, value: { confirmRenewalWarnings: false } });
    expect(parseRevenueLicenceInput({ dueOn: "2027-01-01", confirmRenewalWarnings: "yes" })).toMatchObject({ ok: true, value: { confirmRenewalWarnings: false } });
    expect(parseRevenueLicenceInput({ dueOn: "2027-01-01", confirmRenewalWarnings: true })).toMatchObject({ ok: true, value: { confirmRenewalWarnings: true } });
  });
});

describe("service record input", () => {
  const base = { category: "ROUTINE_SERVICE", serviceDate: "2026-10-01", partsCost: 1500.5, labourCost: 500.25 };

  it("computes the total in cents and ignores any total sent by the client", () => {
    const parsed = parseServiceInput({ ...base, totalCost: 999999 });
    expect(parsed).toMatchObject({ ok: true, value: { totalCost: 2000.75 } });
  });

  it("gets the total exactly for amounts that are not binary-exact", () => {
    expect(parseServiceInput({ category: "ROUTINE_SERVICE", serviceDate: "2026-10-01", partsCost: 0.1, labourCost: 0.2 })).toMatchObject({ ok: true, value: { totalCost: 0.3 } });
  });

  it("gives every checklist item NOT_CHECKED when none is sent, and never a pass", () => {
    const parsed = parseServiceInput(base);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.checklist).toHaveLength(9);
    expect(parsed.value.checklist.every((c) => c.result === "NOT_CHECKED")).toBe(true);
  });

  it("refuses an unknown checklist item, a repeated item, and a non-integer odometer reading", () => {
    expect(messageOf(parseServiceInput({ ...base, checklist: [{ item: "ROOF", result: "PASS" }] }))).toMatch(/not on the checklist/);
    expect(messageOf(parseServiceInput({ ...base, checklist: [{ item: "ENGINE", result: "PASS" }, { item: "ENGINE", result: "FAIL" }] }))).toMatch(/only once/);
    expect(messageOf(parseServiceInput({ ...base, odometerKm: 1200.5 }))).toMatch(/whole number/);
  });

  it("refuses a negative cost and a next service date before the service date", () => {
    expect(messageOf(parseServiceInput({ ...base, partsCost: -5 }))).toMatch(/cannot be negative/);
    expect(messageOf(parseServiceInput({ ...base, nextServiceDate: "2026-09-30" }))).toMatch(/cannot be before the service date/);
  });

  it("keeps the odometer explanation only as text, and bounds it", () => {
    expect(parseServiceInput({ ...base, odometerExplanation: "Cluster replaced" })).toMatchObject({ ok: true, value: { odometerExplanation: "Cluster replaced" } });
    expect(messageOf(parseServiceInput({ ...base, odometerExplanation: "x".repeat(501) }))).toMatch(/at most 500/);
  });
});

describe("fault input", () => {
  it("refuses a reported date in the future, an unknown severity, and an empty description", () => {
    expect(messageOf(parseFaultInput({ severity: "LOW", description: "Noise", reportedOn: "2026-10-21" }, TODAY))).toMatch(/cannot be in the future/);
    expect(messageOf(parseFaultInput({ severity: "EXTREME", description: "Noise", reportedOn: TODAY }, TODAY))).toMatch(/valid severity/);
    expect(messageOf(parseFaultInput({ severity: "LOW", description: "  ", reportedOn: TODAY }, TODAY))).toMatch(/Enter description/);
  });

  it("requires a completion date exactly when the repair is completed", () => {
    expect(messageOf(parseFaultUpdateInput({ status: "COMPLETED" }, TODAY))).toMatch(/completion date to mark/);
    expect(messageOf(parseFaultUpdateInput({ status: "IN_REPAIR", completedOn: TODAY }, TODAY))).toMatch(/only when the repair is marked completed/);
    expect(parseFaultUpdateInput({ status: "COMPLETED", completedOn: TODAY }, TODAY)).toMatchObject({ ok: true });
  });

  it("refuses a completion date in the future and a negative repair cost", () => {
    expect(messageOf(parseFaultUpdateInput({ status: "COMPLETED", completedOn: "2026-10-21" }, TODAY))).toMatch(/cannot be in the future/);
    expect(messageOf(parseFaultUpdateInput({ status: "IN_REPAIR", repairCost: -1 }, TODAY))).toMatch(/cannot be negative/);
  });
});

describe("documents, deletion reasons and reminder settings", () => {
  it("accepts only the five document kinds", () => {
    expect(parseDocumentKind("INSURANCE_POLICY")).toEqual({ ok: true, value: "INSURANCE_POLICY" });
    expect(parseDocumentKind("INSURANCE_CERTIFICATE").ok).toBe(false);
    expect(parseDocumentKind(undefined).ok).toBe(false);
  });

  it("requires a non-blank deletion reason", () => {
    expect(parseDeletionReason({ reason: "Replaced by a corrected copy" })).toEqual({ ok: true, value: "Replaced by a corrected copy" });
    expect(parseDeletionReason({ reason: "   " }).ok).toBe(false);
    expect(parseDeletionReason({}).ok).toBe(false);
  });

  it("accepts lead times of whole days from 1 to 365, each once, and refuses anything else", () => {
    expect(parseReminderSettingsInput({ category: "INSURANCE", leadDays: [7, 30, 14] })).toEqual({
      ok: true,
      value: { category: "INSURANCE", leadDays: [30, 14, 7] },
    });
    expect(parseReminderSettingsInput({ category: "INSURANCE", leadDays: [] }).ok).toBe(false);
    expect(parseReminderSettingsInput({ category: "INSURANCE", leadDays: [0] }).ok).toBe(false);
    expect(parseReminderSettingsInput({ category: "INSURANCE", leadDays: [7, 7] }).ok).toBe(false);
    expect(parseReminderSettingsInput({ category: "WHATSAPP", leadDays: [7] }).ok).toBe(false);
  });
});

describe("private storage directory", () => {
  const original = process.env.MAINTENANCE_DOCUMENT_STORAGE_DIR;
  afterEach(() => {
    if (original === undefined) delete process.env.MAINTENANCE_DOCUMENT_STORAGE_DIR;
    else process.env.MAINTENANCE_DOCUMENT_STORAGE_DIR = original;
  });

  it("refuses to run when no directory is configured", () => {
    delete process.env.MAINTENANCE_DOCUMENT_STORAGE_DIR;
    expect(() => maintenanceStorageDir()).toThrow(/not configured/);
  });

  it("refuses a relative path and any path inside the public folder", () => {
    process.env.MAINTENANCE_DOCUMENT_STORAGE_DIR = "private/maintenance";
    expect(() => maintenanceStorageDir()).toThrow(/must be an absolute path/);
    process.env.MAINTENANCE_DOCUMENT_STORAGE_DIR = path.join(process.cwd(), "public", "uploads");
    expect(() => maintenanceStorageDir()).toThrow(/must not be inside the public folder/);
    process.env.MAINTENANCE_DOCUMENT_STORAGE_DIR = path.join(process.cwd(), "public");
    expect(() => maintenanceStorageDir()).toThrow(/must not be inside the public folder/);
  });

  it("accepts an absolute folder outside the public folder", () => {
    process.env.MAINTENANCE_DOCUMENT_STORAGE_DIR = path.join(path.parse(process.cwd()).root, "riona-private", "maintenance");
    expect(maintenanceStorageDir()).toBe(path.join(path.parse(process.cwd()).root, "riona-private", "maintenance"));
  });
});
