import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/authorize";
import { AuthError, assertSameOrigin, handleAuthRouteError, jsonError, readJsonObject, setSessionCookie } from "@/lib/auth/http";
import { changePassword } from "@/lib/auth/password-change";
import { consumeRateLimit } from "@/lib/auth/rate-limit";

const PASSWORD_MAX = 128;

/** Changes the signed-in user's password after re-checking the current one. Rate limited per account. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);

    const limit = consumeRateLimit(`password-change:${user.userId}`, 5, 15 * 60 * 1000);
    if (!limit.allowed) {
      return jsonError(429, "Too many attempts. Try again later.", { "Retry-After": String(limit.retryAfterSeconds) });
    }

    const body = await readJsonObject(request);
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    if (!currentPassword || currentPassword.length > PASSWORD_MAX || !newPassword) {
      throw new AuthError(400, "Enter your current password and a new password.");
    }

    const { token } = await changePassword(user.userId, currentPassword, newPassword);
    const response = NextResponse.json({ ok: true, message: "Your password has been changed. Other devices have been signed out." });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
