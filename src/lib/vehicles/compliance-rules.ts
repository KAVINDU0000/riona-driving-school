/**
 * Phase B domain rules: VET status, Revenue Licence status and renewal prerequisites, configurable in-app reminder windows,
 * the service checklist, the known odometer reading, and the optional link from a corrective service to a fault.
 * Pure. No database and no server-only imports. Every "today" is an argument, so tests never depend on the clock.
 *
 * Confirmed by the school: Revenue Licence renewal prerequisites warn and need an explicit confirmation; reminder lead times
 * are configurable with defaults 30, 14 and 7 days; the current odometer is the latest valid service reading; VET results are
 * PASS, FAIL, or not recorded (never inferred); a corrective service may link to a fault and nothing else needs a link.
 *
 * PROVISIONAL, pending school confirmation: the 14-day and 500 km service due-soon thresholds. They are defaults only and stay configurable.
 */
import {
  PROVISIONAL_SERVICE_DUE_SOON_DAYS,
  PROVISIONAL_SERVICE_DUE_SOON_KM,
  addDays,
  daysBetween,
  insuranceStatus,
  isDateString,
  type InsuranceStatus,
  type NextServiceLite,
  type PolicyPeriod,
} from "@/lib/vehicles/maintenance-rules";

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export const DEFAULT_REMINDER_LEAD_DAYS: readonly number[] = [30, 14, 7];
export const REMINDER_LEAD_MIN = 1;
export const REMINDER_LEAD_MAX = 365;
export const MAX_REMINDER_LEADS = 5;

export type MaintenanceSettings = {
  /** In-app reminder lead times, in days before a due date. Changed by an administrator. */
  reminderLeadDays: readonly number[];
  /** PROVISIONAL, pending school confirmation. Default 14 days. */
  serviceDueSoonDays: number;
  /** PROVISIONAL, pending school confirmation. Default 500 km. */
  serviceDueSoonKm: number;
};

export const DEFAULT_MAINTENANCE_SETTINGS: MaintenanceSettings = {
  reminderLeadDays: DEFAULT_REMINDER_LEAD_DAYS,
  serviceDueSoonDays: PROVISIONAL_SERVICE_DUE_SOON_DAYS,
  serviceDueSoonKm: PROVISIONAL_SERVICE_DUE_SOON_KM,
};

/** Insurance and VET warnings use the largest configured lead time, so a warning starts when the first reminder does. */
export function warningWindowDays(settings: MaintenanceSettings): number {
  return Math.max(...settings.reminderLeadDays);
}

/**
 * Checks lead times from an administrator. Returns the list sorted from largest to smallest, with no duplicates.
 * Refuses anything that is not a whole number of days in range, and any list that is empty or too long.
 */
export function resolveReminderLeadDays(input: unknown): { ok: true; leadDays: number[] } | { ok: false; message: string } {
  if (!Array.isArray(input)) return { ok: false, message: "Enter the reminder lead times as a list of days." };
  if (input.length === 0 || input.length > MAX_REMINDER_LEADS) {
    return { ok: false, message: `Enter between 1 and ${MAX_REMINDER_LEADS} reminder lead times.` };
  }
  const seen = new Set<number>();
  for (const value of input) {
    if (typeof value !== "number" || !Number.isInteger(value) || value < REMINDER_LEAD_MIN || value > REMINDER_LEAD_MAX) {
      return { ok: false, message: `Each reminder lead time must be a whole number of days from ${REMINDER_LEAD_MIN} to ${REMINDER_LEAD_MAX}.` };
    }
    if (seen.has(value)) return { ok: false, message: "Each reminder lead time can be chosen only once." };
    seen.add(value);
  }
  return { ok: true, leadDays: [...seen].sort((a, b) => b - a) };
}

// ---------------------------------------------------------------------------
// VET (emission test)
// ---------------------------------------------------------------------------

export type VetResult = "PASS" | "FAIL";

export type ComplianceDecisionLite = { kind: "NOT_APPLICABLE" | "EXCEPTION_DOCUMENTED" } | null;

export type VetTestLite = {
  testedOn: string;
  result: VetResult | null;
  certificateExpiresOn: string | null;
  nextDueOn: string | null;
} | null;

