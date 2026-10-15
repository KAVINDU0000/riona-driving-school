import { AuthError } from "@/lib/auth/http";

/**
 * Mobile numbers are exactly 10 digits and begin with 0, the same format used when an instructor account is created.
 * Spaces are removed first, so "071 234 5678" is accepted. Nothing else is stripped or repaired.
 */
const MOBILE_PATTERN = /^0\d{9}$/;

export function parseMobileNumber(value: unknown): string {
  if (typeof value !== "string") {
    throw new AuthError(400, "Enter a 10-digit mobile number that starts with 0.");
  }
  const digits = value.replace(/\s/g, "");
  if (!MOBILE_PATTERN.test(digits)) {
    throw new AuthError(400, "Enter a 10-digit mobile number that starts with 0, for example 0712345678.");
  }
  return digits;
}
