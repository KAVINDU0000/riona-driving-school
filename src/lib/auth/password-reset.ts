import { AccountStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { PASSWORD_RESET_TTL_MS } from "@/lib/auth/config";
import { AuthError, normalizeEmail } from "@/lib/auth/http";
import { deliverAuthEmail } from "@/lib/auth/email-delivery";
import { hashPassword } from "@/lib/auth/password";
import { revokeAllSessions } from "@/lib/auth/session";
import { generateToken, hashToken } from "@/lib/auth/tokens";

const INVALID_RESET_MESSAGE = "This reset link is invalid or has expired.";

/**
 * Creates a single-use reset token for a user and invalidates older unused tokens.
 * Returns the raw token. Only its hash is stored. Callers must pass it straight to the delivery channel.
 */
export async function issuePasswordResetToken(userId: string): Promise<string> {
  const token = generateToken();
  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    }),
  ]);
  return token;
}

/**
 * Starts a reset for an email address. It always completes silently, so the caller's response does
 * not reveal whether the account exists. If delivery is not configured, the token is revoked at once.
 */
export async function startPasswordReset(rawEmail: string): Promise<void> {
  const email = normalizeEmail(rawEmail);
  if (!email) return;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { userId: true, email: true, status: true },
  });
  // The lookup is by a non-null address, so user.email is always set here; the check keeps the type honest.
  if (!user || !user.email || user.status !== AccountStatus.ACTIVE) return;

  const token = await issuePasswordResetToken(user.userId);
  const delivered = await deliverAuthEmail("password-reset", user.email, token);
  if (!delivered) {
    await prisma.passwordResetToken.updateMany({
      where: { tokenHash: hashToken(token) },
      data: { usedAt: new Date() },
    });
  }
}

/**
 * Consumes a reset token and sets the new password. The token is claimed atomically, so two
 * concurrent submissions cannot both succeed. Successful use also revokes every session for the account.
 */
export async function completePasswordReset(rawToken: string, newPassword: string): Promise<void> {
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });
  if (!row || row.usedAt || row.expiresAt.getTime() <= Date.now()) {
    throw new AuthError(400, INVALID_RESET_MESSAGE);
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction(async (tx) => {
    const now = new Date();
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: row.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) {
      throw new AuthError(400, INVALID_RESET_MESSAGE);
    }

    const user = await tx.user.findUnique({ where: { userId: row.userId }, select: { status: true } });
    if (!user || user.status !== AccountStatus.ACTIVE) {
      throw new AuthError(400, INVALID_RESET_MESSAGE);
    }

    await tx.user.update({ where: { userId: row.userId }, data: { passwordHash } });
    await tx.passwordResetToken.updateMany({
      where: { userId: row.userId, usedAt: null },
      data: { usedAt: now },
    });
    await tx.session.deleteMany({ where: { userId: row.userId } });
  });

  // Covers any session created between the transaction and this call.
  await revokeAllSessions(row.userId);
}
