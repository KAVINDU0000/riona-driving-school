/**
 * Request parsing for vehicle maintenance. Pure: no database, no framework imports, so it can be tested directly.
 * Every parser returns either the cleaned values or a message that is safe to show. Unknown fields are ignored; unknown
 * enum values, malformed dates and out-of-range numbers are refused. Money and totals are computed here in cents, and a total
 * sent by the client is never trusted.
 */
import {
  DECISION_REASON_MAX,
  checkDecisionReason,
  checkEmissionTestRecord,
  checkFaultRecord,
  checkMoney,
  checkPolicyDates,
  checkPolicyFields,
  checkRevenueLicenceRecord,
  checkServiceRecord,
  moneyToCents,
} from "@/lib/vehicles/record-validation";
import { isDateString, checkRepairDates, type DocumentKind, DOCUMENT_KINDS, type RepairStatusValue } from "@/lib/vehicles/maintenance-rules";
import { resolveReminderLeadDays, validateChecklist, type ChecklistItemName } from "@/lib/vehicles/compliance-rules";

export type Parsed<T> = { ok: true; value: T } | { ok: false; message: string };
type Body = Record<string, unknown>;

const TEXT_MAX = 1000;
const NAME_MAX = 200;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export const SERVICE_CATEGORIES = ["ROUTINE_SERVICE", "MECHANICAL_INSPECTION", "CORRECTIVE_SERVICE"] as const;
export const FAULT_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const REPAIR_STATUSES = ["REPORTED", "DIAGNOSED", "IN_REPAIR", "COMPLETED", "CANCELLED"] as const;
export const REMINDER_CATEGORIES = ["INSURANCE", "EMISSION_TEST", "REVENUE_LICENCE", "SERVICE"] as const;
export type ReminderCategoryName = (typeof REMINDER_CATEGORIES)[number];

function fail<T>(message: string): Parsed<T> {
  return { ok: false, message };
}

/** Trimmed text, or null when absent or blank. Longer than `max` is refused. */
export function optionalText(body: Body, key: string, max: number, label: string): Parsed<string | null> {
  const value = body[key];
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value !== "string") return fail(`${label} must be text.`);
  const trimmed = value.trim();
  if (trimmed.length > max) return fail(`${label} can be at most ${max} characters.`);
  return { ok: true, value: trimmed.length > 0 ? trimmed : null };
}

export function requiredText(body: Body, key: string, max: number, label: string): Parsed<string> {
  const parsed = optionalText(body, key, max, label);
  if (!parsed.ok) return parsed;
  if (parsed.value === null) return fail(`Enter ${label.toLowerCase()}.`);
  return { ok: true, value: parsed.value };
}

/** A "YYYY-MM-DD" date, or null when absent. A value that is present but not a real date is refused. */
export function optionalDate(body: Body, key: string, label: string): Parsed<string | null> {
  const value = body[key];
  if (value === undefined || value === null || value === "") return { ok: true, value: null };
  if (typeof value !== "string" || !isDateString(value)) return fail(`${label} must be a real calendar date (YYYY-MM-DD).`);
  return { ok: true, value };
}

export function requiredDate(body: Body, key: string, label: string): Parsed<string> {
  const parsed = optionalDate(body, key, label);
  if (!parsed.ok) return parsed;
  if (parsed.value === null) return fail(`Enter ${label.toLowerCase()}.`);
  return { ok: true, value: parsed.value };
}

/** A JSON number, or null when absent. Anything else (strings, NaN, Infinity) is refused. */
export function optionalNumber(body: Body, key: string, label: string): Parsed<number | null> {
  const value = body[key];
  if (value === undefined || value === null || value === "") return { ok: true, value: null };
  if (typeof value !== "number" || !Number.isFinite(value)) return fail(`${label} must be a number.`);
  return { ok: true, value };
}

export function optionalInteger(body: Body, key: string, label: string): Parsed<number | null> {
  const parsed = optionalNumber(body, key, label);
  if (!parsed.ok || parsed.value === null) return parsed;
  if (!Number.isInteger(parsed.value)) return fail(`${label} must be a whole number.`);
  return parsed;
}

export function optionalId(body: Body, key: string, label: string): Parsed<string | null> {
  const value = body[key];
  if (value === undefined || value === null || value === "") return { ok: true, value: null };
  if (typeof value !== "string" || !ID_PATTERN.test(value)) return fail(`${label} is not valid.`);
  return { ok: true, value };
}

