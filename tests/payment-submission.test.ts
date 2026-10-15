import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PaymentMethod, PaymentStatus, RegistrationStatus, UserRole } from "@/generated/prisma/enums";
import { GET as adminSlipRoute } from "@/app/api/admin/payment-slips/[slipId]/route";
import { POST as paymentRoute } from "@/app/api/registration/payment/route";
import { getRegistration } from "@/lib/admin/registration-review";
import { CREDENTIALS_MESSAGE } from "@/lib/registration/payment-submission";
import { createSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { resetRateLimits } from "@/lib/auth/rate-limit";
import { prisma } from "@/lib/prisma";
import { createAccount, ORIGIN, resetDatabase } from "./helpers";

const PACKAGE_ID = "regular-car-van";
const REFERENCE = "RDS-0A1B2C3D4E";
const EMAIL = "applicant@example.com";
const PASSWORD = "applicant-pass-123";
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);

let storageDir: string;
let previousStorageDir: string | undefined;

beforeAll(async () => {
  // Slip files go to a temporary folder, so the test never writes into the project's private storage.
  storageDir = await fs.mkdtemp(path.join(os.tmpdir(), "riona-slips-"));
  previousStorageDir = process.env.PAYMENT_SLIP_STORAGE_DIR;
  process.env.PAYMENT_SLIP_STORAGE_DIR = storageDir;
});

afterAll(async () => {
  if (previousStorageDir === undefined) delete process.env.PAYMENT_SLIP_STORAGE_DIR;
  else process.env.PAYMENT_SLIP_STORAGE_DIR = previousStorageDir;
  await fs.rm(storageDir, { recursive: true, force: true });
});

async function storedFiles() {
  return (await fs.readdir(storageDir)).length;
}

async function seedApplication(overrides: Partial<{ referenceNumber: string; status: RegistrationStatus }> = {}) {
  await resetDatabase();
  await createAccount({ userId: "ADMIN-1", email: "admin@riona.test", role: UserRole.ADMIN });
  await createAccount({ userId: "STU-A", email: "student@riona.test", role: UserRole.STUDENT });
  await prisma.trainingPackage.create({
    data: { id: PACKAGE_ID, name: "Car and Van Training", packageType: "REGULAR", price: 26000, durationDays: 15 },
  });
  return prisma.registrationRequest.create({
    data: {
      referenceNumber: overrides.referenceNumber ?? REFERENCE,
      status: overrides.status ?? RegistrationStatus.PENDING,
      fullName: "Nimal Perera",
      birthday: new Date("2000-05-10"),
      nicNumber: "200012345678",
      phoneNumber: "0771112233",
      address: "No. 12, Main Street, Colombo 03",
      email: EMAIL,
      passwordHash: await hashPassword(PASSWORD),
      selectedPackageId: PACKAGE_ID,
      packagePriceAtSubmission: 26000,
    },
  });
}

/** Builds the multipart form the payment page sends. Any field can be replaced or removed. */
function paymentForm(overrides: Record<string, string | File | null> = {}) {
  const form = new FormData();
  const values: Record<string, string> = {
    referenceNumber: REFERENCE,
    email: EMAIL,
    password: PASSWORD,
    paymentMethod: "BANK_TRANSFER",
    paymentDate: "2026-10-10",
    reference: "TXN-9981",
    bankName: "Bank of Ceylon",
    accountName: "Nimal Perera",
    accountNumber: "1234567890123456",
    branch: "Colombo Fort",
  };
  for (const [key, value] of Object.entries({ ...values, ...overrides })) {
    if (value !== null && key !== "slip") form.append(key, value);
  }
  // The slip is a file. Pass slip: null to leave it out entirely.
  const slip = "slip" in overrides ? overrides.slip : new File([PNG], "slip.png", { type: "image/png" });
  if (slip) form.append("slip", slip);
  return form;
}

function submit(form: FormData, origin: string | null = ORIGIN) {
  const headers: Record<string, string> = {};
  if (origin) headers.origin = origin;
  return paymentRoute(new Request(`${ORIGIN}/api/registration/payment`, { method: "POST", headers, body: form }));
}

async function errorBody(response: Response) {
  return (await response.json()) as { error?: string; fields?: Record<string, string> };
}

beforeEach(async () => {
  resetRateLimits();
  for (const file of await fs.readdir(storageDir)) await fs.unlink(path.join(storageDir, file));
});

