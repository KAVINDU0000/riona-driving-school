/**
 * Application-level validation for vehicle maintenance records. Each rule mirrors a constraint in docs/vehicle-maintenance/
 * DRAFT-migration.sql, so the user sees a clear message before the database would refuse the row. Pure: no database.
 * Money is LKR, held as Decimal(10,2): exact cents, zero or more, and at most 99,999,999.99.
 */
import { DOCUMENT_NAME_MAX, POLICY_NUMBER_MAX, isDateString } from "@/lib/vehicles/maintenance-rules";

export type Check = { ok: true } | { ok: false; message: string };

export const POLICY_INSURER_MAX = 200;
export const POLICY_COVERAGE_MAX = 200;
export const CERTIFICATE_NUMBER_MAX = 100;
export const LICENCE_NUMBER_MAX = 100;
export const FAULT_DESCRIPTION_MAX_CHARS = 2000;
export const DECISION_REASON_MAX = 1000;
export const MONEY_MAX_CENTS = 9_999_999_999; // Decimal(10,2): 99,999,999.99

const fail = (message: string): Check => ({ ok: false, message });

function trimmedLength(value: string): number {
  return value.trim().length;
}

/** Converts an amount to whole cents. Refuses anything that is not exact to the cent. */
export function moneyToCents(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  const cents = Math.round(value * 100);
  if (Math.abs(value * 100 - cents) > 1e-6) return null;
  return cents;
}

export function checkMoney(value: number, label: string): Check {
  const cents = moneyToCents(value);
  if (cents === null) return fail(`${label} must be an amount in LKR with at most two decimal places.`);
  if (cents < 0) return fail(`${label} cannot be negative.`);
  if (cents > MONEY_MAX_CENTS) return fail(`${label} is too large.`);
  return { ok: true };
}

/** A document's stored name: 1 to 200 characters after trimming, as the database checks it. */
export function checkDocumentName(name: string): Check {
  const length = trimmedLength(name);
  if (length === 0) return fail("The file needs a name.");
  if (length > DOCUMENT_NAME_MAX) return fail(`The file name can be at most ${DOCUMENT_NAME_MAX} characters.`);
  return { ok: true };
}

export function checkPolicyFields(input: { insurer: string; policyNumber: string; coverage: string; premium: number }): Check {
  const insurer = trimmedLength(input.insurer);
  if (insurer === 0) return fail("Enter the insurer.");
  if (insurer > POLICY_INSURER_MAX) return fail(`The insurer name can be at most ${POLICY_INSURER_MAX} characters.`);
  const number = trimmedLength(input.policyNumber);
  if (number === 0) return fail("Enter the policy number.");
  if (number > POLICY_NUMBER_MAX) return fail(`The policy number can be at most ${POLICY_NUMBER_MAX} characters.`);
  // Application rule (not a database rule): the coverage type is required and bounded.
  const coverage = trimmedLength(input.coverage);
  if (coverage === 0) return fail("Enter the coverage type.");
  if (coverage > POLICY_COVERAGE_MAX) return fail(`The coverage type can be at most ${POLICY_COVERAGE_MAX} characters.`);
  return checkMoney(input.premium, "The premium");
}

/** Policy dates: expiry after the start, as the database checks it. Overlap is checked separately (checkPolicyPeriod). */
export function checkPolicyDates(startsOn: string, expiresOn: string): Check {
  if (!isDateString(startsOn) || !isDateString(expiresOn)) return fail("Enter the start and expiry dates as real calendar dates.");
  if (expiresOn <= startsOn) return fail("The expiry date must be after the start date.");
  return { ok: true };
}

/** Emission test dates: certificate expiry on or after its issue date, and next due on or after the test. */
export function checkEmissionTestRecord(input: {
  testedOn: string;
  issuedOn: string | null;
  certificateExpiresOn: string | null;
  nextDueOn: string | null;
  certificateNumber: string | null;
}): Check {
  if (!isDateString(input.testedOn)) return fail("Enter the test date as a real calendar date.");
  for (const [label, value] of [
    ["The issue date", input.issuedOn],
    ["The certificate expiry date", input.certificateExpiresOn],
    ["The next due date", input.nextDueOn],
  ] as const) {
    if (value !== null && !isDateString(value)) return fail(`${label} must be a real calendar date.`);
  }
  if (input.issuedOn && input.certificateExpiresOn && input.certificateExpiresOn < input.issuedOn) {
    return fail("The certificate expiry date cannot be before its issue date.");
  }
  if (input.nextDueOn && input.nextDueOn < input.testedOn) return fail("The next due date cannot be before the test date.");
  if (input.certificateNumber !== null && (trimmedLength(input.certificateNumber) === 0 || trimmedLength(input.certificateNumber) > CERTIFICATE_NUMBER_MAX)) {
    return fail(`The certificate number must be 1 to ${CERTIFICATE_NUMBER_MAX} characters.`);
  }
  return { ok: true };
}

