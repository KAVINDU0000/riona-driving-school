import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PaymentStatus, RegistrationStatus, UserRole } from "@/generated/prisma/enums";
import { POST as reviewRoute } from "@/app/api/admin/payments/[paymentId]/review/route";
import { POST as statusRoute } from "@/app/api/registration/status/route";
import { POST as paymentRoute } from "@/app/api/registration/payment/route";
import { hashPassword } from "@/lib/auth/password";
import { resetRateLimits } from "@/lib/auth/rate-limit";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { CREDENTIALS_MESSAGE } from "@/lib/registration/payment-submission";
import { createAccount, ORIGIN, resetDatabase } from "./helpers";

const PACKAGE_ID = "regular-car-van";
const REFERENCE = "RDS-5E6F7A8B9C";
const EMAIL = "status-applicant@example.com";
const PASSWORD = "applicant-pass-123";
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 3)]);
const REASON = "The slip is blurred and the amount is not readable.";

let storageDir: string;
let previousStorageDir: string | undefined;

beforeAll(async () => {
  storageDir = await fs.mkdtemp(path.join(os.tmpdir(), "riona-status-"));
  previousStorageDir = process.env.PAYMENT_SLIP_STORAGE_DIR;
  process.env.PAYMENT_SLIP_STORAGE_DIR = storageDir;
});

afterAll(async () => {
  if (previousStorageDir === undefined) delete process.env.PAYMENT_SLIP_STORAGE_DIR;
  else process.env.PAYMENT_SLIP_STORAGE_DIR = previousStorageDir;
  await fs.rm(storageDir, { recursive: true, force: true });
});

async function seedApplication() {
  await resetDatabase();
  await createAccount({ userId: "ADMIN-1", email: "admin@riona.test", role: UserRole.ADMIN });
  await createAccount({ userId: "STU-A", email: "student@riona.test", role: UserRole.STUDENT });
  await prisma.trainingPackage.create({
    data: { id: PACKAGE_ID, name: "Car and Van Training", packageType: "REGULAR", price: 26000, durationDays: 15 },
  });
  return prisma.registrationRequest.create({
    data: {
      referenceNumber: REFERENCE,
      fullName: "Kamal Silva",
      birthday: new Date("2000-05-10"),
      nicNumber: "200098765432",
      phoneNumber: "0779998877",
      address: "No. 4, Lake Road, Kandy",
      email: EMAIL,
      passwordHash: await hashPassword(PASSWORD),
      selectedPackageId: PACKAGE_ID,
      packagePriceAtSubmission: 26000,
    },
  });
}

function paymentForm(overrides: Record<string, string> = {}) {
  const form = new FormData();
  const values: Record<string, string> = {
    referenceNumber: REFERENCE,
    email: EMAIL,
    password: PASSWORD,
    paymentMethod: "BANK_TRANSFER",
    paymentDate: "2026-10-10",
    reference: "",
    bankName: "Bank of Ceylon",
    accountName: "Kamal Silva",
    accountNumber: "9876543210987654",
    branch: "Kandy",
    ...overrides,
  };
  for (const [key, value] of Object.entries(values)) form.append(key, value);
  form.append("slip", new File([PNG], "slip.png", { type: "image/png" }));
  return form;
}

function submitSlip(form: FormData) {
  return paymentRoute(new Request(`${ORIGIN}/api/registration/payment`, { method: "POST", headers: { origin: ORIGIN }, body: form }));
}

function jsonRequest(url: string, body: unknown, cookie?: string) {
  const headers: Record<string, string> = { "content-type": "application/json", origin: ORIGIN };
  if (cookie) headers.cookie = cookie;
  return new Request(`${ORIGIN}${url}`, { method: "POST", headers, body: JSON.stringify(body) });
}

async function adminCookie() {
  const { token } = await createSession("ADMIN-1");
  return `riona_session=${token}`;
}

async function reviewPaymentAs(paymentId: string, body: unknown, cookie?: string) {
  return reviewRoute(jsonRequest(`/api/admin/payments/${paymentId}/review`, body, cookie), {
    params: Promise.resolve({ paymentId }),
  });
}

async function checkStatus(body: unknown) {
  return statusRoute(jsonRequest("/api/registration/status", body));
}

async function latestPaymentId() {
  const payment = await prisma.payment.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true } });
  if (!payment) throw new Error("expected a payment");
  return payment.id;
}

beforeEach(async () => {
  resetRateLimits();
  for (const file of await fs.readdir(storageDir)) await fs.unlink(path.join(storageDir, file));
});