export function optionalBoolean(body: Body, key: string): boolean {
  return body[key] === true;
}

export function parseEnum<T extends string>(body: Body, key: string, allowed: readonly T[], label: string): Parsed<T> {
  const value = body[key];
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) return { ok: true, value: value as T };
  return fail(`Choose a valid ${label}.`);
}

/** Calls a check from record-validation or maintenance-rules and returns its message on failure. */
function fromCheck(check: { ok: true } | { ok: false; message: string }): { ok: true } | { ok: false; message: string } {
  return check.ok ? check : { ok: false, message: check.message };
}

// ---------------------------------------------------------------------------
// Insurance
// ---------------------------------------------------------------------------

export type InsuranceInput = {
  insurer: string;
  policyNumber: string;
  coverage: string;
  coverageDetails: string | null;
  startsOn: string;
  expiresOn: string;
  premium: number;
  notes: string | null;
  renewsPolicyId: string | null;
};

export function parseInsuranceInput(body: Body): Parsed<InsuranceInput> {
  const insurer = requiredText(body, "insurer", NAME_MAX, "Insurer");
  if (!insurer.ok) return insurer;
  const policyNumber = requiredText(body, "policyNumber", 100, "Policy number");
  if (!policyNumber.ok) return policyNumber;
  const coverage = requiredText(body, "coverage", NAME_MAX, "Coverage type");
  if (!coverage.ok) return coverage;
  const coverageDetails = optionalText(body, "coverageDetails", TEXT_MAX, "Coverage details");
  if (!coverageDetails.ok) return coverageDetails;
  const notes = optionalText(body, "notes", TEXT_MAX, "Notes");
  if (!notes.ok) return notes;
  const startsOn = requiredDate(body, "startsOn", "Start date");
  if (!startsOn.ok) return startsOn;
  const expiresOn = requiredDate(body, "expiresOn", "Expiry date");
  if (!expiresOn.ok) return expiresOn;
  const premium = optionalNumber(body, "premium", "Premium");
  if (!premium.ok) return premium;
  if (premium.value === null) return fail("Enter the premium.");
  const renewsPolicyId = optionalId(body, "renewsPolicyId", "Renewed policy");
  if (!renewsPolicyId.ok) return renewsPolicyId;

  const fields = fromCheck(checkPolicyFields({ insurer: insurer.value, policyNumber: policyNumber.value, coverage: coverage.value, premium: premium.value }));
  if (!fields.ok) return fail(fields.message);
  const dates = fromCheck(checkPolicyDates(startsOn.value, expiresOn.value));
  if (!dates.ok) return fail(dates.message);

  return {
    ok: true,
    value: {
      insurer: insurer.value,
      policyNumber: policyNumber.value,
      coverage: coverage.value,
      coverageDetails: coverageDetails.value,
      startsOn: startsOn.value,
      expiresOn: expiresOn.value,
      premium: premium.value,
      notes: notes.value,
      renewsPolicyId: renewsPolicyId.value,
    },
  };
}

// ---------------------------------------------------------------------------
// Emission test and decision
// ---------------------------------------------------------------------------

export type VetTestInput = {
  testedOn: string;
  result: "PASS" | "FAIL" | null;
  certificateNumber: string | null;
  issuedOn: string | null;
  certificateExpiresOn: string | null;
  nextDueOn: string | null;
  testingCentre: string | null;
  notes: string | null;
  supersedesId: string | null;
};

