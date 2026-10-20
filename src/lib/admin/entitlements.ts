import { LessonScheduleStatus } from "@/generated/prisma/enums";
import { AuthError } from "@/lib/auth/http";
import { prisma } from "@/lib/prisma";
import { parseEntitlementCount, parseEntitlementReason, requireExpectedUpdatedAt } from "@/lib/admin/entitlement-rules";

/**
 * Confirms, or later changes, the session count of one enrollment requirement. A count is confirmed when the school
 * sets it for the first time; a requirement with no count is "allocation pending" and cannot be booked.
 *
 * Rules: an integer from 1 to 500; never below the sessions already completed or scheduled for that requirement
 * (cancelled lessons do not count); a trimmed reason of at most 300 characters for the first confirmation and for
 * every later change; and the caller must send the requirement's current updatedAt, so a stale page is refused.
 * The count, the audit row and the lock are all in one transaction.
 */
export async function confirmRequiredSessions(
  requirementId: string,
  adminUserId: string,
  input: { count: unknown; reason: unknown; expectedUpdatedAt: unknown },
) {
  // Every input is checked before the database is touched.
  const count = parseEntitlementCount(input.count);
  const reason = parseEntitlementReason(input.reason);
  const expected = requireExpectedUpdatedAt(typeof input.expectedUpdatedAt === "string" ? input.expectedUpdatedAt : null);

  return prisma.$transaction(async (tx) => {
    // The same row lock that booking takes, so a booking in progress finishes before the count is compared.
    await tx.$queryRaw`SELECT id FROM "EnrollmentTrainingRequirement" WHERE id = ${requirementId} FOR UPDATE`;
    const requirement = await tx.enrollmentTrainingRequirement.findUnique({
      where: { id: requirementId },
      select: { id: true, enrollmentId: true, vehicleType: true, trainingType: true, requiredSessions: true, updatedAt: true },
    });
    if (!requirement) throw new AuthError(404, "That training requirement was not found.");
    if (requirement.updatedAt.toISOString() !== expected) {
      throw new AuthError(409, "This requirement was changed by someone else. Reload the page and try again.");
    }

    // Re-counted under the lock: completed and scheduled lessons for this requirement. Cancelled lessons do not count.
    const used = await tx.lessonSchedule.count({
      where: {
        enrollmentId: requirement.enrollmentId,
        vehicleType: requirement.vehicleType,
        trainingType: requirement.trainingType,
        status: { not: LessonScheduleStatus.CANCELLED },
      },
    });
    if (count < used) {
      throw new AuthError(409, `The count cannot be below the ${used} session${used === 1 ? "" : "s"} already completed or scheduled.`);
    }

    const updated = await tx.enrollmentTrainingRequirement.update({
      where: { id: requirement.id },
      data: { requiredSessions: count },
      select: { requiredSessions: true, updatedAt: true },
    });
    // Written in the same transaction, so a failed audit write rolls the confirmation back.
    await tx.enrollmentRequirementChange.create({
      data: {
        requirementId: requirement.id,
        enrollmentId: requirement.enrollmentId,
        previousRequiredSessions: requirement.requiredSessions,
        newRequiredSessions: count,
        reason,
        changedByUserId: adminUserId,
      },
    });

    return {
      id: requirement.id,
      requiredSessions: updated.requiredSessions,
      previousRequiredSessions: requirement.requiredSessions,
      updatedAt: updated.updatedAt.toISOString(),
    };
  });
}
