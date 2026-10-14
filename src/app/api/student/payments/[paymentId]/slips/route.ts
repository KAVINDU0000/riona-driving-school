import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { AuthError, assertSameOrigin, handleAuthRouteError } from "@/lib/auth/http";
import { uploadPaymentSlip } from "@/lib/student/payment-slips";

/** Uploads a payment slip (multipart field "file") to one of the student's own pending payments. */
export async function POST(request: Request, context: { params: Promise<{ paymentId: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request, [UserRole.STUDENT]);
    const { paymentId } = await context.params;

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      throw new AuthError(400, "Choose a file to upload.");
    }

    const slip = await uploadPaymentSlip(user.userId, paymentId, file);
    return NextResponse.json({ ok: true, slip }, { status: 201 });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
