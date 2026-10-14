import { NextResponse } from "next/server";
import { AuthError, assertSameOrigin, clientIp, handleAuthRouteError, jsonError, readJsonObject, readString } from "@/lib/auth/http";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { confirmEmailChange } from "@/lib/auth/email-change";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const limit = consumeRateLimit(`email-change-confirm:${clientIp(request)}`, 10, 15 * 60 * 1000);
    if (!limit.allowed) {
      return jsonError(429, "Too many attempts. Try again later.", { "Retry-After": String(limit.retryAfterSeconds) });
    }

    const body = await readJsonObject(request);
    const token = readString(body, "token", 200);
    if (!token) {
      throw new AuthError(400, "This verification link is invalid or has expired.");
    }

    await confirmEmailChange(token);
    return NextResponse.json({ ok: true, message: "Your email address has been updated." });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
