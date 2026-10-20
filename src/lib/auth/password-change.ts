import { prisma } from "@/lib/prisma";
import { AuthError } from "@/lib/auth/http";
import { hashPassword, validateNewPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, revokeAllSessions } from "@/lib/auth/session";

/**
 * Signed-in password change. The current password is required, so a stolen session cannot change it.
 * Every session is revoked, then a fresh session is issued to the browser making the change. Other devices
 * must sign in again, in line with the password-reset policy.
 */
export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { userId }, select: { passwordHash: true, status: true } });
  if (!user) throw new AuthError(401, "Please sign in.");

  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    throw new AuthError(401, "Your current password is incorrect.");
  }

  const problem = validateNewPassword(newPassword);
  if (problem) throw new AuthError(400, problem);

  if (await verifyPassword(user.passwordHash, newPassword)) {
    throw new AuthError(400, "Choose a password you have not used before.");
  }

  const passwordHash = await hashPassword(newPassword);
  // The password update and the session revocation commit together. If either fails, nothing changes: the old
  // password and the old sessions both stay in force. The fresh session is created only after that commit.
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { userId }, data: { passwordHash } });
    await revokeAllSessions(userId, tx);
  });
  const { token } = await createSession(userId);
  return { token };
}
