import { Prisma } from "@/generated/prisma/client";
import { AccountStatus, UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { AuthError, normalizeEmail } from "@/lib/auth/http";
import { hashPassword, validateNewPassword } from "@/lib/auth/password";

const ADMIN_ID_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,31}$/;

export type BootstrapAdminInput = {
  userId: string;
  email: string;
  password: string;
};

/**
 * Creates the first administrator. It refuses when any admin already exists, so it cannot be used
 * to add admins later. The check runs under a transaction-scoped advisory lock, so two concurrent
 * runs cannot both see "no admin" and both create one.
 *
 * Only the command in scripts/create-admin.ts should call this. It is never run automatically.
 */
export async function createBootstrapAdmin(input: BootstrapAdminInput): Promise<{ userId: string; email: string }> {
  const userId = input.userId.trim().toUpperCase();
  if (!ADMIN_ID_PATTERN.test(userId)) {
    throw new AuthError(400, "The admin ID must be 3 to 32 letters, digits or hyphens.");
  }

  const email = normalizeEmail(input.email);
  if (!email) {
    throw new AuthError(400, "Enter a valid email address.");
  }

  const passwordProblem = validateNewPassword(input.password);
  if (passwordProblem) {
    throw new AuthError(400, passwordProblem);
  }

  const passwordHash = await hashPassword(input.password);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('riona_bootstrap_admin'))`;

      const adminCount = await tx.user.count({ where: { role: UserRole.ADMIN } });
      if (adminCount > 0) {
        throw new AuthError(409, "An admin account already exists. Bootstrap runs only once.");
      }

      await tx.user.create({
        data: { userId, email, passwordHash, role: UserRole.ADMIN, status: AccountStatus.ACTIVE },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AuthError(409, "An account with that ID or email already exists.");
    }
    throw error;
  }

  return { userId, email };
}
