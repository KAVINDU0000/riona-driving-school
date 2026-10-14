import { randomBytes } from "node:crypto";
import { RegistrationStatus } from "@/generated/prisma/enums";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import type { RegistrationInput } from "@/lib/registration/validation";

const MAX_REFERENCE_ATTEMPTS = 5;

/** Thrown when the selected package does not exist or is no longer offered. */
export class PackageUnavailableError extends Error {
  constructor() {
    super("The selected training package is not available.");
    this.name = "PackageUnavailableError";
  }
}

/**
 * Thrown for DAILY packages. Their price is a rate per session, and no total fee or session count
 * has been set, so online registration cannot record a fee for them.
 */
export class PerSessionPackageError extends Error {
  constructor() {
    super("This package is charged per session and cannot be registered online yet.");
    this.name = "PerSessionPackageError";
  }
}

/** 40 random bits as an upper-case hex code, for example RDS-3F9A0C1B7E. The unique index is the final check. */
export function generateReferenceNumber() {
  return `RDS-${randomBytes(5).toString("hex").toUpperCase()}`;
}

function isReferenceCollision(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const { code, meta } = error as { code?: unknown; meta?: { target?: unknown } };
  return code === "P2002" && String(meta?.target ?? "").includes("referenceNumber");
}

/**
 * Stores a PENDING registration request. It creates no User, StudentProfile or Enrollment: the school
 * reviews the request and creates those records when it approves it.
 *
 * The package is read inside the same transaction as the insert, and the price stored is the database
 * price at that moment. The request is never trusted for the price.
 */
export async function submitRegistration(input: RegistrationInput): Promise<{ referenceNumber: string }> {
  // Hashing is slow and needs no database, so it runs before the transaction opens.
  const passwordHash = await hashPassword(input.password);

  for (let attempt = 1; ; attempt += 1) {
    const referenceNumber = generateReferenceNumber();
    try {
      await prisma.$transaction(async (tx) => {
        const selectedPackage = await tx.trainingPackage.findFirst({
          where: { id: input.packageId, isActive: true },
          select: { id: true, price: true, packageType: true },
        });
        if (!selectedPackage) throw new PackageUnavailableError();
        // Checked before any insert, so a refused daily package creates no records.
        if (selectedPackage.packageType === "DAILY") throw new PerSessionPackageError();

        await tx.registrationRequest.create({
          data: {
            referenceNumber,
            status: RegistrationStatus.PENDING,
            fullName: input.fullName,
            birthday: new Date(`${input.birthday}T00:00:00Z`),
            nicNumber: input.nicNumber,
            phoneNumber: input.phoneNumber,
            address: input.address,
            email: input.email,
            passwordHash,
            additionalNote: input.additionalNote,
            selectedPackageId: selectedPackage.id,
            packagePriceAtSubmission: selectedPackage.price,
          },
        });
      });
      return { referenceNumber };
    } catch (error) {
      if (isReferenceCollision(error) && attempt < MAX_REFERENCE_ATTEMPTS) continue;
      throw error;
    }
  }
}
