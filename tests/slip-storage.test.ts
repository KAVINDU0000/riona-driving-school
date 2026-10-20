// Database-free. Checks the payment-slip storage helpers that the vehicle document design reuses: type detection from the bytes,
// file-name cleaning, the size limit, and the write and remove steps. Files go to a temporary folder that is removed afterwards.
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { MAX_SLIP_BYTES, detectSlipType, removeSlipFile, safeDisplayName, storeSlipFile } from "@/lib/student/payment-slips";

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
// A real PNG is longer than its 8-byte signature (the first chunk follows it), and the check needs more than the signature.
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const PDF = Buffer.from("%PDF-1.7\n%test", "latin1");

let storageDir = "";

beforeAll(async () => {
  storageDir = await mkdtemp(path.join(tmpdir(), "riona-vehicle-docs-check-"));
  vi.stubEnv("PAYMENT_SLIP_STORAGE_DIR", storageDir);
});

afterAll(async () => {
  vi.unstubAllEnvs();
  if (storageDir) await rm(storageDir, { recursive: true, force: true });
});

describe("type is decided by the bytes, not the file name", () => {
  it("accepts JPEG, PNG and PDF signatures", () => {
    expect(detectSlipType(JPEG)?.mime).toBe("image/jpeg");
    expect(detectSlipType(PNG)?.mime).toBe("image/png");
    expect(detectSlipType(PDF)?.mime).toBe("application/pdf");
  });

  it("refuses anything else, including empty and truncated input", () => {
    expect(detectSlipType(Buffer.from("GIF89a", "latin1"))).toBeNull();
    expect(detectSlipType(Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toBeNull();
    expect(detectSlipType(Buffer.alloc(0))).toBeNull();
    expect(detectSlipType(Buffer.from([0xff, 0xd8]))).toBeNull();
    expect(detectSlipType(Buffer.from("%PDF", "latin1"))).toBeNull();
  });
});

describe("file names shown back to a user", () => {
  it("keeps only the last part of a path and removes control and markup characters", () => {
    expect(safeDisplayName("../../etc/passwd.pdf")).toBe("passwd.pdf");
    expect(safeDisplayName("C:\\Users\\me\\slip<1>.pdf")).toBe("slip1.pdf");
    expect(safeDisplayName("\u0000\u0001")).toBe("payment-slip");
  });

  it("bounds the length", () => {
    expect(safeDisplayName("a".repeat(300)).length).toBe(120);
  });
});

describe("size limit", () => {
  it("is 5 MB", () => {
    expect(MAX_SLIP_BYTES).toBe(5 * 1024 * 1024);
  });
});

describe("storing and removing a file", () => {
  it("writes the bytes under a server-generated key, and never under the file name", async () => {
    const key = await storeSlipFile(PDF, detectSlipType(PDF)!);
    expect(key).toMatch(/^[0-9a-f]{48}\.pdf$/);
    expect(key).not.toContain("passwd");
    expect(Buffer.compare(await readFile(path.join(storageDir, key)), PDF)).toBe(0);
    expect(await readdir(storageDir)).toContain(key);
  });

  it("gives two uploads of the same bytes different keys", async () => {
    const first = await storeSlipFile(PNG, detectSlipType(PNG)!);
    const second = await storeSlipFile(PNG, detectSlipType(PNG)!);
    expect(first).not.toBe(second);
  });

  it("removes a stored file, and removing a missing file is not an error", async () => {
    const key = await storeSlipFile(JPEG, detectSlipType(JPEG)!);
    await removeSlipFile(key);
    expect(await readdir(storageDir)).not.toContain(key);
    await expect(removeSlipFile("0".repeat(48) + ".jpg")).resolves.toBeUndefined();
  });
});
