import { prisma } from "@/lib/prisma";
import { AuthError } from "@/lib/auth/http";

/** Students may edit only their address and mobile number. Identity fields, status and every administrative field stay with the school. */
export type ProfileUpdate = { address: string; phoneNumber: string };

const MOBILE_PATTERN = /^0\d{9}$/;

/** Validates and normalises the editable fields. Returns the cleaned values, or throws a 400 with the first problem. */
export function parseProfileUpdate(input: Record<string, unknown>): ProfileUpdate {
  const address = typeof input.address === "string" ? input.address.trim().replace(/\s+/g, " ") : "";
  if (address.length < 5 || address.length > 300) {
    throw new AuthError(400, "Enter your residential address (5 to 300 characters).");
  }

  const phoneNumber = typeof input.phoneNumber === "string" ? input.phoneNumber.replace(/\s/g, "") : "";
  if (!MOBILE_PATTERN.test(phoneNumber)) {
    throw new AuthError(400, "Enter a valid 10-digit mobile number, e.g. 0771234567.");
  }

  return { address, phoneNumber };
}

/** Updates the signed-in student's own profile. The student is identified by the session, never by the request. */
export async function updateStudentProfile(userId: string, update: ProfileUpdate) {
  const result = await prisma.studentProfile.updateMany({
    where: { userId },
    data: { address: update.address, phoneNumber: update.phoneNumber },
  });
  if (result.count !== 1) {
    throw new AuthError(404, "Your student profile could not be found.");
  }
}
