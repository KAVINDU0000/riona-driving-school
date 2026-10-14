import { cookies } from "next/headers";
import { AccountStatus, UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth/config";
import { AuthError, readSessionToken } from "@/lib/auth/http";
import { hashToken } from "@/lib/auth/tokens";

export type AuthUser = {
  userId: string;
  email: string;
  role: UserRole;
};

/** The account fields needed to decide whether a user may act. */
export type EligibilityInput = {
  role: UserRole;
  status: AccountStatus;
  studentProfile: { userId: string } | null;
  instructorProfile: { status: AccountStatus } | null;
};

/**
 * An account may act only when it is ACTIVE and its role-specific profile exists and is active.
 * Checked on every request, so deactivating an account ends its sessions right away.
 */
export function isAccountEligible(user: EligibilityInput): boolean {
  if (user.status !== AccountStatus.ACTIVE) return false;
  if (user.role === UserRole.STUDENT) return user.studentProfile !== null;
  if (user.role === UserRole.INSTRUCTOR) return user.instructorProfile?.status === AccountStatus.ACTIVE;
  return true;
}

/**
 * Resolves a session token to the current user. Returns null for missing, expired, or revoked
 * sessions and for ineligible accounts. Database errors are thrown, never treated as "no user".
 */
export async function getUserFromSessionToken(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      expiresAt: true,
      user: {
        select: {
          userId: true,
          email: true,
          role: true,
          status: true,
          studentProfile: { select: { userId: true } },
          instructorProfile: { select: { status: true } },
        },
      },
    },
  });

  if (!session || session.expiresAt.getTime() <= Date.now()) return null;
  if (!isAccountEligible(session.user)) return null;

  return { userId: session.user.userId, email: session.user.email, role: session.user.role };
}

/** For server components and server actions, which read cookies from the request context. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  return getUserFromSessionToken(token && token.length <= 200 ? token : undefined);
}

/** Returns the signed-in user for route handlers, or throws 401. Pass roles to also require a role (403). */
export async function requireUser(request: Request, roles?: UserRole[]): Promise<AuthUser> {
  const user = await getUserFromSessionToken(readSessionToken(request));
  if (!user) {
    throw new AuthError(401, "Please sign in.");
  }
  if (roles) {
    requireRole(user, roles);
  }
  return user;
}

/** Throws 403 when the user's role is not in the allowed list. Use it in server actions too. */
export function requireRole(user: AuthUser, roles: UserRole[]): void {
  if (!roles.includes(user.role)) {
    throw new AuthError(403, "You do not have permission to do that.");
  }
}

/** Students may read their own records. Admins may read any student's record. Other roles may not. */
export function canAccessStudentRecord(actor: AuthUser, studentUserId: string): boolean {
  if (actor.role === UserRole.ADMIN) return true;
  return actor.role === UserRole.STUDENT && actor.userId === studentUserId;
}

/** Students may view their own lessons. Instructors may view lessons assigned to them. Admins may view all. */
export async function canViewLesson(actor: AuthUser, lessonId: string): Promise<boolean> {
  if (actor.role === UserRole.ADMIN) return true;

  const lesson = await prisma.lessonSchedule.findUnique({
    where: { id: lessonId },
    select: { studentUserId: true, instructorUserId: true },
  });
  if (!lesson) return false;

  if (actor.role === UserRole.STUDENT) return lesson.studentUserId === actor.userId;
  return lesson.instructorUserId === actor.userId;
}

/** Only the instructor assigned to a lesson may mark its attendance or write its feedback. Admins may manage any lesson. */
export async function canManageLesson(actor: AuthUser, lessonId: string): Promise<boolean> {
  if (actor.role === UserRole.ADMIN) return true;
  if (actor.role !== UserRole.INSTRUCTOR) return false;

  const lesson = await prisma.lessonSchedule.findUnique({
    where: { id: lessonId },
    select: { instructorUserId: true },
  });
  return lesson?.instructorUserId === actor.userId;
}