export type VetState =
  | "NOT_APPLICABLE"
  | "EXCEPTION_DOCUMENTED"
  | "NOT_RECORDED"
  | "DUE_DATE_MISSING"
  | "FAILED"
  | "EXPIRED"
  | "OVERDUE"
  | "DUE_SOON"
  | "VALID";

export type VetStatus = {
  state: VetState;
  /** The date that decides the state, or null when none is recorded. */
  dueOn: string | null;
  /** Which recorded date decided it: the certificate expiry, or the administrator's next due date. */
  dueKind: "CERTIFICATE_EXPIRY" | "NEXT_DUE" | null;
  /** The recorded result. Null means "not recorded". It is never inferred from dates. */
  result: VetResult | null;
  resultRecorded: boolean;
};

/**
 * The VET state on `today`, for the latest test. The decision comes first: a vehicle that is not applicable, or has a documented
 * exception, is not checked against dates. With no test the state is NOT_RECORDED. A latest test with no recorded date is
 * DUE_DATE_MISSING, which is never treated as valid. When both dates exist, the earlier one decides.
 *
 * A latest test with result FAIL is shown as FAILED, whatever its dates say (school decision, Phase C2). The date that would
 * otherwise decide is still returned, so the expiry or due information stays visible. A later test supersedes this one.
 */
export function vetStatus(
  decision: ComplianceDecisionLite,
  latestTest: VetTestLite,
  today: string,
  warningDays: number,
): VetStatus {
  if (decision?.kind === "NOT_APPLICABLE") return { state: "NOT_APPLICABLE", dueOn: null, dueKind: null, result: null, resultRecorded: false };
  if (decision?.kind === "EXCEPTION_DOCUMENTED") {
    return { state: "EXCEPTION_DOCUMENTED", dueOn: null, dueKind: null, result: latestTest?.result ?? null, resultRecorded: latestTest?.result != null };
  }
  if (!latestTest) return { state: "NOT_RECORDED", dueOn: null, dueKind: null, result: null, resultRecorded: false };

  const result = latestTest.result;
  const resultRecorded = result !== null;

  const candidates: { date: string; kind: "CERTIFICATE_EXPIRY" | "NEXT_DUE" }[] = [];
  if (latestTest.certificateExpiresOn) candidates.push({ date: latestTest.certificateExpiresOn, kind: "CERTIFICATE_EXPIRY" });
  if (latestTest.nextDueOn) candidates.push({ date: latestTest.nextDueOn, kind: "NEXT_DUE" });
  candidates.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const decider = candidates[0] ?? null;

  // FAIL comes before any date state, but the deciding date (when there is one) is still reported.
  if (result === "FAIL") {
    return { state: "FAILED", dueOn: decider?.date ?? null, dueKind: decider?.kind ?? null, result, resultRecorded };
  }
  if (decider === null) return { state: "DUE_DATE_MISSING", dueOn: null, dueKind: null, result, resultRecorded };

  const daysLeft = daysBetween(today, decider.date);
  if (daysLeft < 0) {
    return { state: decider.kind === "CERTIFICATE_EXPIRY" ? "EXPIRED" : "OVERDUE", dueOn: decider.date, dueKind: decider.kind, result, resultRecorded };
  }
  const state: VetState = daysLeft <= warningDays ? "DUE_SOON" : "VALID";
  return { state, dueOn: decider.date, dueKind: decider.kind, result, resultRecorded };
}

// ---------------------------------------------------------------------------
// Revenue Licence
// ---------------------------------------------------------------------------

export type RevenueState = "NOT_APPLICABLE" | "EXCEPTION_DOCUMENTED" | "NOT_RECORDED" | "OVERDUE" | "DUE_SOON" | "ACTIVE";

export type RevenueStatus = { state: RevenueState; dueOn: string | null; daysLeft: number | null };

/**
 * The Revenue Licence state on `today`, from the administrator's due date. No renewal period is assumed. Due today is DUE_SOON.
 * The day after the due date is OVERDUE. This does not say the licence is officially valid: it is an application record only.
 */
