import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth/config";
import { parseTrustedProxyHops, resolveClientIp } from "@/lib/auth/client-ip";

/** An error with an HTTP status. Its message is safe to show the caller. */
export class AuthError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export function jsonError(status: number, message: string, headers?: Record<string, string>) {
  return NextResponse.json({ error: message }, { status, headers });
}

/**
 * Converts any thrown value into a response. Only the error's name is logged, never its message,
 * because Prisma and validation messages can include submitted values.
 */
export function handleAuthRouteError(error: unknown) {
  if (error instanceof AuthError) {
    return jsonError(error.status, error.message);
  }
  console.error("[auth] unexpected failure:", error instanceof Error ? error.name : "UnknownError");
  return jsonError(500, "Something went wrong. Please try again.");
}

/** Reads a JSON object body. Anything else is rejected with 400. */
export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AuthError(400, "Invalid request.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AuthError(400, "Invalid request.");
  }
  return body as Record<string, unknown>;
}

/** Returns the trimmed string value, or null when the value is missing, not a string, empty, or too long. */
export function readString(body: Record<string, unknown>, key: string, maxLength: number): string | null {
  const value = body[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}

/** Returns a lower-cased, trimmed email address, or null when it is not a plausible address. */
export function normalizeEmail(input: string): string | null {
  const email = input.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

/**
 * CSRF defence for cookie-authenticated POST requests. The session cookie is SameSite=Lax, and
 * this check also rejects requests whose Origin header is another site. APP_ORIGIN is needed when
 * the app runs behind a proxy that changes the host seen by Node.
 */
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return; // Non-browser clients send no Origin header; the SameSite cookie still blocks browser cross-site posts.

  const allowed = [new URL(request.url).origin];
  if (process.env.APP_ORIGIN) allowed.push(process.env.APP_ORIGIN);
  if (!allowed.includes(origin)) {
    throw new AuthError(403, "Request origin is not allowed.");
  }
}

/**
 * The rate-limit key for the caller. Forwarded headers are trusted only for the proxies named in TRUSTED_PROXY_HOPS (see
 * client-ip.ts). X-Real-IP is ignored, because it is as client-controlled as X-Forwarded-For.
 * An invalid TRUSTED_PROXY_HOPS throws, so a misconfigured server fails closed instead of trusting headers. Unset means 0.
 */
export function clientIp(request: Request): string {
  const hops = parseTrustedProxyHops(process.env.TRUSTED_PROXY_HOPS);
  return resolveClientIp(request.headers.get("x-forwarded-for"), hops);
}

/** Reads the session token from the Cookie header. The value is only looked up by its hash. */
export function readSessionToken(request: Request): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const name = part.slice(0, separator).trim();
    if (name !== SESSION_COOKIE_NAME) continue;
    const value = part.slice(separator + 1).trim();
    return value && value.length <= 200 ? value : undefined;
  }
  return undefined;
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", { ...sessionCookieOptions(), maxAge: 0, expires: new Date(0) });
}
