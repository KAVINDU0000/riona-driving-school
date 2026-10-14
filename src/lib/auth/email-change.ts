import { Prisma } from "@/generated/prisma/client";
import { AccountStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { EMAIL_CHANGE_TTL_MS } from "@/lib/auth/config";
import { AuthError, normalizeEmail } from "@/lib/auth/http";
import { deliverAuthEmail } from "@/lib/auth/email-delivery";
import { verifyPassword } from "@/lib/auth/password";
import { generateToken, hashToken } from "@/lib/auth/tokens";

const INVALID_TOKEN_MESSAGE = "This verification link is invalid or has expired.";
const EMAIL_TAKEN_MESSAGE = "That email address is already in use.";

/**
 * Creates a single-use confirmation token for a new address and invalidates older unused tokens.
 * Returns the raw token. Only its hash is stored.
 */
export async function issueEmailChangeToken(userId: string, newEmail: string): Promise<string> {
  const token = generateToken();
  await prisma.$transaction([
    prisma.emailChangeToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.emailChangeToken.create({
      data: {
        userId,
        newEmail,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + EMAIL_CHANGE_TTL_MS),
      },
    }),
  ]);
  return token;
}

/**
 * Starts an email change for a signed-in user. The current password is required so that a
 * stolen session cannot change the login email. The address changes only after confirmation.
 */
export async function requestEmailChange(userId: string, currentPassword: string, rawNewEmail: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { userId },
    select: { email: true, passwordHash: true, status: true },
  });
  if (!user || user.status !== AccountStatus.ACTIVE) {
    throw new AuthError(401, "Please sign in.");
  }

  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    throw new AuthError(401, "Your current password is incorrect.");
  }

  const newEmail = normalizeEmail(rawNewEmail);
  if (!newEmail) {
    throw new AuthError(400, "Enter a valid email address.");
  }
  if (newEmail === user.email) {
    throw new AuthError(400, "That is already your email address.");
  }

  const taken = await prisma.user.findUnique({ where: { email: newEmail }, select: { userId: true } });
  if (taken) {
    throw new AuthError(409, EMAIL_TAKEN_MESSAGE);
  }

  const token = await issueEmailChangeToken(userId, newEmail);
  const delivered = await deliverAuthEmail("email-change", newEmail, token);
  if (!delivered) {
    await prisma.emailChangeToken.updateMany({
      where: { tokenHash: hashToken(token) },
      data: { usedAt: new Date() },
    });
    throw new AuthError(503, "Email verification is not available right now. Please try again later.");
  }
}

/**
 * Applies a confirmed email change. The unique index on User.email is the final check, so two
 * concurrent confirmations for the same address cannot both succeed.
 */
export async function confirmEmailChange(rawToken: string): Promise<void> {
  const row = await prisma.emailChangeToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    select: { id: true, userId: true, newEmail: true, expiresAt: true, usedAt: true },
  });
  if (!row || row.usedAt || row.expiresAt.getTime() <= Date.now()) {
    throw new AuthError(400, INVALID_TOKEN_MESSAGE);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const now = new Date();
      const claimed = await tx.emailChangeToken.updateMany({
        where: { id: row.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) {
        throw new AuthError(400, INVALID_TOKEN_MESSAGE);
      }

      const user = await tx.user.findUnique({ where: { userId: row.userId }, select: { status: true } });
      if (!user || user.status !== AccountStatus.ACTIVE) {
        throw new AuthError(400, INVALID_TOKEN_MESSAGE);
      }

      await tx.user.update({ where: { userId: row.userId }, data: { email: row.newEmail } });
      await tx.emailChangeToken.updateMany({
        where: { userId: row.userId, usedAt: null },
        data: { usedAt: now },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AuthError(409, EMAIL_TAKEN_MESSAGE);
    }
    throw error;
  }
}
