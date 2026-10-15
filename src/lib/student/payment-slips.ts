import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { PaymentStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { AuthError } from "@/lib/auth/http";

/**
 * Payment-slip uploads. Slips are stored outside the public folder, under a server-generated name, and are
 * served only through an authorised route. The student's file name is kept as text, never used as a path.
 */

export const MAX_SLIP_BYTES = 5 * 1024 * 1024;

export type SlipType = { mime: string; extension: string; signature: (bytes: Buffer) => boolean };

const SLIP_TYPES: SlipType[] = [
  { mime: "image/jpeg", extension: "jpg", signature: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: "image/png",
    extension: "png",
    signature: (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  { mime: "application/pdf", extension: "pdf", signature: (b) => b.length > 5 && b.subarray(0, 5).toString("latin1") === "%PDF-" },
];

/** Identifies the real type from the file's bytes. The browser's declared type and the file name are not trusted. */
export function detectSlipType(bytes: Buffer): SlipType | null {
  return SLIP_TYPES.find((type) => type.signature(bytes)) ?? null;
}

/** A display-safe file name: no folders, no control characters, and a bounded length. */
export function safeDisplayName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "payment-slip";
  const cleaned = base.replace(/[\u0000-\u001f\u007f<>"']/g, "").trim();
  return (cleaned || "payment-slip").slice(0, 120);
}

export function slipStorageDir(): string {
  return process.env.PAYMENT_SLIP_STORAGE_DIR?.trim() || path.join(process.cwd(), "private-storage", "payment-slips");
}

/** Ensures the payment belongs to this student and is still pending. Returns null for anyone else's payment. */
async function ownedPendingPayment(paymentId: string, userId: string) {
  return prisma.payment.findFirst({
    where: {
      id: paymentId,
      OR: [{ enrollment: { studentUserId: userId } }, { registrationRequest: { approvedStudentUserId: userId } }],
    },
    select: { id: true, status: true },
  });
}

/** Writes slip bytes under a server-generated name in the private folder, and returns that name. */
export async function storeSlipFile(bytes: Buffer, type: SlipType): Promise<string> {
  const dir = slipStorageDir();
  const storageKey = `${randomBytes(24).toString("hex")}.${type.extension}`;
  await fs.mkdir(dir, { recursive: true });
  // Slips are runtime uploads, never build inputs: the ignore comment stops the build from tracing the whole
  // project (including .env files and any stored slips) into the server output.
  await fs.writeFile(path.join(/*turbopackIgnore: true*/ dir, storageKey), bytes, { flag: "wx" });
  return storageKey;
}

/** Deletes a stored slip file. Used when the database write that should reference it did not complete. */
export async function removeSlipFile(storageKey: string) {
  await fs.unlink(path.join(/*turbopackIgnore: true*/ slipStorageDir(), storageKey)).catch(() => undefined);
}

/** Stores an uploaded slip against one of the student's own pending payments. */
export async function uploadPaymentSlip(userId: string, paymentId: string, file: File) {
  if (file.size === 0 || file.size > MAX_SLIP_BYTES) {
    throw new AuthError(400, "Upload a file between 1 byte and 5 MB.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const type = detectSlipType(bytes);
  if (!type) {
    throw new AuthError(400, "Upload a JPEG, PNG or PDF file.");
  }

  const payment = await ownedPendingPayment(paymentId, userId);
  if (!payment) {
    throw new AuthError(404, "That payment was not found.");
  }
  if (payment.status !== PaymentStatus.PENDING) {
    throw new AuthError(409, "Slips can only be added to a pending payment.");
  }

  const storageKey = await storeSlipFile(bytes, type);

  try {
    const slip = await prisma.$transaction(async (tx) => {
      // Re-check inside the transaction, so a slip cannot attach to a payment reviewed in the meantime.
      const current = await tx.payment.findFirst({ where: { id: paymentId, status: PaymentStatus.PENDING }, select: { id: true } });
      if (!current) throw new AuthError(409, "Slips can only be added to a pending payment.");

      return tx.paymentSlip.create({
        data: {
          paymentId,
          storageKey,
          originalFileName: safeDisplayName(file.name),
          mimeType: type.mime,
          fileSizeBytes: bytes.length,
        },
        select: { id: true, originalFileName: true, uploadedAt: true },
      });
    });
    return slip;
  } catch (error) {
    await removeSlipFile(storageKey);
    throw error;
  }
}

/** Returns a slip the student may view, or null. The check covers the slip's payment and its owner. */
export async function readOwnedSlip(userId: string, slipId: string) {
  const slip = await prisma.paymentSlip.findFirst({
    where: {
      id: slipId,
      payment: {
        OR: [{ enrollment: { studentUserId: userId } }, { registrationRequest: { approvedStudentUserId: userId } }],
      },
    },
    select: { storageKey: true, mimeType: true, originalFileName: true },
  });
  if (!slip) return null;

  // The stored key is generated by the server and cannot contain a separator, so this cannot escape the folder.
  if (!/^[a-f0-9]{48}\.(jpg|png|pdf)$/.test(slip.storageKey)) return null;

  const bytes = await fs.readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ slipStorageDir(), slip.storageKey));
  return { bytes, mimeType: slip.mimeType, fileName: slip.originalFileName };
}

/**
 * Returns any stored slip for an admin reviewing its application, or null. The caller must already have
 * checked the admin role. Students never reach this function.
 */
export async function readSlipForAdmin(slipId: string) {
  const slip = await prisma.paymentSlip.findUnique({
    where: { id: slipId },
    select: { storageKey: true, mimeType: true, originalFileName: true },
  });
  if (!slip || !/^[a-f0-9]{48}\.(jpg|png|pdf)$/.test(slip.storageKey)) return null;

  const bytes = await fs.readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ slipStorageDir(), slip.storageKey));
  return { bytes, mimeType: slip.mimeType, fileName: slip.originalFileName };
}
