import { AuthError } from "@/lib/auth/http";

/** Longest cancellation reason, in characters. Used by both the admin and the instructor cancellation flows. */
export const CANCELLATION_REASON_MAX = 300;

/**
 * Checks the reason for a new cancellation. It is required for every cancellation by an admin or an instructor:
 * the trimmed text must not be empty and must be at most CANCELLATION_REASON_MAX characters.
 */
export function parseCancellationReason(value: unknown): string {
  const reason = typeof value === "string" ? value.trim() : "";
  if (!reason) throw new AuthError(400, "Enter the reason for cancelling this lesson.");
  if (reason.length > CANCELLATION_REASON_MAX) {
    throw new AuthError(400, `The reason must be ${CANCELLATION_REASON_MAX} characters or fewer.`);
  }
  return reason;
}

/** Who cancelled, as the student may see it. Only the role is shown, never a staff member's name or ID. */
export type CancelledBy = "SCHOOL" | "INSTRUCTOR" | null;

export type StudentCancellation = {
  reason: string | null;
  cancelledAt: string | null;
  cancelledBy: CancelledBy;
};

/**
 * What a student may see about a cancelled lesson. Historical cancellations have no reason or actor recorded,
 * and they are shown that way rather than guessed.
 */
export function studentCancellation(lesson: {
  cancellationReason: string | null;
  cancelledAt: Date | null;
  cancelledBy: { role: string } | null;
}): StudentCancellation {
  const role = lesson.cancelledBy?.role;
  return {
    reason: lesson.cancellationReason,
    cancelledAt: lesson.cancelledAt ? lesson.cancelledAt.toISOString() : null,
    cancelledBy: role === "ADMIN" ? "SCHOOL" : role === "INSTRUCTOR" ? "INSTRUCTOR" : null,
  };
}