export function revenueStatus(decision: ComplianceDecisionLite, latest: { dueOn: string } | null, today: string, warningDays: number): RevenueStatus {
  if (decision?.kind === "NOT_APPLICABLE") return { state: "NOT_APPLICABLE", dueOn: null, daysLeft: null };
  if (decision?.kind === "EXCEPTION_DOCUMENTED") return { state: "EXCEPTION_DOCUMENTED", dueOn: null, daysLeft: null };
  if (!latest) return { state: "NOT_RECORDED", dueOn: null, daysLeft: null };
  const daysLeft = daysBetween(today, latest.dueOn);
  if (daysLeft < 0) return { state: "OVERDUE", dueOn: latest.dueOn, daysLeft };
  return { state: daysLeft <= warningDays ? "DUE_SOON" : "ACTIVE", dueOn: latest.dueOn, daysLeft };
}

// ---------------------------------------------------------------------------
// Renewal prerequisites
// ---------------------------------------------------------------------------

export type PrerequisiteCheck = {
  renewalDate: string;
  insurance: { state: InsuranceStatus["state"]; ok: boolean };
  vet: { state: VetState; ok: boolean };
  /** Plain-language warnings, one per prerequisite that is not valid on the renewal date. Empty when all are valid. */
  warnings: string[];
  /** Always "NOT_VERIFIED": the application records are not an official legal check. */
  legalVerification: "NOT_VERIFIED";
};

const INSURANCE_OK: readonly InsuranceStatus["state"][] = ["ACTIVE", "EXPIRING_SOON"];
const VET_OK: readonly VetState[] = ["VALID", "DUE_SOON", "NOT_APPLICABLE", "EXCEPTION_DOCUMENTED"];

/**
 * Checks the insurance and VET prerequisites on the renewal date, not today. A prerequisite that is missing, expired, overdue,
 * failed or without a due date is a warning. The check never refuses a renewal by itself: see requireRenewalConfirmation.
 */
export function renewalPrerequisites(input: {
  renewalDate: string;
  policies: PolicyPeriod[];
  decision: ComplianceDecisionLite;
  latestTest: VetTestLite;
  settings: MaintenanceSettings;
}): PrerequisiteCheck {
  const windowDays = warningWindowDays(input.settings);
  const insurance = insuranceStatus(input.policies, input.renewalDate, windowDays);
  const vet = vetStatus(input.decision, input.latestTest, input.renewalDate, windowDays);
  const insuranceOk = INSURANCE_OK.includes(insurance.state);
  const vetOk = VET_OK.includes(vet.state);

  const warnings: string[] = [];
  if (!insuranceOk) warnings.push(`Insurance is not valid on ${input.renewalDate} (${insurance.state.replace(/_/g, " ").toLowerCase()}).`);
  if (!vetOk) warnings.push(`The emission test is not valid on ${input.renewalDate} (${vet.state.replace(/_/g, " ").toLowerCase()}).`);

  return {
    renewalDate: input.renewalDate,
    insurance: { state: insurance.state, ok: insuranceOk },
    vet: { state: vet.state, ok: vetOk },
    warnings,
    legalVerification: "NOT_VERIFIED",
  };
}

/**
 * A renewal with warnings needs an explicit, recorded confirmation from the administrator. The renewal is never blocked by a
 * warning alone. When it is confirmed, the caller writes the warnings and the statuses to the audit log.
 */
export function requireRenewalConfirmation(
  check: PrerequisiteCheck,
  confirmed: boolean,
): { ok: true; confirmationRequired: boolean; auditStatuses: string[] } | { ok: false; message: string } {
  if (check.warnings.length === 0) return { ok: true, confirmationRequired: false, auditStatuses: [] };
  if (!confirmed) {
    return { ok: false, message: "Some prerequisites are not valid on the renewal date. Confirm that you have reviewed them to record the renewal." };
  }
  return { ok: true, confirmationRequired: true, auditStatuses: check.warnings };
}

// ---------------------------------------------------------------------------
// Reminders (in-app)
// ---------------------------------------------------------------------------

/**
 * A reminder for a due date is open on each day from (due date minus lead) through the due date, inclusive. After the due date
 * the reminder stays open until it is acknowledged, and the overdue state is shown separately.
 */
export function reminderOpenOn(dueOn: string, today: string, leadDays: number): boolean {
  return today >= addDays(dueOn, -leadDays) && today <= dueOn;
}

