import { NextResponse } from "next/server";
import { assertSameOrigin, clientIp, handleAuthRouteError, jsonError, readJsonObject } from "@/lib/auth/http";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { PackageUnavailableError, PerSessionPackageError, submitRegistration } from "@/lib/registration/submit";
import { parseRegistrationInput } from "@/lib/registration/validation";

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;

/**
 * Public student registration. It creates a PENDING request only. It never creates an account,
 * a student profile or an enrollment, and it never records a payment.
 */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const limit = consumeRateLimit(`registration:${clientIp(request)}`, RATE_LIMIT, RATE_WINDOW_MS);
    if (!limit.allowed) {
      return jsonError(429, "Too many applications from this connection. Try again later.", {
        "Retry-After": String(limit.retryAfterSeconds),
      });
    }

    const body = await readJsonObject(request);
    const parsed = parseRegistrationInput(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: "Please check the highlighted fields.", fields: parsed.errors }, { status: 422 });
    }

    try {
      const { referenceNumber } = await submitRegistration(parsed.input);
      return NextResponse.json(
        {
          referenceNumber,
          message: "Your application has been received and is waiting for review. No payment has been recorded yet.",
        },
        { status: 201 },
      );
    } catch (error) {
      if (error instanceof PackageUnavailableError) {
        return NextResponse.json(
          { error: "Please check the highlighted fields.", fields: { packageId: "Select an available training package." } },
          { status: 422 },
        );
      }
      if (error instanceof PerSessionPackageError) {
        return NextResponse.json(
          {
            error: "Please check the highlighted fields.",
            fields: { packageId: "This package is charged per session. Contact the school to register for it." },
          },
          { status: 422 },
        );
      }
      throw error;
    }
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
