import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentMethod, PaymentStatus } from "@/generated/prisma/enums";
import { POST as uploadSlip } from "@/app/api/student/payments/[paymentId]/slips/route";
import { GET as downloadSlip } from "@/app/api/student/payments/slips/[slipId]/route";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { MAX_SLIP_BYTES, detectSlipType, readOwnedSlip, safeDisplayName } from "@/lib/student/payment-slips";
import { getRequest } from "./helpers";
import { seedStudentWorld } from "./student-fixtures";

let storageDir: string;
let fixture: Awaited<ReturnType<typeof seedStudentWorld>>;

const PDF_BYTES = Buffer.from("%PDF-1.4\n% test slip\n%%EOF\n");
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);

async function cookieFor(userId: string) {
  const { token } = await createSession(userId);
  return `riona_session=${token}`;
}

function uploadRequest(paymentId: string, file: File | null, cookie?: string) {
  const form = new FormData();
  if (file) form.append("file", file);
  const headers: Record<string, string> = { origin: "http://localhost:3000" };
  if (cookie) headers.cookie = cookie;
  return new Request(`http://localhost:3000/api/student/payments/${paymentId}/slips`, { method: "POST", body: form, headers });
}

async function upload(paymentId: string, file: File | null, cookie: string) {
  return uploadSlip(uploadRequest(paymentId, file, cookie), { params: Promise.resolve({ paymentId }) });
}

async function seedPayments() {
  await prisma.payment.create({
    data: { id: "PAY-A", enrollmentId: fixture.enrollments.A1, amount: 13000, paymentMethod: PaymentMethod.BANK_TRANSFER, paymentDate: new Date("2099-05-01T00:00:00Z") },
  });
  await prisma.payment.create({
    data: { id: "PAY-B", enrollmentId: fixture.enrollments.B1, amount: 26000, paymentMethod: PaymentMethod.BANK_DEPOSIT, paymentDate: new Date("2099-05-01T00:00:00Z") },
  });
  await prisma.payment.create({
    data: {
      id: "PAY-APPROVED",
      enrollmentId: fixture.enrollments.A2,
      amount: 13000,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      paymentDate: new Date("2099-05-01T00:00:00Z"),
      status: PaymentStatus.APPROVED,
      reviewedByUserId: "ADMIN-1",
      lastReviewedAt: new Date("2099-05-02T00:00:00Z"),
    },
  });
}

