import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { getDummyHash, verifyPassword } from "@/lib/auth/password";
import { isAccountEligible } from "@/lib/auth/authorize";
import { createSession, deleteSessionByToken } from "@/lib/auth/session";
import {
  AuthError,
  assertSameOrigin,
  clearSessionCookie,
  clientIp,
  handleAuthRouteError,
  jsonError,
  readJsonObject,
  readSessionToken,
  readString,
  setSessionCookie,
} from "@/lib/auth/http";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LIMIT = 10;
const MAX_PASSWORD_LENGTH = 256;

// One message for every failure (unknown account, wrong password, wrong role, inactive account),
// so the response does not reveal which accounts exist.
const INVALID_CREDENTIALS = "Invalid ID or password.";

const loginSelect = {
  userId: true,
  email: true,
  role: true,
  status: true,
  passwordHash: true,
  studentProfile: { select: { userId: true } },
  instructorProfile: { select: { status: true } },
} as const;

/**
 * Every role signs in with its account ID (STU-001, INS-001, ADMIN-001), compared in upper case. An email
 * address is never accepted as a login identifier. The role check in signIn still decides who may use which endpoint.
 */
async function findLoginUser(identifier: string) {
  return prisma.user.findUnique({ where: { userId: identifier.toUpperCase() }, select: loginSelect });
}

/**
 * Shared sign-in flow for all three roles. The role comes from the endpoint, never from the request
 * body, so a student endpoint cannot sign in an admin or instructor.
 */
async function signIn(request: Request, role: UserRole) {
  try {
    assertSameOrigin(request);

    const body = await readJsonObject(request);
    const identifier = readString(body, "identifier", 254);
    const password = typeof body.password === "string" && body.password.length > 0 ? body.password : null;
    if (!identifier || !password || password.length > MAX_PASSWORD_LENGTH) {
      throw new AuthError(400, "Enter your ID and password.");
    }

    const limit = consumeRateLimit(
      `login:${role}:${clientIp(request)}:${identifier.toLowerCase()}`,
      LOGIN_LIMIT,
      LOGIN_WINDOW_MS,
    );
    if (!limit.allowed) {
      return jsonError(429, "Too many sign-in attempts. Try again later.", {
        "Retry-After": String(limit.retryAfterSeconds),
      });
    }

    const user = await findLoginUser(identifier);

    // Verify even when the account is missing, so response time does not reveal which IDs exist.
    const passwordMatches = await verifyPassword(user?.passwordHash ?? (await getDummyHash()), password);

    if (!user || user.role !== role || !passwordMatches || !isAccountEligible(user)) {
      throw new AuthError(401, INVALID_CREDENTIALS);
    }

    // Always issue a new token at sign-in and retire any token the browser already sent.
    const previousToken = readSessionToken(request);
    const { token } = await createSession(user.userId);
    if (previousToken) {
      await deleteSessionByToken(previousToken).catch(() => undefined);
    }

    const response = NextResponse.json({ ok: true, role: user.role });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    return handleAuthRouteError(error);
  }
}

export function loginStudent(request: Request) {
  return signIn(request, UserRole.STUDENT);
}

export function loginInstructor(request: Request) {
  return signIn(request, UserRole.INSTRUCTOR);
}

export function loginAdmin(request: Request) {
  return signIn(request, UserRole.ADMIN);
}

/**
 * Deletes the server-side session and clears the cookie. The cookie is cleared even when the
 * database delete fails, so the browser stops sending the token. The session itself still expires on its own.
 */
export async function logoutResponse(request: Request) {
  try {
    assertSameOrigin(request);
    const token = readSessionToken(request);
    if (token) {
      await deleteSessionByToken(token);
    }
    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    const response = handleAuthRouteError(error);
    if (!(error instanceof AuthError)) {
      clearSessionCookie(response);
    }
    return response;
  }
}