/** Revenue licence dates: the due date is required; a renewal date cannot be before the issue date. */
export function checkRevenueLicenceRecord(input: {
  issuedOn: string | null;
  renewedOn: string | null;
  dueOn: string;
  licenceNumber: string | null;
}): Check {
  if (!isDateString(input.dueOn)) return fail("Enter the due date as a real calendar date.");
  if (input.issuedOn !== null && !isDateString(input.issuedOn)) return fail("The issue date must be a real calendar date.");
  if (input.renewedOn !== null && !isDateString(input.renewedOn)) return fail("The renewal date must be a real calendar date.");
  if (input.issuedOn && input.dueOn < input.issuedOn) return fail("The due date cannot be before the issue date.");
  if (input.issuedOn && input.renewedOn && input.renewedOn < input.issuedOn) return fail("The renewal date cannot be before the issue date.");
  if (input.licenceNumber !== null && (trimmedLength(input.licenceNumber) === 0 || trimmedLength(input.licenceNumber) > LICENCE_NUMBER_MAX)) {
    return fail(`The licence number must be 1 to ${LICENCE_NUMBER_MAX} characters.`);
  }
  return { ok: true };
}

/**
 * Service record: the total must equal parts plus labour, exactly, in cents. Odometer readings are whole and not negative, and a
 * next-service reading is not below the reading of the service. A next-service date is not before the service date.
 */
export function checkServiceRecord(input: {
  serviceDate: string;
  odometerKm: number | null;
  partsCost: number;
  labourCost: number;
  totalCost: number;
  nextServiceDate: string | null;
  nextServiceOdometerKm: number | null;
}): Check {
  if (!isDateString(input.serviceDate)) return fail("Enter the service date as a real calendar date.");
  if (input.odometerKm !== null && (!Number.isInteger(input.odometerKm) || input.odometerKm < 0)) {
    return fail("The odometer reading must be a whole number of kilometres, zero or more.");
  }
  for (const [value, label] of [
    [input.partsCost, "The parts cost"],
    [input.labourCost, "The labour cost"],
    [input.totalCost, "The total cost"],
  ] as const) {
    const money = checkMoney(value, label);
    if (!money.ok) return money;
  }
  const parts = moneyToCents(input.partsCost)!;
  const labour = moneyToCents(input.labourCost)!;
  const total = moneyToCents(input.totalCost)!;
  if (total !== parts + labour) return fail("The total cost must equal the parts cost plus the labour cost.");
  if (input.nextServiceDate !== null) {
    if (!isDateString(input.nextServiceDate)) return fail("The next service date must be a real calendar date.");
    if (input.nextServiceDate < input.serviceDate) return fail("The next service date cannot be before the service date.");
  }
  if (input.nextServiceOdometerKm !== null) {
    if (!Number.isInteger(input.nextServiceOdometerKm) || input.nextServiceOdometerKm < 0) {
      return fail("The next service odometer reading must be a whole number of kilometres, zero or more.");
    }
    if (input.odometerKm !== null && input.nextServiceOdometerKm < input.odometerKm) {
      return fail("The next service odometer reading cannot be below the reading at this service.");
    }
  }
  return { ok: true };
}

/** Fault: a description of 1 to 2000 characters, a repair cost in cents, and a completion no earlier than the report. */
export function checkFaultRecord(input: { description: string; repairCost: number | null; reportedAt: string; completedAt: string | null }): Check {
  const length = trimmedLength(input.description);
  if (length === 0) return fail("Describe the fault.");
  if (length > FAULT_DESCRIPTION_MAX_CHARS) return fail(`The description can be at most ${FAULT_DESCRIPTION_MAX_CHARS} characters.`);
  if (input.repairCost !== null) {
    const money = checkMoney(input.repairCost, "The repair cost");
    if (!money.ok) return money;
  }
  if (input.completedAt !== null && input.completedAt < input.reportedAt) {
    return fail("The completion date cannot be before the reported date.");
  }
  return { ok: true };
}

/** A decision's reason (not applicable, or a documented exception): 1 to 1000 characters. */
export function checkDecisionReason(reason: string): Check {
  const length = trimmedLength(reason);
  if (length === 0) return fail("Give a reason for this decision.");
  if (length > DECISION_REASON_MAX) return fail(`The reason can be at most ${DECISION_REASON_MAX} characters.`);
  return { ok: true };
}