describe("submitting a payment slip for a pending application", () => {
  it("records one PENDING payment with the stored package price, the slip, and only the last four account digits", async () => {
    const application = await seedApplication();
    const response = await submit(paymentForm());
    expect(response.status).toBe(201);

    const payments = await prisma.payment.findMany({ where: { registrationRequestId: application.id }, include: { slips: true } });
    expect(payments).toHaveLength(1);
    const [payment] = payments;
    expect(payment.status).toBe(PaymentStatus.PENDING);
    expect(Number(payment.amount)).toBe(26000);
    expect(payment.paymentMethod).toBe(PaymentMethod.BANK_TRANSFER);
    expect(payment.accountNumberLast4).toBe("3456");
    expect(payment.transactionReference).toBe("TXN-9981");
    expect(payment.slips).toHaveLength(1);
    expect(payment.slips[0].mimeType).toBe("image/png");
    expect(payment.slips[0].originalFileName).toBe("slip.png");
    expect(await storedFiles()).toBe(1);

    // The full account number is never stored, and nothing is approved or enrolled.
    expect(JSON.stringify(payment)).not.toContain("1234567890123456");
    const after = await prisma.registrationRequest.findUnique({ where: { id: application.id }, include: { enrollment: true } });
    expect(after?.status).toBe(RegistrationStatus.PENDING);
    expect(after?.enrollment).toBeNull();
  });

  it("accepts the reference and email in any letter case, and a JPEG as well as a PNG", async () => {
    await seedApplication();
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32, 2)]);
    const response = await submit(
      paymentForm({ referenceNumber: REFERENCE.toLowerCase(), email: "  Applicant@Example.COM ", slip: new File([jpeg], "slip.jpg", { type: "image/jpeg" }) }),
    );
    expect(response.status).toBe(201);
  });

  it("gives the same message for a wrong password, a wrong email, and an unknown reference", async () => {
    await seedApplication();
    const wrongPassword = await submit(paymentForm({ password: "not-the-password" }));
    const wrongEmail = await submit(paymentForm({ email: "someone-else@example.com" }));
    const unknown = await submit(paymentForm({ referenceNumber: "RDS-FFFFFFFFFF" }));

    for (const response of [wrongPassword, wrongEmail, unknown]) {
      expect(response.status).toBe(401);
      expect((await errorBody(response)).error).toBe(CREDENTIALS_MESSAGE);
    }
    expect(await prisma.payment.count()).toBe(0);
    expect(await storedFiles()).toBe(0);
  });

  it("refuses a malformed reference with a field message and checks nothing else", async () => {
    await seedApplication();
    const response = await submit(paymentForm({ referenceNumber: "RDS-XYZ" }));
    expect(response.status).toBe(422);
    expect((await errorBody(response)).fields?.referenceNumber).toBeTruthy();
    expect(await storedFiles()).toBe(0);
  });

  it("refuses a file that is not a JPG, PNG or PDF, and stores nothing", async () => {
    await seedApplication();
    const response = await submit(paymentForm({ slip: new File(["just some text"], "notes.txt", { type: "text/plain" }) }));
    expect(response.status).toBe(415);
    expect(await prisma.payment.count()).toBe(0);
    expect(await storedFiles()).toBe(0);
  });

  it("refuses an empty file and a file over 5 MB with field messages", async () => {
    await seedApplication();
    const empty = await submit(paymentForm({ slip: new File([], "empty.png", { type: "image/png" }) }));
    expect(empty.status).toBe(422);
    expect((await errorBody(empty)).fields?.slip).toBeTruthy();

    const tooBig = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(5 * 1024 * 1024)]);
    const big = await submit(paymentForm({ slip: new File([tooBig], "big.png", { type: "image/png" }) }));
    expect(big.status).toBe(422);
    expect((await errorBody(big)).fields?.slip).toMatch(/5 MB/);
    expect(await storedFiles()).toBe(0);
  });

  it("refuses a future payment date, a missing bank name, and a bad account number", async () => {
    await seedApplication();
    const future = await submit(paymentForm({ paymentDate: "2999-01-01" }));
    expect((await errorBody(future)).fields?.paymentDate).toBeTruthy();
    const noBank = await submit(paymentForm({ bankName: " " }));
    expect((await errorBody(noBank)).fields?.bankName).toBeTruthy();
    const badAccount = await submit(paymentForm({ accountNumber: "12-AB" }));
    expect((await errorBody(badAccount)).fields?.accountNumber).toBeTruthy();
    expect(await prisma.payment.count()).toBe(0);
  });

  it("refuses a second submission for the same application, and leaves no second payment or file", async () => {
    await seedApplication();
    expect((await submit(paymentForm())).status).toBe(201);
    const retry = await submit(paymentForm());
    expect(retry.status).toBe(409);
    expect(await prisma.payment.count()).toBe(1);
    expect(await storedFiles()).toBe(1);
  });

  it("lets only one of two simultaneous submissions succeed", async () => {
    await seedApplication();
    const [first, second] = await Promise.all([submit(paymentForm()), submit(paymentForm())]);
    expect([first.status, second.status].sort()).toEqual([201, 409]);
    expect(await prisma.payment.count()).toBe(1);
    expect(await storedFiles()).toBe(1);
  });

  it("refuses an application that has already been approved or rejected", async () => {
    const application = await seedApplication();
    // A rejected application must also carry its review, as the database requires.
    await prisma.registrationRequest.update({
      where: { id: application.id },
      data: { status: RegistrationStatus.REJECTED, reviewedAt: new Date(), reviewedByUserId: "ADMIN-1", rejectionReason: "Documents do not match the NIC." },
    });
    const response = await submit(paymentForm());
    expect(response.status).toBe(409);
    expect(await prisma.payment.count()).toBe(0);
    expect(await storedFiles()).toBe(0);
  });

  it("refuses a request from another site, before reading anything", async () => {
    await seedApplication();
    const response = await submit(paymentForm(), "https://evil.example");
    expect(response.status).toBe(403);
    expect(await prisma.payment.count()).toBe(0);
  });

  it("limits repeated wrong passwords for one reference", async () => {
    await seedApplication();
    let last: Response | undefined;
    for (let attempt = 0; attempt < 11; attempt += 1) {
      last = await submit(paymentForm({ password: `wrong-${attempt}` }));
    }
    expect(last?.status).toBe(429);
    expect(last?.headers.get("Retry-After")).toBeTruthy();
  });
});

