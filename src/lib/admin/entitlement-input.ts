/**
 * Entitlement confirmation input rules that depend on nothing else. The admin form and the server both use them,
 * so the two cannot drift apart. The server still re-checks every value; this module adds no new rule.
 */

/** Smallest session count a requirement can be confirmed to. */
export const MIN_REQUIRED_SESSIONS = 1;
/** Largest session count. A technical limit chosen for this system, not a school rule. */
export const MAX_REQUIRED_SESSIONS = 500;
/** Longest reason, in characters. Matches the cancellation-reason limit. */
export const ENTITLEMENT_REASON_MAX = 300;

export type EntitlementInputCheck = { ok: true; count: number; reason: string } | { ok: false; message: string };

/**
 * Checks what an administrator typed into the confirmation form. `used` is the completed plus scheduled sessions
 * for the requirement; the count may not go below it.
 */
export function checkEntitlementInput(input: { count: string; reason: string; used: number }): EntitlementInputCheck {
  const parsed = Number(input.count);
  if (input.count.trim() === "" || !Number.isInteger(parsed) || parsed < MIN_REQUIRED_SESSIONS || parsed > MAX_REQUIRED_SESSIONS) {
    return { ok: false, message: `Enter a whole number of sessions from ${MIN_REQUIRED_SESSIONS} to ${MAX_REQUIRED_SESSIONS}.` };
  }
  if (parsed < input.used) {
    return {
      ok: false,
      message: `The count cannot be below the ${input.used} session${input.used === 1 ? "" : "s"} already completed or scheduled.`,
    };
  }
  const reason = input.reason.trim();
  if (!reason) return { ok: false, message: "Enter the reason for confirming or changing this session count." };
  if (reason.length > ENTITLEMENT_REASON_MAX) {
    return { ok: false, message: `The reason must be ${ENTITLEMENT_REASON_MAX} characters or fewer.` };
  }
  return { ok: true, count: parsed, reason };
}

/** When a confirmation was made, in Sri Lanka time, as the school reads dates. */
export function formatChangeTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Colombo" });
}

/** The line shown above the requirements when some are still waiting for a count. */
export function pendingSummary(pending: number): string {
  if (pending === 0) return "No requirements are waiting for a session count.";
  return `${pending} requirement${pending === 1 ? " is" : "s are"} waiting for a session count. Students cannot book them until it is confirmed.`;
}

/** A plain-language line for one row of the confirmation history. */
export function describeChange(change: { previousRequiredSessions: number | null; newRequiredSessions: number }): string {
  if (change.previousRequiredSessions === null) return `Confirmed at ${change.newRequiredSessions} sessions`;
  if (change.previousRequiredSessions === change.newRequiredSessions) return `Confirmed again at ${change.newRequiredSessions} sessions`;
  return `Changed from ${change.previousRequiredSessions} to ${change.newRequiredSessions} sessions`;
}
