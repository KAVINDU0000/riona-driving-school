import { NextResponse } from "next/server";
import { AuthError, assertSameOrigin, clientIp, handleAuthRouteError, jsonError, readJsonObject, readString } from "@/lib/auth/http";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { completePasswordReset } from "@/lib/auth/password-reset";
import { validateNewPassword } from "@/lib/auth/password";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const limit = consumeRateLimit(`password-reset-confirm:${clientIp(request)}`, 10, 15 * 60 * 1000);
    if (!limit.allowed) {
      return jsonError(429, "Too many attempts. Try again later.", { "Retry-After": String(limit.retryAfterSeconds) });
    }

    const body = await readJsonObject(request);
    const token = readString(body, "token", 200);
    if (!token) {
      throw new AuthError(400, "This reset link is invalid or has expired.");
    }

    const passwordError = validateNewPassword(body.password);
    if (passwordError) {
      throw new AuthError(400, passwordError);
    }

    await completePasswordReset(token, body.password as string);
    return NextResponse.json({ ok: true, message: "Your password has been changed. Please sign in again." });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
