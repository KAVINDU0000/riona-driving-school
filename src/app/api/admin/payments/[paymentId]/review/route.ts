import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { assertSameOrigin, handleAuthRouteError, readJsonObject } from "@/lib/auth/http";
import { parsePaymentDecision, reviewPayment } from "@/lib/admin/payment-review";

/** Approves or rejects one pending payment. Admins only. The applicant sees the outcome on the status page. */
export async function POST(request: Request, context: { params: Promise<{ paymentId: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request, [UserRole.ADMIN]);
    const { paymentId } = await context.params;
    const decision = parsePaymentDecision(await readJsonObject(request));
    const result = await reviewPayment(paymentId, user.userId, decision);
    return NextResponse.json({ payment: result });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