export function parseVetTestInput(body: Body): Parsed<VetTestInput> {
  const testedOn = requiredDate(body, "testedOn", "Test date");
  if (!testedOn.ok) return testedOn;
  const result = body.result === undefined || body.result === null || body.result === "" ? null : body.result;
  if (result !== null && result !== "PASS" && result !== "FAIL") return fail("Choose PASS or FAIL for the test result, or leave it blank if it is not recorded.");
  const certificateNumber = optionalText(body, "certificateNumber", 100, "Certificate number");
  if (!certificateNumber.ok) return certificateNumber;
  const issuedOn = optionalDate(body, "issuedOn", "Issue date");
  if (!issuedOn.ok) return issuedOn;
  const certificateExpiresOn = optionalDate(body, "certificateExpiresOn", "Certificate expiry date");
  if (!certificateExpiresOn.ok) return certificateExpiresOn;
  const nextDueOn = optionalDate(body, "nextDueOn", "Next due date");
  if (!nextDueOn.ok) return nextDueOn;
  const testingCentre = optionalText(body, "testingCentre", NAME_MAX, "Testing centre");
  if (!testingCentre.ok) return testingCentre;
  const notes = optionalText(body, "notes", TEXT_MAX, "Notes");
  if (!notes.ok) return notes;
  const supersedesId = optionalId(body, "supersedesId", "Corrected test");
  if (!supersedesId.ok) return supersedesId;

  const dates = fromCheck(
    checkEmissionTestRecord({
      testedOn: testedOn.value,
      issuedOn: issuedOn.value,
      certificateExpiresOn: certificateExpiresOn.value,
      nextDueOn: nextDueOn.value,
      certificateNumber: certificateNumber.value,
    }),
  );
  if (!dates.ok) return fail(dates.message);

  return {
    ok: true,
    value: {
      testedOn: testedOn.value,
      result,
      certificateNumber: certificateNumber.value,
      issuedOn: issuedOn.value,
      certificateExpiresOn: certificateExpiresOn.value,
      nextDueOn: nextDueOn.value,
      testingCentre: testingCentre.value,
      notes: notes.value,
      supersedesId: supersedesId.value,
    },
  };
}

export type ComplianceDecisionInput = { category: "EMISSION_TEST" | "REVENUE_LICENCE"; decision: "NOT_APPLICABLE" | "EXCEPTION_DOCUMENTED"; reason: string };

export function parseComplianceDecisionInput(body: Body): Parsed<ComplianceDecisionInput> {
  const category = parseEnum(body, "category", ["EMISSION_TEST", "REVENUE_LICENCE"] as const, "category");
  if (!category.ok) return category;
  const decision = parseEnum(body, "decision", ["NOT_APPLICABLE", "EXCEPTION_DOCUMENTED"] as const, "decision");
  if (!decision.ok) return decision;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const check = fromCheck(checkDecisionReason(reason));
  if (!check.ok) return fail(check.message);
  if (reason.length > DECISION_REASON_MAX) return fail(`The reason can be at most ${DECISION_REASON_MAX} characters.`);
  return { ok: true, value: { category: category.value, decision: decision.value, reason } };
}

// ---------------------------------------------------------------------------
// Revenue Licence
// ---------------------------------------------------------------------------

export type RevenueLicenceInput = {
  licenceNumber: string | null;
  issuedOn: string | null;
  renewedOn: string | null;
  dueOn: string;
  notes: string | null;
  renewsLicenceId: string | null;
  confirmRenewalWarnings: boolean;
};

export function parseRevenueLicenceInput(body: Body): Parsed<RevenueLicenceInput> {
  const licenceNumber = optionalText(body, "licenceNumber", 100, "Licence number");
  if (!licenceNumber.ok) return licenceNumber;
  const issuedOn = optionalDate(body, "issuedOn", "Issue date");
  if (!issuedOn.ok) return issuedOn;
  const renewedOn = optionalDate(body, "renewedOn", "Renewal date");
  if (!renewedOn.ok) return renewedOn;
  const dueOn = requiredDate(body, "dueOn", "Due date");
  if (!dueOn.ok) return dueOn;
  const notes = optionalText(body, "notes", TEXT_MAX, "Notes");
  if (!notes.ok) return notes;
  const renewsLicenceId = optionalId(body, "renewsLicenceId", "Renewed licence");
  if (!renewsLicenceId.ok) return renewsLicenceId;

  const check = fromCheck(
    checkRevenueLicenceRecord({ issuedOn: issuedOn.value, renewedOn: renewedOn.value, dueOn: dueOn.value, licenceNumber: licenceNumber.value }),
  );
  if (!check.ok) return fail(check.message);

  return {
    ok: true,
    value: {
      licenceNumber: licenceNumber.value,
      issuedOn: issuedOn.value,
      renewedOn: renewedOn.value,
      dueOn: dueOn.value,
      notes: notes.value,
      renewsLicenceId: renewsLicenceId.value,
      confirmRenewalWarnings: optionalBoolean(body, "confirmRenewalWarnings"),
    },
  };
}

// ---------------------------------------------------------------------------
// Service records
// ---------------------------------------------------------------------------

