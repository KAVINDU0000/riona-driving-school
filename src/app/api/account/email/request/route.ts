import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/authorize";
import { assertSameOrigin, handleAuthRouteError, jsonError, readJsonObject, readString } from "@/lib/auth/http";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { requestEmailChange } from "@/lib/auth/email-change";

const CURRENT_PASSWORD_MAX = 256;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);

    const limit = consumeRateLimit(`email-change:${user.userId}`, 5, 60 * 60 * 1000);
    if (!limit.allowed) {
      return jsonError(429, "Too many requests. Try again later.", { "Retry-After": String(limit.retryAfterSeconds) });
    }

    const body = await readJsonObject(request);
    const newEmail = readString(body, "newEmail", 254);
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    if (!newEmail || !currentPassword || currentPassword.length > CURRENT_PASSWORD_MAX) {
      return jsonError(400, "Enter the new email address and your current password.");
    }

    await requestEmailChange(user.userId, currentPassword, newEmail);
    return NextResponse.json({ ok: true, message: "We sent a verification link to the new address." }, { status: 202 });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