/** The lead times whose window is open today, largest first. Used to show which reminders apply, never to send anything. */
export function remindersOpenToday(dueOn: string, today: string, settings: MaintenanceSettings): number[] {
  return [...settings.reminderLeadDays].sort((a, b) => b - a).filter((lead) => reminderOpenOn(dueOn, today, lead));
}

/**
 * The idempotency key for one reminder. The database unique key uses the same five parts, so generating reminders twice inserts
 * nothing new. A renewal or a new service has a new target id, so it gets its own reminders.
 */
export function reminderKey(parts: { vehicleId: string; category: string; targetRecordId: string; dueOn: string; leadDays: number }): string {
  return [parts.vehicleId, parts.category, parts.targetRecordId, parts.dueOn, String(parts.leadDays)].join("|");
}

// ---------------------------------------------------------------------------
// Service checklist
// ---------------------------------------------------------------------------

export const CHECKLIST_ITEMS = ["ENGINE", "BRAKES", "SUSPENSION", "STEERING", "TYRES", "BATTERY", "LIGHTS", "LEAKS", "ELECTRICAL"] as const;
export type ChecklistItemName = (typeof CHECKLIST_ITEMS)[number];
export const CHECKLIST_RESULTS = ["PASS", "ATTENTION", "FAIL", "NOT_CHECKED"] as const;
export type ChecklistResultName = (typeof CHECKLIST_RESULTS)[number];
export const CHECKLIST_NOTE_MAX = 500;

/**
 * Validates a checklist. Every record stores all nine items: an item that is not sent is stored as NOT_CHECKED, so a missing item
 * is never mistaken for a pass. Unknown items, repeated items, unknown results and long notes are refused.
 */
export function validateChecklist(
  input: unknown,
): { ok: true; items: { item: ChecklistItemName; result: ChecklistResultName; note: string | null }[] } | { ok: false; message: string } {
  if (input === undefined || input === null) {
    return { ok: true, items: CHECKLIST_ITEMS.map((item) => ({ item, result: "NOT_CHECKED", note: null })) };
  }
  if (!Array.isArray(input)) return { ok: false, message: "The checklist must be a list of items." };

  const byItem = new Map<ChecklistItemName, { item: ChecklistItemName; result: ChecklistResultName; note: string | null }>();
  for (const entry of input) {
    if (!entry || typeof entry !== "object") return { ok: false, message: "Each checklist entry must name an item and a result." };
    const { item, result, note } = entry as { item?: unknown; result?: unknown; note?: unknown };
    if (typeof item !== "string" || !(CHECKLIST_ITEMS as readonly string[]).includes(item)) {
      return { ok: false, message: "A checklist entry names an item that is not on the checklist." };
    }
    if (typeof result !== "string" || !(CHECKLIST_RESULTS as readonly string[]).includes(result)) {
      return { ok: false, message: "Choose a result for each checklist item: pass, attention, fail or not checked." };
    }
    if (byItem.has(item as ChecklistItemName)) return { ok: false, message: "Each checklist item can be given only once." };
    let cleanNote: string | null = null;
    if (note !== undefined && note !== null) {
      if (typeof note !== "string") return { ok: false, message: "A checklist note must be text." };
      const trimmed = note.trim();
      if (trimmed.length > CHECKLIST_NOTE_MAX) return { ok: false, message: `A checklist note can be at most ${CHECKLIST_NOTE_MAX} characters.` };
      cleanNote = trimmed.length > 0 ? trimmed : null;
    }
    byItem.set(item as ChecklistItemName, { item: item as ChecklistItemName, result: result as ChecklistResultName, note: cleanNote });
  }
  return { ok: true, items: CHECKLIST_ITEMS.map((item) => byItem.get(item) ?? { item, result: "NOT_CHECKED", note: null }) };
}

// ---------------------------------------------------------------------------
// Odometer
// ---------------------------------------------------------------------------

/**
 * The current known reading: the latest valid odometer on any service record that is not superseded. "Latest" means the most
 * recent service date, and on the same date the higher reading. Returns null when no valid reading exists. There is no separate
 * odometer log in this phase.
 */
export function currentOdometerKm(records: { serviceDate: string; odometerKm: number | null; superseded: boolean }[]): number | null {
  const valid = records.filter(
    (r) => !r.superseded && r.odometerKm !== null && Number.isInteger(r.odometerKm) && r.odometerKm >= 0 && isDateString(r.serviceDate),
  );
  if (valid.length === 0) return null;
  valid.sort((a, b) => (a.serviceDate !== b.serviceDate ? (a.serviceDate < b.serviceDate ? 1 : -1) : (b.odometerKm! - a.odometerKm!)));
  return valid[0].odometerKm;
}

