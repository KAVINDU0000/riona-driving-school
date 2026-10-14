import { normalizeEmail } from "@/lib/auth/http";
import { validateNewPassword } from "@/lib/auth/password";
import { schoolNow } from "@/lib/student/time";

export type RegistrationInput = {
  fullName: string;
  birthday: string; // YYYY-MM-DD
  nicNumber: string; // normalised: upper-case, no spaces
  phoneNumber: string; // normalised: digits only, starts with 0
  email: string; // normalised: lower-case, trimmed
  password: string;
  address: string;
  packageId: string;
  additionalNote: string | null;
};

export type RegistrationField = keyof RegistrationInput;
export type FieldErrors = Partial<Record<RegistrationField, string>>;

export type ParseResult = { ok: true; input: RegistrationInput } | { ok: false; errors: FieldErrors };

const NIC_PATTERN = /^(\d{9}[VX]|\d{12})$/;
const PHONE_PATTERN = /^0\d{9}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function readText(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

/** Returns the date only when it is a real calendar date written as YYYY-MM-DD. */
function isRealDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * Validates and normalises a public registration. Every rule here mirrors the form, and the server
 * applies them again because the client can be bypassed. Package prices are never read from the body.
 */
export function parseRegistrationInput(body: Record<string, unknown>): ParseResult {
  const errors: FieldErrors = {};

  const fullName = readText(body, "fullName");
  if (fullName.length < 2 || fullName.length > 120) errors.fullName = "Enter your full name as on NIC (2 to 120 characters).";

  const birthday = readText(body, "birthday");
  if (!isRealDate(birthday)) {
    errors.birthday = "Enter a valid date of birth.";
  } else if (birthday < "1900-01-01" || birthday > schoolNow().date) {
    errors.birthday = "Enter a date of birth that is in the past.";
  }

  const nicNumber = readText(body, "nicNumber").replace(/\s/g, "").toUpperCase();
  if (!NIC_PATTERN.test(nicNumber)) errors.nicNumber = "Enter a valid NIC number.";

  const phoneNumber = readText(body, "phoneNumber").replace(/\s/g, "");
  if (!PHONE_PATTERN.test(phoneNumber)) errors.phoneNumber = "Enter a valid 10-digit mobile number, e.g. 0771234567.";

  const email = normalizeEmail(readText(body, "email"));
  if (!email) errors.email = "Enter a valid email address.";

  const password = typeof body.password === "string" ? body.password : "";
  const passwordError = validateNewPassword(password);
  if (passwordError) errors.password = passwordError;

  const address = readText(body, "address");
  if (address.length < 5 || address.length > 300) errors.address = "Enter your residential address (5 to 300 characters).";

  const packageId = readText(body, "packageId");
  if (!packageId || packageId.length > 100) errors.packageId = "Select a training package.";

  const note = readText(body, "additionalNote");
  if (note.length > 1000) errors.additionalNote = "Keep additional notes under 1,000 characters.";

  if (Object.keys(errors).length > 0 || !email) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    input: {
      fullName,
      birthday,
      nicNumber,
      phoneNumber,
      email,
      password,
      address,
      packageId,
      additionalNote: note || null,
    },
  };
}
