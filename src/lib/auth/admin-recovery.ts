import type { AccountStatus } from "@/generated/prisma/enums";
import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { normalizeAdminId } from "@/lib/auth/bootstrap-admin";
import { AuthError } from "@/lib/auth/http";
import { hashPassword, validateNewPassword } from "@/lib/auth/password";

/**
 * Local recovery for an admin who cannot sign in, for example the only admin, who has no email address
 * and so cannot use the emailed password reset. It sets a new password, signs the admin out everywhere,
 * and voids any unused reset links. The account's ID, email, role and status are never changed.
 *
 * Only the interactive command in scripts/reset-admin-password.ts should call this. It is never exposed
 * over HTTP and never run automatically.
 */
export async function resetAdminPassword(rawUserId: string, newPassword: string): Promise<{ userId: string; status: AccountStatus }> {
  const userId = normalizeAdminId(rawUserId);

  const problem = validateNewPassword(newPassword);
  if (problem) throw new AuthError(400, problem);

  const user = await prisma.user.findUnique({ where: { userId }, select: { role: true, status: true } });
  if (!user || user.role !== UserRole.ADMIN) {
    throw new AuthError(404, "No admin account has that ID.");
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { userId }, data: { passwordHash } }),
    prisma.session.deleteMany({ where: { userId } }),
    prisma.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } }),
  ]);

  return { userId, status: user.status };
}
