import { PackageType, PaymentMethod, PaymentStatus, RegistrationStatus } from "@/generated/prisma/enums";
import { AuthError, normalizeEmail } from "@/lib/auth/http";
import { getDummyHash, PASSWORD_MAX_LENGTH, verifyPassword } from "@/lib/auth/password";
import { allowsInstalments, lastPaymentDay, schoolDateOf } from "@/lib/registration/instalments";
import { prisma } from "@/lib/prisma";
import { MAX_SLIP_BYTES, detectSlipType, removeSlipFile, safeDisplayName, storeSlipFile } from "@/lib/student/payment-slips";

/**
 * Payment-slip submission for an applicant. The applicant proves they own the application with its reference number,
 * the email used at signup and the password chosen then. A submission creates one PENDING payment with its slip.
 * Nothing here approves a payment or creates an account.
 *
 * Amounts:
 * - Other packages: one payment for the full price.
 * - Regular packages: the first payment can be any amount above zero and below the full price, or the full price.
 *   After a first payment is approved, the next payment must be the balance, and must arrive by the last payment day.
 */

/** The same message for an unknown reference, a wrong email and a wrong password, so the response reveals nothing. */
export const CREDENTIALS_MESSAGE = "The reference number, email or password is not correct.";
const CLOSED_MESSAGE = "This application is no longer open for payment slips. Contact the school.";

const REFERENCE_PATTERN = /^RDS-[0-9A-F]{10}$/;
const TRANSACTION_REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 /_-]{0,59}$/;
const AMOUNT_PATTERN = /^\d{1,8}(\.\d{1,2})?$/;
const PAYMENT_METHODS: Record<string, PaymentMethod> = {
  BANK_TRANSFER: PaymentMethod.BANK_TRANSFER,
  BANK_DEPOSIT: PaymentMethod.BANK_DEPOSIT,
};

export type PaymentFields = {
  referenceNumber: string;
  email: string;
  password: string;
  paymentMethod: PaymentMethod;
  paymentDate: Date;
  transactionReference: string | null;
  bankName: string;
  accountHolderName: string;
  accountNumberLast4: string;
  branch: string;
  /** The amount the applicant says this slip pays, as entered. Checked against the rules when the slip is submitted. */
  amount: string;
};

/** Field messages keyed by the form's field names, so the browser can place each one next to its input. */
export type FieldErrors = Partial<
  Record<
    "referenceNumber" | "email" | "password" | "paymentMethod" | "paymentDate" | "reference" | "bankName" | "accountName" | "accountNumber" | "branch" | "slip" | "amount",
    string
  >
>;

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** Today's date in school time (Asia/Colombo), as YYYY-MM-DD. Comparing these strings compares dates. */
function schoolToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(new Date());
}

