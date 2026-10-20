import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { SESSION_TTL_SECONDS } from "@/lib/auth/config";
import { generateToken, hashToken } from "@/lib/auth/tokens";

/** Creates a new session and returns the raw token. Only the hash is stored. */
export async function createSession(userId: string) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });
  return { token, expiresAt };
}

export async function deleteSessionByToken(token: string) {
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

/** Signs the user out everywhere, for example after a password reset. Pass a transaction client to run it inside that transaction. */
export async function revokeAllSessions(userId: string, db: Prisma.TransactionClient | typeof prisma = prisma) {
  await db.session.deleteMany({ where: { userId } });
}
