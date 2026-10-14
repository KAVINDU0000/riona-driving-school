/** Session and token settings shared by the auth modules. */

export const SESSION_COOKIE_NAME = "riona_session";

/** Sessions expire server-side after this many seconds, and the cookie carries the same lifetime. */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

export const EMAIL_CHANGE_TTL_MS = 60 * 60 * 1000;

export function isProduction() {
  return process.env.NODE_ENV === "production";
}

/** Cookie attributes for the session token. `Secure` is required on HTTPS deployments, so it is set in production only. */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction(),
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
