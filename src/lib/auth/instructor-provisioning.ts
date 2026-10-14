import { Prisma } from "@/generated/prisma/client";
import { AccountStatus, UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { PASSWORD_RESET_TTL_MS } from "@/lib/auth/config";
import { AuthError, normalizeEmail } from "@/lib/auth/http";
import { deliverAuthEmail } from "@/lib/auth/email-delivery";
import { hashPassword } from "@/lib/auth/password";
import { generateToken, hashToken } from "@/lib/auth/tokens";

const INSTRUCTOR_ID_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,31}$/;
const SRI_LANKA_MOBILE_PATTERN = /^0\d{9}$/;

export type InstructorAccountInput = {
  instructorId: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  hireDate: string;
};

/**
 * Creates an instructor's user account and profile in one transaction, then sends an invitation with
 * a single-use setup link. The account gets a random password nobody knows, so the instructor must
 * choose their own password through the link. If the invitation cannot be sent, the transaction
 * rolls back and no account is created.
 *
 * Callers must already have checked that the requester is an admin.
 */
export async function createInstructorAccount(input: InstructorAccountInput): Promise<{ userId: string; email: string }> {
  const userId = input.instructorId.trim().toUpperCase();
  if (!INSTRUCTOR_ID_PATTERN.test(userId)) {
    throw new AuthError(400, "The instructor ID must be 3 to 32 letters, digits or hyphens.");
  }

  const email = normalizeEmail(input.email);
  if (!email) {
    throw new AuthError(400, "Enter a valid email address.");
  }

  const fullName = input.fullName.trim();
  if (fullName.length < 2 || fullName.length > 120) {
    throw new AuthError(400, "Enter the instructor's full name.");
  }

  const phoneNumber = input.phoneNumber.replace(/\s/g, "");
  if (!SRI_LANKA_MOBILE_PATTERN.test(phoneNumber)) {
    throw new AuthError(400, "Enter a valid 10-digit mobile number, e.g. 0712345678.");
  }

  const hireDate = parseHireDate(input.hireDate);

  // A random password nobody knows. The setup link replaces it.
  const passwordHash = await hashPassword(generateToken());
  const setupToken = generateToken();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: { userId, email, passwordHash, role: UserRole.INSTRUCTOR, status: AccountStatus.ACTIVE },
      });
      await tx.instructorProfile.create({
        data: { userId, fullName, phoneNumber, hireDate, status: AccountStatus.ACTIVE },
      });
      await tx.passwordResetToken.create({
        data: {
          userId,
          tokenHash: hashToken(setupToken),
          expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
        },
      });

      const delivered = await deliverAuthEmail("account-setup", email, setupToken);
      if (!delivered) {
        throw new AuthError(503, "The invitation email could not be sent, so no account was created. Try again later.");
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AuthError(409, "An account with that email or instructor ID already exists.");
    }
    throw error;
  }

  return { userId, email };
}

/** Accepts YYYY-MM-DD, rejects impossible dates, and rejects dates in the future. */
function parseHireDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    throw new AuthError(400, "Enter the hire date as YYYY-MM-DD.");
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDate = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!isRealDate) {
    throw new AuthError(400, "Enter a real hire date.");
  }
  if (date.getTime() > Date.now()) {
    throw new AuthError(400, "The hire date cannot be in the future.");
  }
  return date;
}
