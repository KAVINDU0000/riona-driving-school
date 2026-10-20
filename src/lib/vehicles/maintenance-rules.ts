/**
 * Vehicle maintenance rules: insurance periods, service due dates, repair transitions, document retention and availability.
 * Pure. No database and no server-only imports, so the server, the forms and the tests share one set of rules.
 *
 * Decisions this file encodes (confirmed by the school):
 * - Expired insurance, overdue service and open safety-critical faults are WARNINGS for administrators. They never block lesson
 *   booking.
 * - A vehicle is available for lessons only when its status is ACTIVE (the existing rule). Booking is not changed in this phase.
 * - Insurance periods may not overlap for one vehicle. Checked here, in the application, under a vehicle row lock.
 * - Soft-deleted documents are kept for 365 days. After that they are eligible for an explicit review. Nothing is purged here.
 * - Repair and insurance documents are for administrators only.
 *
 * Dates are "YYYY-MM-DD" in school time (Asia/Colombo). Every function that depends on "today" takes it as an argument.
 */

export const EXPIRY_WARNING_DAYS = 30;
// PROVISIONAL: 14 days and 500 km are not yet confirmed by the school. They are defaults only, and they stay configurable
// (MaintenanceSettings in compliance-rules.ts). Do not treat them as permanent business rules.
export const PROVISIONAL_SERVICE_DUE_SOON_DAYS = 14;
export const PROVISIONAL_SERVICE_DUE_SOON_KM = 500;
export const DOCUMENT_RETENTION_DAYS = 365;
export const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;
export const DOCUMENT_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"] as const;
export const POLICY_NUMBER_MAX = 100;
export const FAULT_DESCRIPTION_MAX = 2000;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/** True for a real calendar date in "YYYY-MM-DD" form. */
export function isDateString(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Whole days from `from` to `to` (negative when `to` is earlier). Both must be valid dates. */
export function daysBetween(from: string, to: string): number {
  const toMs = (value: string) => {
    const match = DATE_PATTERN.exec(value)!;
    return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  };
  return Math.round((toMs(to) - toMs(from)) / DAY_MS);
}

/** Adds whole days to a date string. */
export function addDays(date: string, days: number): string {
  const match = DATE_PATTERN.exec(date)!;
  const shifted = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  return shifted.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Insurance
// ---------------------------------------------------------------------------

export type PolicyPeriod = { id?: string; startsOn: string; expiresOn: string; renewsPolicyId?: string | null };

export type InsuranceState = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "NOT_YET_STARTED" | "MISSING";

export type InsuranceStatus = { state: InsuranceState; policy: PolicyPeriod | null; daysLeft: number | null };

/**
 * The insurance state on `today`. The expiry day is still covered. A period that is covered today and ends within
 * EXPIRY_WARNING_DAYS days is EXPIRING_SOON. Days left are counted from today to the expiry date.
 */
export function insuranceStatus(policies: PolicyPeriod[], today: string, warningDays: number = EXPIRY_WARNING_DAYS): InsuranceStatus {
  if (policies.length === 0) return { state: "MISSING", policy: null, daysLeft: null };

  const covering = policies
    .filter((p) => p.startsOn <= today && today <= p.expiresOn)
    .sort((a, b) => (a.expiresOn < b.expiresOn ? 1 : -1))[0];
  if (covering) {
    const daysLeft = daysBetween(today, covering.expiresOn);
    return {
      state: daysLeft <= warningDays ? "EXPIRING_SOON" : "ACTIVE",
      policy: covering,
      daysLeft,
    };
  }

  const upcoming = policies.filter((p) => p.startsOn > today).sort((a, b) => (a.startsOn < b.startsOn ? -1 : 1))[0];
  if (upcoming) return { state: "NOT_YET_STARTED", policy: upcoming, daysLeft: null };

  const latest = [...policies].sort((a, b) => (a.expiresOn < b.expiresOn ? 1 : -1))[0];
  return { state: "EXPIRED", policy: latest, daysLeft: null };
}

export type PolicyInput = { insurer: string; policyNumber: string; coverage: string; startsOn: string; expiresOn: string; premium: number };

/**
 * Checks a new policy period against the vehicle's existing periods. Expiry is after the start, and the periods are inclusive:
 * a period that starts on the day another ends overlaps it. A period that starts the day after another ends is allowed.
 * A renewal must begin after the period it renews, and that period must belong to the same vehicle (the caller passes
 * only this vehicle's periods).
 */
export function checkPolicyPeriod(
  candidate: PolicyInput,
  existing: PolicyPeriod[],
  renewsPolicyId: string | null,
): { ok: true } | { ok: false; message: string } {
  if (!isDateString(candidate.startsOn) || !isDateString(candidate.expiresOn)) {
    return { ok: false, message: "Enter the start and expiry dates as real calendar dates." };
  }
  if (candidate.expiresOn <= candidate.startsOn) {
    return { ok: false, message: "The expiry date must be after the start date." };
  }
  const overlapping = existing.find((p) => candidate.startsOn <= p.expiresOn && p.startsOn <= candidate.expiresOn);
  if (overlapping) {
    return { ok: false, message: "This period overlaps an insurance period already recorded for this vehicle." };
  }
  if (renewsPolicyId) {
    const renewed = existing.find((p) => p.id === renewsPolicyId);
    if (!renewed) return { ok: false, message: "The policy being renewed does not belong to this vehicle." };
    if (candidate.startsOn <= renewed.startsOn) {
      return { ok: false, message: "A renewal must start after the policy it renews." };
    }
  }
  return { ok: true };
}

/** The renewal chain that ends at `policyId`, oldest first. Stops if a link is missing, rather than looping. */
export function renewalHistory(policies: PolicyPeriod[], policyId: string): PolicyPeriod[] {
  const byId = new Map(policies.filter((p) => p.id).map((p) => [p.id!, p]));
  const chain: PolicyPeriod[] = [];
  const seen = new Set<string>();
  let current = byId.get(policyId);
  while (current && current.id && !seen.has(current.id)) {
    chain.unshift(current);
    seen.add(current.id);
    current = current.renewsPolicyId ? byId.get(current.renewsPolicyId) : undefined;
  }
  return chain;
}

// ---------------------------------------------------------------------------
// Service and preventive maintenance
// ---------------------------------------------------------------------------

/** The due state of the service schedule. NOT_SET means the latest record gives no next-service date or odometer. */
export type ServiceState = "NOT_SET" | "SCHEDULED" | "DUE_SOON" | "OVERDUE";

/** The next-service fields of the latest valid service record. There is no status column: a record is an event. */
export type NextServiceLite = { nextServiceDate: string | null; nextServiceOdometerKm: number | null };

/**
 * The due state, derived from the latest valid service record's next-service date and odometer reading.
 * OVERDUE: the date is before today, or the current odometer has reached the due reading. A record due today is DUE_SOON,
 * not overdue. DUE_SOON: within the thresholds (the defaults are provisional, pending school confirmation). The odometer checks run only
 * when a current reading is known. NOT_SET: the latest record gives neither a date nor an odometer reading.
 */
export function serviceState(
  next: NextServiceLite | null,
  today: string,
  currentOdometerKm: number | null,
  thresholds: { dueSoonDays: number; dueSoonKm: number } = {
    dueSoonDays: PROVISIONAL_SERVICE_DUE_SOON_DAYS,
    dueSoonKm: PROVISIONAL_SERVICE_DUE_SOON_KM,
  },
): ServiceState {
  if (next === null || (next.nextServiceDate === null && next.nextServiceOdometerKm === null)) return "NOT_SET";

  const dateOverdue = next.nextServiceDate !== null && next.nextServiceDate < today;
  const odometerOverdue =
    next.nextServiceOdometerKm !== null && currentOdometerKm !== null && currentOdometerKm >= next.nextServiceOdometerKm;
  if (dateOverdue || odometerOverdue) return "OVERDUE";

  const dateSoon = next.nextServiceDate !== null && daysBetween(today, next.nextServiceDate) <= thresholds.dueSoonDays;
  const odometerSoon =
    next.nextServiceOdometerKm !== null &&
    currentOdometerKm !== null &&
    next.nextServiceOdometerKm - currentOdometerKm <= thresholds.dueSoonKm;
  return dateSoon || odometerSoon ? "DUE_SOON" : "SCHEDULED";
}

/** Money, rounded to cents. Costs of completed service and repair work only; open items are not counted. */
export function sumCosts(amounts: number[]): number {
  const cents = amounts.reduce((total, amount) => total + Math.round(amount * 100), 0);
  return cents / 100;
}

// ---------------------------------------------------------------------------
// Repairs and faults
// ---------------------------------------------------------------------------

export type RepairStatusValue = "REPORTED" | "DIAGNOSED" | "IN_REPAIR" | "COMPLETED" | "CANCELLED";
export type FaultSeverityValue = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export const OPEN_REPAIR_STATUSES: readonly RepairStatusValue[] = ["REPORTED", "DIAGNOSED", "IN_REPAIR"];

const REPAIR_TRANSITIONS: Record<RepairStatusValue, RepairStatusValue[]> = {
  REPORTED: ["DIAGNOSED", "IN_REPAIR", "CANCELLED"],
  DIAGNOSED: ["IN_REPAIR", "CANCELLED"],
  IN_REPAIR: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canMoveRepair(from: RepairStatusValue, to: RepairStatusValue): boolean {
  return REPAIR_TRANSITIONS[from].includes(to);
}

export type FaultLite = { status: RepairStatusValue; severity: FaultSeverityValue; makesUnavailable: boolean };

/**
 * A safety-critical fault is open, and either makes the vehicle unavailable or has severity CRITICAL. A closed fault never counts.
 * This is the Phase A definition. It drives the administrator warning only: it never blocks booking.
 */
export function isSafetyCriticalOpenFault(fault: FaultLite): boolean {
  if (!OPEN_REPAIR_STATUSES.includes(fault.status)) return false;
  return fault.makesUnavailable || fault.severity === "CRITICAL";
}

/** Administrator-only warning for open safety-critical faults. It never changes lesson availability (school decision, Phase C2). */
export function openFaultWarnings(faults: FaultLite[]): string[] {
  const count = faults.filter(isSafetyCriticalOpenFault).length;
  if (count === 0) return [];
  return [`${count} open safety-critical fault(s) recorded for this vehicle. Review them. Booking is not blocked by faults.`];
}

export type VehicleAvailability =
  | { available: true; warnings: string[] }
  | { available: false; reason: "STATUS_NOT_ACTIVE"; warnings: string[] };

export type MaintenanceWarningInput = {
  insurance: InsuranceStatus;
  services: { id: string; state: ServiceState }[];
  faults?: FaultLite[];
};

/** Plain-language warnings for administrators. They never affect availability. */
export function maintenanceWarnings(input: MaintenanceWarningInput): string[] {
  const warnings: string[] = [];
  switch (input.insurance.state) {
    case "MISSING":
      warnings.push("No insurance is recorded for this vehicle.");
      break;
    case "EXPIRED":
      warnings.push("Insurance for this vehicle has expired.");
      break;
    case "NOT_YET_STARTED":
      warnings.push("No insurance covers this vehicle today. The next period starts later.");
      break;
    case "EXPIRING_SOON":
      warnings.push(`Insurance expires in ${input.insurance.daysLeft} day(s).`);
      break;
    default:
      break;
  }
  const overdue = input.services.filter((s) => s.state === "OVERDUE").length;
  const dueSoon = input.services.filter((s) => s.state === "DUE_SOON").length;
  if (overdue > 0) warnings.push(`${overdue} service item(s) overdue.`);
  if (dueSoon > 0) warnings.push(`${dueSoon} service item(s) due soon.`);
  warnings.push(...openFaultWarnings(input.faults ?? []));
  return warnings;
}

/**
 * Availability for lessons. Only the vehicle status decides, which is the existing rule: booking offers only ACTIVE vehicles.
 * Open safety-critical faults give an administrator warning (openFaultWarnings) and do not block booking in this phase.
 * Warnings are carried through unchanged and never change the answer.
 */
export function vehicleAvailability(status: "ACTIVE" | "MAINTENANCE" | "INACTIVE", warnings: string[]): VehicleAvailability {
  if (status !== "ACTIVE") return { available: false, reason: "STATUS_NOT_ACTIVE", warnings };
  return { available: true, warnings };
}

/** A repair must not be dated before it was reported. Dates are "YYYY-MM-DD". */
export function checkRepairDates(reportedOn: string, completedOn: string | null, today: string): { ok: true } | { ok: false; message: string } {
  if (!isDateString(reportedOn)) return { ok: false, message: "Enter the reported date as a real calendar date." };
  if (reportedOn > today) return { ok: false, message: "The reported date cannot be in the future." };
  if (completedOn !== null) {
    if (!isDateString(completedOn)) return { ok: false, message: "Enter the completion date as a real calendar date." };
    if (completedOn < reportedOn) return { ok: false, message: "The completion date cannot be before the reported date." };
    if (completedOn > today) return { ok: false, message: "The completion date cannot be in the future." };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

/** Must match the database enum MaintenanceDocumentKind in docs/vehicle-maintenance/DRAFT-migration.sql, in the same spelling. */
export type DocumentKind = "INSURANCE_POLICY" | "EMISSION_CERTIFICATE" | "REVENUE_LICENCE" | "SERVICE_INVOICE" | "INSPECTION_REPORT";
export const DOCUMENT_KINDS: readonly DocumentKind[] = ["INSURANCE_POLICY", "EMISSION_CERTIFICATE", "REVENUE_LICENCE", "SERVICE_INVOICE", "INSPECTION_REPORT"];
/** Matches the database check on the stored name (1 to 200 characters after trimming). */
export const DOCUMENT_NAME_MAX = 200;

/** Only administrators may see or change vehicle documents. Every other role is refused. */
export function canAccessVehicleDocuments(role: string | undefined): boolean {
  return role === "ADMIN";
}

/** Metadata checks for an upload. The file's own bytes are checked by the storage helper, not here. */
export function checkDocumentMeta(input: { kind: string; mimeType: string; fileSizeBytes: number; originalFileName: string }):
  | { ok: true }
  | { ok: false; message: string } {
  if (!DOCUMENT_KINDS.includes(input.kind as DocumentKind)) return { ok: false, message: "Choose a document type." };
  if (!(DOCUMENT_MIME_TYPES as readonly string[]).includes(input.mimeType)) {
    return { ok: false, message: "Upload a JPEG, PNG or PDF file." };
  }
  if (!Number.isInteger(input.fileSizeBytes) || input.fileSizeBytes < 1 || input.fileSizeBytes > DOCUMENT_MAX_BYTES) {
    return { ok: false, message: "The file must be between 1 byte and 5 MB." };
  }
  const name = input.originalFileName.trim();
  if (name.length === 0) return { ok: false, message: "The file needs a name." };
  if (name.length > DOCUMENT_NAME_MAX) return { ok: false, message: `The file name can be at most ${DOCUMENT_NAME_MAX} characters.` };
  return { ok: true };
}

export type RetentionState = "ACTIVE" | "DELETED_RETAINED" | "REVIEW_DUE";

/**
 * A live document is ACTIVE. A soft-deleted document is kept for DOCUMENT_RETENTION_DAYS days (DELETED_RETAINED). After that it
 * is REVIEW_DUE: it is eligible for an explicit administrator review. Nothing here removes a file or a row.
 */
export function retentionState(deletedAt: Date | null, now: Date): RetentionState {
  if (deletedAt === null) return "ACTIVE";
  const elapsedMs = now.getTime() - deletedAt.getTime();
  return elapsedMs >= DOCUMENT_RETENTION_DAYS * DAY_MS ? "REVIEW_DUE" : "DELETED_RETAINED";
}