/** Reads and checks every field of the submitted form. It does not look up any application. */
export function parsePaymentSubmission(form: FormData): { ok: true; fields: PaymentFields; file: File } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};

  const referenceNumber = text(form, "referenceNumber").toUpperCase();
  if (!REFERENCE_PATTERN.test(referenceNumber)) errors.referenceNumber = "Enter the reference number from your application, for example RDS-XXXXXXXXXX.";

  const email = normalizeEmail(text(form, "email"));
  if (!email) errors.email = "Enter the email address you used at signup.";

  const rawPassword = form.get("password");
  const password = typeof rawPassword === "string" ? rawPassword : "";
  if (password.length === 0) errors.password = "Enter the password you chose at signup.";
  else if (password.length > PASSWORD_MAX_LENGTH) errors.password = "The password is too long.";

  const paymentMethod = PAYMENT_METHODS[text(form, "paymentMethod")];
  if (!paymentMethod) errors.paymentMethod = "Choose a payment method.";

  const paymentDateText = text(form, "paymentDate");
  const paymentDateValid =
    /^\d{4}-\d{2}-\d{2}$/.test(paymentDateText) &&
    new Date(`${paymentDateText}T00:00:00.000Z`).toISOString().slice(0, 10) === paymentDateText;
  if (!paymentDateValid) errors.paymentDate = "Select the date you made the payment.";
  else if (paymentDateText > schoolToday()) errors.paymentDate = "The payment date cannot be in the future.";

  const transactionText = text(form, "reference");
  if (transactionText && !TRANSACTION_REFERENCE_PATTERN.test(transactionText)) {
    errors.reference = "Use up to 60 letters, numbers, spaces, dashes, slashes or underscores.";
  }

  const bankName = text(form, "bankName");
  if (bankName.length < 2 || bankName.length > 100) errors.bankName = "Enter the name of your bank.";

  const accountHolderName = text(form, "accountName");
  if (accountHolderName.length < 2 || accountHolderName.length > 100) errors.accountName = "Enter the account holder's name.";

  const accountDigits = text(form, "accountNumber").replace(/\s/g, "");
  if (!/^\d{6,20}$/.test(accountDigits)) errors.accountNumber = "Enter a valid account number (digits only).";

  const branch = text(form, "branch");
  if (branch.length < 2 || branch.length > 100) errors.branch = "Enter your bank branch.";

  const amountText = text(form, "amount");
  if (!AMOUNT_PATTERN.test(amountText) || Number(amountText) <= 0) errors.amount = "Enter the amount in rupees, for example 13000.";

  const file = form.get("slip");
  if (!(file instanceof File) || file.size === 0) errors.slip = "Upload a photo or PDF of your payment slip.";
  else if (file.size > MAX_SLIP_BYTES) errors.slip = "The file is larger than 5 MB. Upload a smaller file.";

  if (Object.keys(errors).length > 0 || !email || !paymentMethod || !(file instanceof File)) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    file,
    fields: {
      referenceNumber,
      email,
      password,
      paymentMethod,
      paymentDate: new Date(`${paymentDateText}T00:00:00.000Z`),
      transactionReference: transactionText || null,
      bankName,
      accountHolderName,
      // Only the last four digits are kept, the same rule the rest of the payments table follows.
      accountNumberLast4: accountDigits.slice(-4),
      branch,
      amount: Number(amountText).toFixed(2),
    },
  };
}

/** The amount this slip may pay, or a refusal explaining why. Money is compared in whole cents. */
export function resolvePaymentAmount(input: {
  packageType: PackageType;
  total: number;
  approvedTotal: number;
  requestedAmount: string;
  applicationStatus: RegistrationStatus;
}): string {
  const cents = (value: number) => Math.round(value * 100);
  const totalCents = cents(input.total);
  const approvedCents = cents(input.approvedTotal);
  const requestedCents = cents(Number(input.requestedAmount));

  if (approvedCents >= totalCents) {
    throw new AuthError(409, "This application is already fully paid. No new slip is needed.");
  }

  if (!allowsInstalments(input.packageType)) {
    if (approvedCents > 0) throw new AuthError(409, "The payment for this application is already approved. No new slip is needed.");
    // The full price is always used, whatever the applicant typed.
    return (totalCents / 100).toFixed(2);
  }

  if (input.applicationStatus === RegistrationStatus.APPROVED && approvedCents === 0) {
    throw new AuthError(409, CLOSED_MESSAGE);
  }

  if (approvedCents === 0) {
    // First payment: any amount above zero, up to the full price.
    if (requestedCents <= 0 || requestedCents > totalCents) {
      throw new AuthError(422, `The first payment must be more than zero and no more than LKR ${(totalCents / 100).toLocaleString("en-LK")}.`);
    }
    return (requestedCents / 100).toFixed(2);
  }

  // Balance: exactly the amount still owed.
  const remainingCents = totalCents - approvedCents;
  if (requestedCents !== remainingCents) {
    throw new AuthError(422, `The balance to pay is LKR ${(remainingCents / 100).toLocaleString("en-LK")}.`);
  }
  return (remainingCents / 100).toFixed(2);
}

/**
 * Attaches a slip to the application's payment. Order of checks: file content, credentials, application state, amount
 * rules, then the write. The write locks the application row, so two submissions at once cannot both create a payment.
 */
