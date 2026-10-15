import { PaymentReviewDecision, PaymentStatus } from "@/generated/prisma/enums";
import { AuthError } from "@/lib/auth/http";
import { prisma } from "@/lib/prisma";

/**
 * Admin decision on one payment slip. A decision is final: only a PENDING payment can be reviewed. A rejection
 * needs a reason the applicant will see; an approval may carry an optional note. Every decision is also written
 * to PaymentReviewHistory, so the record of who decided what, and why, is kept.
 */

const REASON_MIN = 10;
const REASON_MAX = 500;

export type PaymentDecisionInput = { decision: PaymentReviewDecision; reason: string | null };

export function parsePaymentId(value: string): string {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(value)) {
    throw new AuthError(400, "That payment was not found.");
  }
  return value;
}

/** Checks the decision body. A rejection must explain itself, and the text is trimmed. */
export function parsePaymentDecision(body: Record<string, unknown>): PaymentDecisionInput {
  const decision = body.decision;
  if (decision !== "APPROVED" && decision !== "REJECTED") {
    throw new AuthError(400, "Choose approve or reject.");
  }

  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (decision === PaymentReviewDecision.REJECTED) {
    if (reason.length < REASON_MIN || reason.length > REASON_MAX) {
      throw new AuthError(400, `Enter a rejection reason of ${REASON_MIN} to ${REASON_MAX} characters.`);
    }
    return { decision, reason };
  }

  if (reason.length > REASON_MAX) {
    throw new AuthError(400, `The note can be at most ${REASON_MAX} characters.`);
  }
  return { decision, reason: reason || null };
}

/** Records the admin's decision on a pending payment. The row is locked, so two reviewers cannot both decide. */
export async function reviewPayment(paymentId: string, adminUserId: string, input: PaymentDecisionInput) {
  const id = parsePaymentId(paymentId);

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${id} FOR UPDATE`;
    const payment = await tx.payment.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!payment) {
      throw new AuthError(404, "That payment was not found.");
    }
    if (payment.status !== PaymentStatus.PENDING) {
      throw new AuthError(409, "This payment has already been reviewed.");
    }

    const status = input.decision === PaymentReviewDecision.APPROVED ? PaymentStatus.APPROVED : PaymentStatus.REJECTED;
    await tx.payment.update({
      where: { id },
      data: { status, reviewedByUserId: adminUserId, lastReviewedAt: new Date() },
    });
    await tx.paymentReviewHistory.create({
      data: { paymentId: id, reviewerUserId: adminUserId, decision: input.decision, reason: input.reason },
    });
    return { id, status };
  });
}
