import { NextResponse } from "next/server";
import { assertSameOrigin, clientIp, handleAuthRouteError, jsonError, readJsonObject, readString } from "@/lib/auth/http";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { startPasswordReset } from "@/lib/auth/password-reset";

const GENERIC_MESSAGE = "If an account exists for that email, reset instructions will be sent.";

/** Always returns the same response, so the reply does not show whether the email belongs to an account. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readJsonObject(request);
    const email = readString(body, "email", 254);

    const limit = consumeRateLimit(`password-reset:${clientIp(request)}`, 5, 15 * 60 * 1000);
    if (!limit.allowed) {
      return jsonError(429, "Too many requests. Try again later.", { "Retry-After": String(limit.retryAfterSeconds) });
    }

    if (email) {
      await startPasswordReset(email);
    }
    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 202 });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
