import { PaymentStatus, RegistrationStatus } from "@/generated/prisma/enums";
import { AuthError } from "@/lib/auth/http";
import { getDummyHash, PASSWORD_MAX_LENGTH, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { allowsInstalments, balanceOwed, lastPaymentDay, schoolDateOf } from "@/lib/registration/instalments";
import { CREDENTIALS_MESSAGE } from "@/lib/registration/payment-submission";

/**
 * What an applicant sees on the status page. The applicant proves they own the application with its reference
 * number and the password chosen at signup. Nothing here returns the password hash, a full account number or
 * another applicant's data.
 */

const REFERENCE_PATTERN = /^RDS-[0-9A-F]{10}$/;

export function parseStatusInput(body: Record<string, unknown>): { referenceNumber: string; password: string } {
  const referenceNumber = typeof body.referenceNumber === "string" ? body.referenceNumber.trim().toUpperCase() : "";
  if (!REFERENCE_PATTERN.test(referenceNumber)) {
    throw new AuthError(422, "Enter the reference number from your application, for example RDS-XXXXXXXXXX.");
  }
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length === 0 || password.length > PASSWORD_MAX_LENGTH) {
    throw new AuthError(422, "Enter the password you chose at signup.");
  }
  return { referenceNumber, password };
}

export async function readApplicationStatus(referenceNumber: string, password: string) {
  const registration = await prisma.registrationRequest.findUnique({
    where: { referenceNumber },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      email: true,
      passwordHash: true,
      rejectionReason: true,
      approvedStudentUserId: true,
      packagePriceAtSubmission: true,
      selectedPackage: { select: { name: true, packageType: true, durationDays: true } },
      payments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          amount: true,
          paymentMethod: true,
          paymentDate: true,
          createdAt: true,
          bankName: true,
          accountHolderName: true,
          accountNumberLast4: true,
          branch: true,
          reviewHistory: {
            orderBy: { reviewedAt: "desc" },
            take: 1,
            select: { decision: true, reason: true, reviewedAt: true },
          },
        },
      },
    },
  });

  // One password check in every case, so an unknown reference takes about as long as a wrong password.
  const passwordMatches = await verifyPassword(registration?.passwordHash ?? (await getDummyHash()), password);
  if (!registration || !passwordMatches) {
    throw new AuthError(401, CREDENTIALS_MESSAGE);
  }

  const payments = registration.payments.map((payment) => {
    const latest = payment.reviewHistory[0];
    return {
      id: payment.id,
      status: payment.status,
      amount: payment.amount.toString(),
      paymentMethod: payment.paymentMethod,
      paymentDate: payment.paymentDate.toISOString().slice(0, 10),
      submittedAt: payment.createdAt.toISOString(),
      bankName: payment.bankName,
      accountHolderName: payment.accountHolderName,
      accountNumberLast4: payment.accountNumberLast4,
      branch: payment.branch,
      // Only a rejection carries a reason for the applicant. An approval note stays with the school.
      rejectionReason: payment.status === PaymentStatus.REJECTED && latest?.decision === "REJECTED" ? latest.reason : null,
    };
  });

  // Instalments: the approved payments so far, what is still owed, and the last day the balance can be paid.
  const fee = Number(registration.packagePriceAtSubmission);
  const approvedPaid = registration.payments
    .filter((payment) => payment.status === PaymentStatus.APPROVED)
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
  const balance = balanceOwed(fee, approvedPaid);
  const instalmentsAllowed = allowsInstalments(registration.selectedPackage.packageType);
  const hasPending = payments.some((payment) => payment.status === PaymentStatus.PENDING);
  const enrollment = await prisma.enrollment.findUnique({
    where: { registrationRequestId: registration.id },
    select: { enrollmentDate: true },
  });
  const balanceDueBy = enrollment ? lastPaymentDay(enrollment.enrollmentDate, registration.selectedPackage.durationDays) : null;
  const deadlinePassed = balanceDueBy !== null && schoolDateOf(new Date()) > balanceDueBy;
  const balanceOpen =
    instalmentsAllowed &&
    approvedPaid > 0 &&
    balance > 0 &&
    !hasPending &&
    (registration.status === RegistrationStatus.APPROVED || registration.status === RegistrationStatus.PENDING);

  const latestPayment = payments[0] ?? null;
  return {
    referenceNumber,
    status: registration.status,
    submittedAt: registration.submittedAt.toISOString(),
    email: registration.email,
    package: { name: registration.selectedPackage.name, price: registration.packagePriceAtSubmission.toString() },
    rejectionReason: registration.status === RegistrationStatus.REJECTED ? registration.rejectionReason : null,
    // Shown only after the school approves the application, so the applicant can match it to the WhatsApp message.
    studentUserId: registration.approvedStudentUserId,
    payments,
    instalments: {
      allowed: instalmentsAllowed,
      fee,
      approvedPaid,
      balance,
      balanceDueBy,
      deadlinePassed,
      // The applicant can send the balance now: a Regular package, some money paid, a balance left, nothing waiting.
      canPayBalance: balanceOpen && !deadlinePassed,
    },
    // A new slip is allowed while the application is pending and no payment is waiting or approved, or when it is a
    // Regular package whose balance is open (see canPayBalance).
    canResubmit:
      registration.status === RegistrationStatus.PENDING && payments.every((payment) => payment.status === PaymentStatus.REJECTED),
    // The bank details from the latest payment, so a resubmission starts from them. The full account number is never stored.
    previousBank: latestPayment
      ? {
          paymentMethod: latestPayment.paymentMethod,
          bankName: latestPayment.bankName ?? "",
          accountHolderName: latestPayment.accountHolderName ?? "",
          branch: latestPayment.branch ?? "",
        }
      : null,
  };
}
