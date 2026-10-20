import { AuthError } from "@/lib/auth/http";
import { ENTITLEMENT_REASON_MAX, MAX_REQUIRED_SESSIONS, MIN_REQUIRED_SESSIONS } from "@/lib/admin/entitlement-input";

/**
 * Server-side checks for entitlement confirmation. The limits come from entitlement-input, which the browser form also
 * uses. These functions import no database code, so they can be tested without one.
 */

export { MAX_REQUIRED_SESSIONS };

export function parseEntitlementCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < MIN_REQUIRED_SESSIONS || value > MAX_REQUIRED_SESSIONS) {
    throw new AuthError(400, `Enter a whole number of sessions from ${MIN_REQUIRED_SESSIONS} to ${MAX_REQUIRED_SESSIONS}.`);
  }
  return value;
}

/** The trimmed reason. Required on the first confirmation and on every later change; at most 300 characters. */
export function parseEntitlementReason(value: unknown): string {
  const reason = typeof value === "string" ? value.trim() : "";
  if (!reason) throw new AuthError(400, "Enter the reason for confirming or changing this session count.");
  if (reason.length > ENTITLEMENT_REASON_MAX) {
    throw new AuthError(400, `The reason must be ${ENTITLEMENT_REASON_MAX} characters or fewer.`);
  }
  return reason;
}

/**
 * The updatedAt the admin's page loaded, as an exact toISOString value. The stale check compares strings exactly, so
 * only that format is accepted. Missing, blank or malformed values are refused before any read or lock.
 */
export function requireExpectedUpdatedAt(value: string | null, subject = "The last-changed time"): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) || Number.isNaN(Date.parse(value))) {
    throw new AuthError(400, `${subject} is missing or invalid. Reload the page and try again.`);
  }
  return value;
}