export type ServiceInput = {
  category: (typeof SERVICE_CATEGORIES)[number];
  serviceDate: string;
  odometerKm: number | null;
  providerName: string | null;
  workPerformed: string | null;
  findings: string | null;
  recommendations: string | null;
  partsCost: number;
  labourCost: number;
  totalCost: number;
  nextServiceDate: string | null;
  nextServiceOdometerKm: number | null;
  notes: string | null;
  checklist: { item: ChecklistItemName; result: "PASS" | "ATTENTION" | "FAIL" | "NOT_CHECKED"; note: string | null }[];
  odometerExplanation: string | null;
  faultId: string | null;
  supersedesId: string | null;
};

export function parseServiceInput(body: Body): Parsed<ServiceInput> {
  const category = parseEnum(body, "category", SERVICE_CATEGORIES, "service category");
  if (!category.ok) return category;
  const serviceDate = requiredDate(body, "serviceDate", "Service date");
  if (!serviceDate.ok) return serviceDate;
  const odometerKm = optionalInteger(body, "odometerKm", "Odometer reading");
  if (!odometerKm.ok) return odometerKm;
  const providerName = optionalText(body, "providerName", NAME_MAX, "Provider");
  if (!providerName.ok) return providerName;
  const workPerformed = optionalText(body, "workPerformed", TEXT_MAX, "Work performed");
  if (!workPerformed.ok) return workPerformed;
  const findings = optionalText(body, "findings", TEXT_MAX, "Findings");
  if (!findings.ok) return findings;
  const recommendations = optionalText(body, "recommendations", TEXT_MAX, "Recommendations");
  if (!recommendations.ok) return recommendations;
  const notes = optionalText(body, "notes", TEXT_MAX, "Notes");
  if (!notes.ok) return notes;
  const partsCost = optionalNumber(body, "partsCost", "Parts cost");
  if (!partsCost.ok) return partsCost;
  const labourCost = optionalNumber(body, "labourCost", "Labour cost");
  if (!labourCost.ok) return labourCost;
  const nextServiceDate = optionalDate(body, "nextServiceDate", "Next service date");
  if (!nextServiceDate.ok) return nextServiceDate;
  const nextServiceOdometerKm = optionalInteger(body, "nextServiceOdometerKm", "Next service odometer reading");
  if (!nextServiceOdometerKm.ok) return nextServiceOdometerKm;
  const odometerExplanation = optionalText(body, "odometerExplanation", 500, "Odometer explanation");
  if (!odometerExplanation.ok) return odometerExplanation;
  const faultId = optionalId(body, "faultId", "Linked fault");
  if (!faultId.ok) return faultId;
  const supersedesId = optionalId(body, "supersedesId", "Corrected record");
  if (!supersedesId.ok) return supersedesId;

  const checklist = validateChecklist(body.checklist);
  if (!checklist.ok) return fail(checklist.message);

  const parts = partsCost.value ?? 0;
  const labour = labourCost.value ?? 0;
  const partsMoney = fromCheck(checkMoney(parts, "The parts cost"));
  if (!partsMoney.ok) return fail(partsMoney.message);
  const labourMoney = fromCheck(checkMoney(labour, "The labour cost"));
  if (!labourMoney.ok) return fail(labourMoney.message);
  const totalCents = (moneyToCents(parts) ?? 0) + (moneyToCents(labour) ?? 0);
  const total = totalCents / 100;

  const check = fromCheck(
    checkServiceRecord({
      serviceDate: serviceDate.value,
      odometerKm: odometerKm.value,
      partsCost: parts,
      labourCost: labour,
      totalCost: total,
      nextServiceDate: nextServiceDate.value,
      nextServiceOdometerKm: nextServiceOdometerKm.value,
    }),
  );
  if (!check.ok) return fail(check.message);

  return {
    ok: true,
    value: {
      category: category.value,
      serviceDate: serviceDate.value,
      odometerKm: odometerKm.value,
      providerName: providerName.value,
      workPerformed: workPerformed.value,
      findings: findings.value,
      recommendations: recommendations.value,
      partsCost: parts,
      labourCost: labour,
      totalCost: total,
      nextServiceDate: nextServiceDate.value,
      nextServiceOdometerKm: nextServiceOdometerKm.value,
      notes: notes.value,
      checklist: checklist.items,
      odometerExplanation: odometerExplanation.value,
      faultId: faultId.value,
      supersedesId: supersedesId.value,
    },
  };
}

// ---------------------------------------------------------------------------
// Faults and repairs
// ---------------------------------------------------------------------------

export type FaultInput = {
  severity: (typeof FAULT_SEVERITIES)[number];
  description: string;
  makesUnavailable: boolean;
  reportedOn: string;
  workshop: string | null;
  repairCost: number | null;
};

