import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { AccountStatus, UserRole } from "@/generated/prisma/enums";

export const ORIGIN = "http://localhost:3000";

export const DEFAULT_PASSWORD = "correct-horse-battery";

/**
 * Clears accounts (with their sessions, tokens and profiles), packages and vehicles. Only ever runs
 * against the guarded test database.
 */
export async function resetDatabase() {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "User", "TrainingPackage", "Vehicle" CASCADE');
}

type AccountInput = {
  userId: string;
  email: string;
  role: UserRole;
  password?: string;
  status?: AccountStatus;
  profileStatus?: AccountStatus;
};

/** Creates an account directly in the database, because the repo has no provisioning workflow yet. */
export async function createAccount({
  userId,
  email,
  role,
  password = DEFAULT_PASSWORD,
  status = AccountStatus.ACTIVE,
  profileStatus = AccountStatus.ACTIVE,
}: AccountInput) {
  const passwordHash = await hashPassword(password);
  await prisma.user.create({ data: { userId, email, passwordHash, role, status } });

  if (role === UserRole.STUDENT) {
    await prisma.studentProfile.create({
      data: {
        userId,
        fullName: `Student ${userId}`,
        address: "Colombo",
        birthday: new Date("2000-01-01"),
        nicNumber: `NIC-${userId}`,
        phoneNumber: "0771234567",
      },
    });
  }
  if (role === UserRole.INSTRUCTOR) {
    await prisma.instructorProfile.create({
      data: {
        userId,
        fullName: `Instructor ${userId}`,
        phoneNumber: "0712345678",
        hireDate: new Date("2025-01-01"),
        status: profileStatus,
      },
    });
  }
  return userId;
}

export function postRequest(path: string, body: unknown, options: { cookie?: string; origin?: string | null } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (options.origin !== null) headers.origin = options.origin ?? ORIGIN;
  if (options.cookie) headers.cookie = options.cookie;
  return new Request(`${ORIGIN}${path}`, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

export function getRequest(path: string, cookie?: string) {
  return new Request(`${ORIGIN}${path}`, { headers: cookie ? { cookie } : {} });
}

/** Extracts "riona_session=<token>" from a response's Set-Cookie header, ready to send back as a Cookie header. */
export function sessionCookieFrom(response: Response): string | undefined {
  const header = response.headers.get("set-cookie");
  if (!header) return undefined;
  const match = /riona_session=([^;]+)/.exec(header);
  return match && match[1] ? `riona_session=${match[1]}` : undefined;
}

export function rawTokenFromCookie(cookie: string) {
  return cookie.replace("riona_session=", "");
}
