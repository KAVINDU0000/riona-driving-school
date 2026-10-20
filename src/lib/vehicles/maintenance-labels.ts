/**
 * Display text for vehicle maintenance states, kept in one place so the screens and the tests use the same words. Pure.
 * The emission-test result and its date validity are separate strings, so a FAILED result never hides the dates.
 */
import type { InsuranceState } from "@/lib/vehicles/maintenance-rules";
import type { RevenueState, VetState } from "@/lib/vehicles/compliance-rules";

export const INSURANCE_LABELS: Record<InsuranceState, string> = {
  ACTIVE: "Covered",
  EXPIRING_SOON: "Expiring soon",
  EXPIRED: "Expired",
  NOT_YET_STARTED: "Starts later",
  MISSING: "Not recorded",
};

export const VET_LABELS: Record<VetState, string> = {
  NOT_APPLICABLE: "Not applicable",
  EXCEPTION_DOCUMENTED: "Exception documented",
  NOT_RECORDED: "Not recorded",
  DUE_DATE_MISSING: "Due date missing",
  FAILED: "Failed",
  EXPIRED: "Certificate expired",
  OVERDUE: "Overdue",
  DUE_SOON: "Due soon",
  VALID: "Valid",
};

export const REVENUE_LABELS: Record<RevenueState, string> = {
  NOT_APPLICABLE: "Not applicable",
  EXCEPTION_DOCUMENTED: "Exception documented",
  NOT_RECORDED: "Not recorded",
  OVERDUE: "Overdue",
  DUE_SOON: "Due soon",
  ACTIVE: "Recorded, not yet due",
};

export const SERVICE_STATE_LABELS = {
  NOT_SET: "Not set",
  SCHEDULED: "Scheduled",
  DUE_SOON: "Due soon",
  OVERDUE: "Overdue",
} as const;

export const SERVICE_CATEGORY_LABELS: Record<string, string> = {
  ROUTINE_SERVICE: "Routine service",
  MECHANICAL_INSPECTION: "Mechanical inspection",
  CORRECTIVE_SERVICE: "Corrective service",
};

export const CHECKLIST_ITEM_LABELS: Record<string, string> = {
  ENGINE: "Engine",
  BRAKES: "Brakes",
  SUSPENSION: "Suspension",
  STEERING: "Steering",
  TYRES: "Tyres",
  BATTERY: "Battery",
  LIGHTS: "Lights",
  LEAKS: "Leaks",
  ELECTRICAL: "Electrical",
};

export const CHECKLIST_RESULT_LABELS: Record<string, string> = {
  PASS: "Pass",
  ATTENTION: "Attention",
  FAIL: "Fail",
  NOT_CHECKED: "Not checked",
};

export const FAULT_SEVERITY_LABELS: Record<string, string> = { LOW: "Low", MEDIUM: "Medium", HIGH: "High", CRITICAL: "Critical" };

export const REPAIR_STATUS_LABELS: Record<string, string> = {
  REPORTED: "Reported",
  DIAGNOSED: "Diagnosed",
  IN_REPAIR: "In repair",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const DOCUMENT_KIND_LABELS: Record<string, string> = {
  INSURANCE_POLICY: "Insurance policy",
  EMISSION_CERTIFICATE: "Emission certificate",
  REVENUE_LICENCE: "Revenue licence",
  SERVICE_INVOICE: "Service invoice",
  INSPECTION_REPORT: "Inspection report",
};

export const REMINDER_CATEGORY_LABELS: Record<string, string> = {
  INSURANCE: "Insurance",
  EMISSION_TEST: "Emission test",
  REVENUE_LICENCE: "Revenue licence",
  SERVICE: "Service",
};

export const REMINDER_STATUS_LABELS: Record<string, string> = { OPEN: "Open", ACKNOWLEDGED: "Acknowledged", SUPERSEDED: "Superseded" };

/** The emission-test result on its own: never a date statement. */
export function vetResultLabel(result: "PASS" | "FAIL" | null): string {
  if (result === "FAIL") return "Failed test";
  if (result === "PASS") return "Passed test";
  return "Result not recorded";
}

/** The date validity on its own, shown beside the result. Says which recorded date decides it. */
export function vetDateLabel(vet: { dueOn: string | null; dueKind: "CERTIFICATE_EXPIRY" | "NEXT_DUE" | null }): string {
  if (!vet.dueOn || !vet.dueKind) return "No date recorded";
  return vet.dueKind === "CERTIFICATE_EXPIRY" ? `Certificate expires ${vet.dueOn}` : `Next test due ${vet.dueOn}`;
}

/** Sentence for the service thresholds, which are provisional until the school confirms them. */
export function provisionalThresholdsText(days: number, km: number): string {
  return `Due-soon warning: ${days} days or ${km} km (provisional, pending school confirmation).`;
}
