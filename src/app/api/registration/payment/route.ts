import { NextResponse } from "next/server";
import { assertSameOrigin, clientIp, handleAuthRouteError, jsonError } from "@/lib/auth/http";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { parsePaymentSubmission, submitApplicationPayment } from "@/lib/registration/payment-submission";

const HOUR_MS = 60 * 60 * 1000;
const IP_LIMIT = 20;
const REFERENCE_LIMIT = 10;
const RATE_MESSAGE = "Too many payment attempts. Try again later.";

/**
 * Public payment-slip submission for an application that is still pending. The form is multipart, with the
 * slip in the field "slip". A success creates one PENDING payment and never approves it.
 */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const byIp = consumeRateLimit(`payment-slip:ip:${clientIp(request)}`, IP_LIMIT, HOUR_MS);
    if (!byIp.allowed) {
      return jsonError(429, RATE_MESSAGE, { "Retry-After": String(byIp.retryAfterSeconds) });
    }

    const form = await request.formData().catch(() => null);
    if (!form) {
      return jsonError(400, "Send the payment details as a form with the slip attached.");
    }

    const parsed = parsePaymentSubmission(form);
    if (!parsed.ok) {
      return NextResponse.json({ error: "Please check the highlighted fields.", fields: parsed.errors }, { status: 422 });
    }

    // Limit attempts per application too, so one reference cannot be guessed from many addresses.
    const byReference = consumeRateLimit(`payment-slip:ref:${parsed.fields.referenceNumber}`, REFERENCE_LIMIT, HOUR_MS);
    if (!byReference.allowed) {
      return jsonError(429, RATE_MESSAGE, { "Retry-After": String(byReference.retryAfterSeconds) });
    }

    const payment = await submitApplicationPayment(parsed.fields, parsed.file);
    return NextResponse.json(
      {
        paymentId: payment.id,
        message: "Your payment slip has been received and is waiting for review. It is not approved yet.",
      },
      { status: 201 },
    );
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
