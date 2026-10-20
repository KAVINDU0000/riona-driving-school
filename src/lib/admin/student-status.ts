import { AccountStatus, UserRole } from "@/generated/prisma/enums";
import { AuthError } from "@/lib/auth/http";
import { prisma } from "@/lib/prisma";

/**
 * Turns a student's account on or off. An INACTIVE student cannot sign in, and every existing session ends on its next
 * request (see isAccountEligible). Nothing else is changed: enrollments, payments, lessons and history are kept, so a
 * student can be reactivated later. Only student accounts are affected.
 */
export async function setStudentAccountStatus(userIdRaw: string, status: AccountStatus) {
  const userId = userIdRaw.trim();
  if (!/^[A-Za-z0-9-]{1,32}$/.test(userId)) {
    throw new AuthError(400, "Invalid student ID.");
  }

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "userId" FROM "User" WHERE "userId" = ${userId} FOR UPDATE`;

    const student = await tx.user.findFirst({
      where: { userId, role: UserRole.STUDENT },
      select: { userId: true, status: true, studentProfile: { select: { userId: true } } },
    });
    if (!student || !student.studentProfile) {
      throw new AuthError(404, "That student was not found.");
    }

    if (student.status === status) {
      return { userId, status, changed: false };
    }
    await tx.user.update({ where: { userId }, data: { status } });
    return { userId, status, changed: true };
  });
}
