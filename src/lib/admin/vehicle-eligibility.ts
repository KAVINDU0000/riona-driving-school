import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * The one place that decides whether a vehicle may be set to ACTIVE. Every path that sets ACTIVE (the status
 * change API, its preview, and any future bulk action) must call this, so no path can skip a rule.
 *
 * Insurance validity, unresolved maintenance and other approved safety restrictions are added here when their
 * modules are built. Until then no such rule is in force, and an empty `checkedRules` list means exactly that. It
 * is never proof that a vehicle is insured, roadworthy or eligible.
 */
export type EligibilityBlocker = { rule: string; message: string };

export type ActivationCheck = {
  /** True only when at least one rule has been checked. False means the check is not in force, and says nothing about the vehicle. */
  rulesInForce: boolean;
  checkedRules: string[];
  /** Any blocker stops the change to ACTIVE. */
  blockers: EligibilityBlocker[];
};

export async function checkActivationEligibility(
  vehicleId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<ActivationCheck> {
  const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true } });
  if (!vehicle) {
    return { rulesInForce: false, checkedRules: [], blockers: [{ rule: "vehicle", message: "That vehicle was not found." }] };
  }

  const checkedRules: string[] = [];
  const blockers: EligibilityBlocker[] = [];

  return { rulesInForce: checkedRules.length > 0, checkedRules, blockers };
}