describe("payment slips", () => {
  beforeAll(async () => {
    storageDir = await mkdtemp(path.join(tmpdir(), "riona-slips-"));
    vi.stubEnv("PAYMENT_SLIP_STORAGE_DIR", storageDir);
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await rm(storageDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    fixture = await seedStudentWorld();
    await seedPayments();
    await prisma.paymentSlip.deleteMany();
    for (const name of await readdir(storageDir)) await rm(path.join(storageDir, name));
  });

  it("accepts a real PDF for the student's own pending payment and stores it under a generated name", async () => {
    const response = await upload("PAY-A", new File([PDF_BYTES], "my receipt.pdf", { type: "application/pdf" }), await cookieFor("STU-A"));
    expect(response.status).toBe(201);
    const { slip } = await response.json();
    expect(slip.originalFileName).toBe("my receipt.pdf");

    const row = await prisma.paymentSlip.findUniqueOrThrow({ where: { id: slip.id } });
    expect(row.storageKey).toMatch(/^[a-f0-9]{48}\.pdf$/);
    expect(row.storageKey).not.toContain("receipt");
    expect(await readdir(storageDir)).toEqual([row.storageKey]);
  });

  it("decides the type from the file's content, not its name or declared type", async () => {
    // An executable-looking file renamed to .pdf with a PDF content type is refused.
    const disguised = new File([Buffer.from("MZ\x90\x00 fake exe")], "receipt.pdf", { type: "application/pdf" });
    expect((await upload("PAY-A", disguised, await cookieFor("STU-A"))).status).toBe(400);

    // Markup declared as an image is refused.
    const html = new File([Buffer.from("<script>alert(1)</script>")], "receipt.png", { type: "image/png" });
    expect((await upload("PAY-A", html, await cookieFor("STU-A"))).status).toBe(400);

    expect(detectSlipType(JPEG_BYTES)?.mime).toBe("image/jpeg");
    expect(detectSlipType(PNG_BYTES)?.mime).toBe("image/png");
    expect(await prisma.paymentSlip.count()).toBe(0);
  });

  it("refuses an empty file and a file over the size limit", async () => {
    const cookie = await cookieFor("STU-A");
    expect((await upload("PAY-A", new File([], "empty.pdf"), cookie)).status).toBe(400);
    const oversized = Buffer.concat([PDF_BYTES, Buffer.alloc(MAX_SLIP_BYTES)]);
    expect((await upload("PAY-A", new File([oversized], "big.pdf"), cookie)).status).toBe(400);
  });

  it("does not let a student attach a slip to another student's payment (404, with nothing written)", async () => {
    const response = await upload("PAY-B", new File([PDF_BYTES], "slip.pdf"), await cookieFor("STU-A"));
    expect(response.status).toBe(404);
    expect(await prisma.paymentSlip.count()).toBe(0);
    expect(await readdir(storageDir)).toEqual([]);
  });

  it("does not accept slips for a payment that is no longer pending", async () => {
    const response = await upload("PAY-APPROVED", new File([PDF_BYTES], "slip.pdf"), await cookieFor("STU-A"));
    expect(response.status).toBe(409);
  });

  it("requires a student session for uploads", async () => {
    expect((await upload("PAY-A", new File([PDF_BYTES], "slip.pdf"), "")).status).toBe(401);
    expect((await upload("PAY-A", new File([PDF_BYTES], "slip.pdf"), await cookieFor("INS-1"))).status).toBe(403);
  });

  it("the owner can download the slip with safe headers, and another student gets 404", async () => {
    await upload("PAY-A", new File([PDF_BYTES], "receipt.pdf"), await cookieFor("STU-A"));
    const slip = await prisma.paymentSlip.findFirstOrThrow();

    const owner = await downloadSlip(getRequest(`/api/student/payments/slips/${slip.id}`, await cookieFor("STU-A")), {
      params: Promise.resolve({ slipId: slip.id }),
    });
    expect(owner.status).toBe(200);
    expect(owner.headers.get("content-type")).toBe("application/pdf");
    expect(owner.headers.get("content-disposition")).toBe('attachment; filename="receipt.pdf"');
    expect(owner.headers.get("x-content-type-options")).toBe("nosniff");
    expect(owner.headers.get("cache-control")).toBe("private, no-store");
    expect(Buffer.from(await owner.arrayBuffer()).equals(PDF_BYTES)).toBe(true);

    const other = await downloadSlip(getRequest(`/api/student/payments/slips/${slip.id}`, await cookieFor("STU-B")), {
      params: Promise.resolve({ slipId: slip.id }),
    });
    expect(other.status).toBe(404);

    const anonymous = await downloadSlip(getRequest(`/api/student/payments/slips/${slip.id}`), { params: Promise.resolve({ slipId: slip.id }) });
    expect(anonymous.status).toBe(401);
  });

  it("never serves a path outside the storage folder, even if a stored key were tampered with", async () => {
    await upload("PAY-A", new File([PDF_BYTES], "receipt.pdf"), await cookieFor("STU-A"));
    const slip = await prisma.paymentSlip.findFirstOrThrow();
    await prisma.paymentSlip.update({ where: { id: slip.id }, data: { storageKey: "../../secret.pdf" } });
    expect(await readOwnedSlip("STU-A", slip.id)).toBeNull();
  });

  it("file names are stripped of folders and control characters", () => {
    expect(safeDisplayName("../../etc/passwd.pdf")).toBe("passwd.pdf");
    expect(safeDisplayName("C:\\Users\\me\\slip<1>.pdf")).toBe("slip1.pdf");
    expect(safeDisplayName("\u0000\u0001")).toBe("payment-slip");
  });
});