export async function submitApplicationPayment(fields: PaymentFields, file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const type = detectSlipType(bytes);
  if (!type) {
    throw new AuthError(415, "Upload a JPEG, PNG or PDF file.");
  }

  const registration = await prisma.registrationRequest.findUnique({
    where: { referenceNumber: fields.referenceNumber },
    select: {
      id: true,
      status: true,
      email: true,
      passwordHash: true,
      packagePriceAtSubmission: true,
      selectedPackage: { select: { packageType: true, durationDays: true } },
    },
  });

  // Always run one password check, so an unknown reference and a wrong password take about the same time.
  const passwordMatches = await verifyPassword(registration?.passwordHash ?? (await getDummyHash()), fields.password);
  if (!registration || registration.email !== fields.email || !passwordMatches) {
    throw new AuthError(401, CREDENTIALS_MESSAGE);
  }

  const packageType = registration.selectedPackage.packageType;
  const isOpen =
    registration.status === RegistrationStatus.PENDING ||
    (registration.status === RegistrationStatus.APPROVED && allowsInstalments(packageType));
  if (!isOpen) {
    throw new AuthError(409, CLOSED_MESSAGE);
  }

  const approved = await prisma.payment.findMany({
    where: { registrationRequestId: registration.id, status: PaymentStatus.APPROVED },
    select: { amount: true },
  });
  const approvedTotal = approved.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const total = Number(registration.packagePriceAtSubmission);
  const amount = resolvePaymentAmount({
    packageType,
    total,
    approvedTotal,
    requestedAmount: fields.amount,
    applicationStatus: registration.status,
  });

  // A balance must arrive by the last payment day, which is counted from the enrollment's start.
  if (approvedTotal > 0) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { registrationRequestId: registration.id },
      select: { enrollmentDate: true },
    });
    if (enrollment) {
      const lastDay = lastPaymentDay(enrollment.enrollmentDate, registration.selectedPackage.durationDays);
      if (!lastDay) throw new AuthError(409, CLOSED_MESSAGE);
      if (schoolDateOf(new Date()) > lastDay) {
        throw new AuthError(409, `The balance was due by ${lastDay}. The deadline has passed, so contact the school.`);
      }
    }
  }

  const storageKey = await storeSlipFile(bytes, type);
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "RegistrationRequest" WHERE id = ${registration.id} FOR UPDATE`;

      const current = await tx.registrationRequest.findUnique({ where: { id: registration.id }, select: { status: true } });
      if (!current || (current.status !== RegistrationStatus.PENDING && current.status !== RegistrationStatus.APPROVED)) {
        throw new AuthError(409, CLOSED_MESSAGE);
      }

      const waiting = await tx.payment.findFirst({
        where: { registrationRequestId: registration.id, status: PaymentStatus.PENDING },
        select: { id: true },
      });
      if (waiting) {
        // A retry after a lost response lands here. It must not create a second payment or a second file.
        throw new AuthError(409, "A payment slip for this application is already waiting for review. You do not need to send it again.");
      }

      const payment = await tx.payment.create({
        data: {
          registrationRequestId: registration.id,
          // The amount follows the rules above, never a value taken from the browser without a check.
          amount,
          paymentMethod: fields.paymentMethod,
          paymentDate: fields.paymentDate,
          status: PaymentStatus.PENDING,
          transactionReference: fields.transactionReference,
          bankName: fields.bankName,
          accountHolderName: fields.accountHolderName,
          accountNumberLast4: fields.accountNumberLast4,
          branch: fields.branch,
        },
        select: { id: true },
      });

      await tx.paymentSlip.create({
        data: {
          paymentId: payment.id,
          storageKey,
          originalFileName: safeDisplayName(file.name),
          mimeType: type.mime,
          fileSizeBytes: bytes.length,
        },
      });

      return payment;
    });
  } catch (error) {
    // The file is written before the database check. If the check refuses, the file must not stay behind.
    await removeSlipFile(storageKey);
    throw error;
  }
}