/**
 * The next-service fields of the latest valid service record: the non-superseded record with the latest service date. When two
 * valid records share that date, the one with the later next-service date (then the higher next odometer reading) is used, so the
 * schedule is never understated. Returns null when there is no valid record. The database stores no status on a record.
 */
export function latestNextService(
  records: { serviceDate: string; nextServiceDate: string | null; nextServiceOdometerKm: number | null; superseded: boolean }[],
): NextServiceLite | null {
  const valid = records.filter((r) => !r.superseded && isDateString(r.serviceDate));
  if (valid.length === 0) return null;
  const latestDate = valid.reduce((best, r) => (r.serviceDate > best ? r.serviceDate : best), valid[0].serviceDate);
  const sameDay = valid.filter((r) => r.serviceDate === latestDate);
  sameDay.sort((a, b) => {
    const dateOrder = (b.nextServiceDate ?? "") < (a.nextServiceDate ?? "") ? -1 : (b.nextServiceDate ?? "") > (a.nextServiceDate ?? "") ? 1 : 0;
    if (dateOrder !== 0) return dateOrder;
    return (b.nextServiceOdometerKm ?? -1) - (a.nextServiceOdometerKm ?? -1);
  });
  const chosen = sameDay[0];
  return { nextServiceDate: chosen.nextServiceDate, nextServiceOdometerKm: chosen.nextServiceOdometerKm };
}

/**
 * Checks a new odometer reading. It must be a whole number, not negative. A reading lower than the current known reading is a
 * regression. A regression is refused unless an explanation is given. With an explanation it is accepted, and the caller must
 * write the explanation to the audit log.
 */
export function checkOdometerReading(input: { reading: unknown; current: number | null; explanation: string | null }):
  | { ok: true; regression: boolean; auditRequired: boolean }
  | { ok: false; message: string } {
  const { reading, current, explanation } = input;
  if (typeof reading !== "number" || !Number.isInteger(reading) || reading < 0) {
    return { ok: false, message: "Enter the odometer reading as a whole number of kilometres, zero or more." };
  }
  if (current === null || reading >= current) return { ok: true, regression: false, auditRequired: false };
  const text = (explanation ?? "").trim();
  if (text.length === 0) {
    return { ok: false, message: `This reading is lower than the last known reading (${current} km). Explain the difference to record it.` };
  }
  if (text.length > 500) return { ok: false, message: "An odometer explanation can be at most 500 characters." };
  return { ok: true, regression: true, auditRequired: true };
}

/**
 * Mileage-based status for a due reading. With no known reading the answer is CANNOT_DETERMINE, never "up to date". The
 * date-based state is separate and is not affected.
 */
export function mileageStatus(dueOdometerKm: number | null, current: number | null, dueSoonKm: number): "NOT_SET" | "CANNOT_DETERMINE" | "OVERDUE" | "DUE_SOON" | "OK" {
  if (dueOdometerKm === null) return "NOT_SET";
  if (current === null) return "CANNOT_DETERMINE";
  if (current >= dueOdometerKm) return "OVERDUE";
  return dueOdometerKm - current <= dueSoonKm ? "DUE_SOON" : "OK";
}

// ---------------------------------------------------------------------------
// Corrective service and faults
// ---------------------------------------------------------------------------

/**
 * A service record may link to a fault only when it is a corrective service, and only for the same vehicle. Routine service and
 * mechanical inspection never need a link. Linking does not change the fault: the fault and the service history stay separate.
 */
export function canLinkServiceToFault(
  service: { vehicleId: string; category: string },
  fault: { vehicleId: string } | null,
): { ok: true } | { ok: false; message: string } {
  if (fault === null) return { ok: true };
  if (service.category !== "CORRECTIVE_SERVICE") {
    return { ok: false, message: "Only a corrective service can be linked to a fault." };
  }
  if (fault.vehicleId !== service.vehicleId) {
    return { ok: false, message: "The fault belongs to a different vehicle." };
  }
  return { ok: true };
}