describe("admin decision on a payment slip", () => {
  it("lets only an admin decide, and refuses a rejection without a clear reason", async () => {
    await seedApplication();
    expect((await submitSlip(paymentForm())).status).toBe(201);
    const paymentId = await latestPaymentId();

    const asStudent = await reviewPaymentAs(paymentId, { decision: "APPROVED" }, `riona_session=${(await createSession("STU-A")).token}`);
    expect(asStudent.status).toBe(403);
    const anonymous = await reviewPaymentAs(paymentId, { decision: "APPROVED" });
    expect(anonymous.status).toBe(401);

    const shortReason = await reviewPaymentAs(paymentId, { decision: "REJECTED", reason: "no" }, await adminCookie());
    expect(shortReason.status).toBe(400);
    expect((await prisma.payment.findUnique({ where: { id: paymentId } }))?.status).toBe(PaymentStatus.PENDING);
  });

  it("rejects a slip with a reason, keeps the record, and refuses a second decision", async () => {
    await seedApplication();
    expect((await submitSlip(paymentForm())).status).toBe(201);
    const paymentId = await latestPaymentId();

    const rejected = await reviewPaymentAs(paymentId, { decision: "REJECTED", reason: REASON }, await adminCookie());
    expect(rejected.status).toBe(200);
    const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { reviewHistory: true } });
    expect(payment?.status).toBe(PaymentStatus.REJECTED);
    expect(payment?.reviewedByUserId).toBe("ADMIN-1");
    expect(payment?.reviewHistory).toHaveLength(1);
    expect(payment?.reviewHistory[0].reason).toBe(REASON);

    const again = await reviewPaymentAs(paymentId, { decision: "APPROVED" }, await adminCookie());
    expect(again.status).toBe(409);
  });
});

describe("applicant status check", () => {
  it("refuses a wrong password with the same message as any other failed check, and returns no password hash", async () => {
    await seedApplication();
    const wrong = await checkStatus({ referenceNumber: REFERENCE, password: "not-the-password" });
    const unknown = await checkStatus({ referenceNumber: "RDS-FFFFFFFFFF", password: PASSWORD });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect((await wrong.json()).error).toBe(CREDENTIALS_MESSAGE);

    const ok = await checkStatus({ referenceNumber: REFERENCE, password: PASSWORD });
    const text = await ok.text();
    expect(ok.status).toBe(200);
    expect(text).not.toContain("passwordHash");
    expect(text).not.toContain("$argon2");
  });

  it("shows a pending application with no payment yet, and lets the applicant submit one", async () => {
    await seedApplication();
    const body = (await (await checkStatus({ referenceNumber: REFERENCE, password: PASSWORD })).json()) as {
      status: { status: string; payments: unknown[]; canResubmit: boolean; studentUserId: string | null };
    };
    expect(body.status.status).toBe(RegistrationStatus.PENDING);
    expect(body.status.payments).toHaveLength(0);
    expect(body.status.canResubmit).toBe(true);
    expect(body.status.studentUserId).toBeNull();
  });

  it("shows a rejected slip with its reason, offers a resubmission prefilled with bank details, and accepts it", async () => {
    await seedApplication();
    expect((await submitSlip(paymentForm())).status).toBe(201);
    await reviewPaymentAs(await latestPaymentId(), { decision: "REJECTED", reason: REASON }, await adminCookie());

    const body = (await (await checkStatus({ referenceNumber: REFERENCE, password: PASSWORD })).json()) as {
      status: {
        payments: { status: string; rejectionReason: string | null }[];
        canResubmit: boolean;
        previousBank: { bankName: string; accountHolderName: string; branch: string } | null;
      };
    };
    expect(body.status.payments[0].status).toBe(PaymentStatus.REJECTED);
    expect(body.status.payments[0].rejectionReason).toBe(REASON);
    expect(body.status.canResubmit).toBe(true);
    expect(body.status.previousBank).toMatchObject({ bankName: "Bank of Ceylon", accountHolderName: "Kamal Silva", branch: "Kandy" });

    // The full account number is never returned, so it must be typed again.
    expect(JSON.stringify(body)).not.toContain("9876543210987654");

    const resubmitted = await submitSlip(paymentForm());
    expect(resubmitted.status).toBe(201);
    const after = (await (await checkStatus({ referenceNumber: REFERENCE, password: PASSWORD })).json()) as {
      status: { payments: { status: string }[]; canResubmit: boolean };
    };
    expect(after.status.payments.map((payment) => payment.status)).toEqual([PaymentStatus.PENDING, PaymentStatus.REJECTED]);
    expect(after.status.canResubmit).toBe(false);
  });

  it("shows an approved payment, and blocks any further slip for it", async () => {
    await seedApplication();
    expect((await submitSlip(paymentForm())).status).toBe(201);
    await reviewPaymentAs(await latestPaymentId(), { decision: "APPROVED" }, await adminCookie());

    const body = (await (await checkStatus({ referenceNumber: REFERENCE, password: PASSWORD })).json()) as {
      status: { payments: { status: string; rejectionReason: string | null }[]; canResubmit: boolean };
    };
    expect(body.status.payments[0].status).toBe(PaymentStatus.APPROVED);
    expect(body.status.payments[0].rejectionReason).toBeNull();
    expect(body.status.canResubmit).toBe(false);

    const extra = await submitSlip(paymentForm());
    expect(extra.status).toBe(409);
    expect(await prisma.payment.count()).toBe(1);
  });

  it("refuses a resubmission while the first slip is still waiting for review", async () => {
    await seedApplication();
    expect((await submitSlip(paymentForm())).status).toBe(201);
    expect((await submitSlip(paymentForm())).status).toBe(409);
    expect(await prisma.payment.count()).toBe(1);
  });
});