describe("admin review of the submitted payment", () => {
  it("shows the pending payment and its slip in the registration detail, without the stored file path", async () => {
    const application = await seedApplication();
    expect((await submit(paymentForm())).status).toBe(201);

    const detail = await getRegistration(application.id);
    expect(detail.payments).toHaveLength(1);
    expect(detail.payments[0].status).toBe(PaymentStatus.PENDING);
    expect(detail.payments[0].slips[0].originalFileName).toBe("slip.png");
    expect(detail.history.map((entry) => entry.event)).toContain("Payment recorded");
    const serialised = JSON.stringify(detail);
    expect(serialised).not.toContain("storageKey");
    expect(serialised).not.toContain(storageDir);
  });

  it("serves the slip to an admin only, with no-store and attachment headers", async () => {
    const application = await seedApplication();
    await submit(paymentForm());
    const slipId = (await getRegistration(application.id)).payments[0].slips[0].id;
    const { token } = await createSession("ADMIN-1");
    const context = { params: Promise.resolve({ slipId }) };

    const ok = await adminSlipRoute(
      new Request(`${ORIGIN}/api/admin/payment-slips/${slipId}`, { headers: { cookie: `riona_session=${token}` } }),
      context,
    );
    expect(ok.status).toBe(200);
    expect(ok.headers.get("Content-Type")).toBe("image/png");
    expect(ok.headers.get("Cache-Control")).toBe("private, no-store");
    expect(ok.headers.get("Content-Disposition")).toContain("attachment");
    expect(Buffer.from(await ok.arrayBuffer()).equals(PNG)).toBe(true);
  });

  it("refuses the slip to a student, to an anonymous visitor, and for an unknown id", async () => {
    const application = await seedApplication();
    await submit(paymentForm());
    const slipId = (await getRegistration(application.id)).payments[0].slips[0].id;
    const context = { params: Promise.resolve({ slipId }) };
    const { token: studentToken } = await createSession("STU-A");

    const asStudent = await adminSlipRoute(
      new Request(`${ORIGIN}/api/admin/payment-slips/${slipId}`, { headers: { cookie: `riona_session=${studentToken}` } }),
      context,
    );
    expect(asStudent.status).toBe(403);

    const anonymous = await adminSlipRoute(new Request(`${ORIGIN}/api/admin/payment-slips/${slipId}`), context);
    expect(anonymous.status).toBe(401);

    const { token } = await createSession("ADMIN-1");
    const missing = await adminSlipRoute(
      new Request(`${ORIGIN}/api/admin/payment-slips/missing`, { headers: { cookie: `riona_session=${token}` } }),
      { params: Promise.resolve({ slipId: "missing" }) },
    );
    expect(missing.status).toBe(404);
  });
});