export function parseFaultInput(body: Body, today: string): Parsed<FaultInput> {
  const severity = parseEnum(body, "severity", FAULT_SEVERITIES, "severity");
  if (!severity.ok) return severity;
  const description = requiredText(body, "description", 2000, "Description");
  if (!description.ok) return description;
  const reportedOn = requiredDate(body, "reportedOn", "Reported date");
  if (!reportedOn.ok) return reportedOn;
  const workshop = optionalText(body, "workshop", NAME_MAX, "Workshop");
  if (!workshop.ok) return workshop;
  const repairCost = optionalNumber(body, "repairCost", "Repair cost");
  if (!repairCost.ok) return repairCost;

  const reported = fromCheck(checkRepairDates(reportedOn.value, null, today));
  if (!reported.ok) return fail(reported.message);
  const check = fromCheck(checkFaultRecord({ description: description.value, repairCost: repairCost.value, reportedAt: reportedOn.value, completedAt: null }));
  if (!check.ok) return fail(check.message);

  return {
    ok: true,
    value: {
      severity: severity.value,
      description: description.value,
      makesUnavailable: optionalBoolean(body, "makesUnavailable"),
      reportedOn: reportedOn.value,
      workshop: workshop.value,
      repairCost: repairCost.value,
    },
  };
}

export type FaultUpdateInput = {
  status: RepairStatusValue;
  note: string | null;
  workshop: string | null;
  diagnosis: string | null;
  workPerformed: string | null;
  repairCost: number | null;
  completedOn: string | null;
};

export function parseFaultUpdateInput(body: Body, today: string): Parsed<FaultUpdateInput> {
  const status = parseEnum(body, "status", REPAIR_STATUSES, "repair status");
  if (!status.ok) return status;
  const note = optionalText(body, "note", TEXT_MAX, "Note");
  if (!note.ok) return note;
  const workshop = optionalText(body, "workshop", NAME_MAX, "Workshop");
  if (!workshop.ok) return workshop;
  const diagnosis = optionalText(body, "diagnosis", TEXT_MAX, "Diagnosis");
  if (!diagnosis.ok) return diagnosis;
  const workPerformed = optionalText(body, "workPerformed", TEXT_MAX, "Work performed");
  if (!workPerformed.ok) return workPerformed;
  const repairCost = optionalNumber(body, "repairCost", "Repair cost");
  if (!repairCost.ok) return repairCost;
  if (repairCost.value !== null) {
    const money = fromCheck(checkMoney(repairCost.value, "The repair cost"));
    if (!money.ok) return fail(money.message);
  }
  const completedOn = optionalDate(body, "completedOn", "Completion date");
  if (!completedOn.ok) return completedOn;

  // The database requires a completion date exactly when the status is COMPLETED. The completion date may not be in the future.
  if (status.value === "COMPLETED") {
    if (completedOn.value === null) return fail("Enter the completion date to mark this repair completed.");
    if (completedOn.value > today) return fail("The completion date cannot be in the future.");
  } else if (completedOn.value !== null) {
    return fail("A completion date can be entered only when the repair is marked completed.");
  }

  return {
    ok: true,
    value: {
      status: status.value,
      note: note.value,
      workshop: workshop.value,
      diagnosis: diagnosis.value,
      workPerformed: workPerformed.value,
      repairCost: repairCost.value,
      completedOn: completedOn.value,
    },
  };
}

// ---------------------------------------------------------------------------
// Documents, reminders
// ---------------------------------------------------------------------------

export function parseDocumentKind(value: unknown): Parsed<DocumentKind> {
  if (typeof value === "string" && (DOCUMENT_KINDS as readonly string[]).includes(value)) return { ok: true, value: value as DocumentKind };
  return fail("Choose a document type.");
}

export function parseDeletionReason(body: Body): Parsed<string> {
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const check = fromCheck(checkDecisionReason(reason));
  if (!check.ok) return fail("Give a reason for deleting this file.");
  return { ok: true, value: reason };
}

export function parseReminderSettingsInput(body: Body): Parsed<{ category: ReminderCategoryName; leadDays: number[] }> {
  const category = parseEnum(body, "category", REMINDER_CATEGORIES, "reminder category");
  if (!category.ok) return category;
  const leadDays = resolveReminderLeadDays(body.leadDays);
  if (!leadDays.ok) return fail(leadDays.message);
  return { ok: true, value: { category: category.value, leadDays: leadDays.leadDays } };
}
