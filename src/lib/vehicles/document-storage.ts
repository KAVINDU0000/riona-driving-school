/**
 * Private storage for vehicle maintenance documents. Files are written under a random name in a directory that the
 * administrator configures with MAINTENANCE_DOCUMENT_STORAGE_DIR. The directory must be an absolute path outside the public
 * folder. When it is missing or unsafe, every operation fails with StorageNotConfiguredError, so no file is ever written to
 * a default or public location. Files are never served by URL: routes stream them with attachment headers after an
 * administrator check. The directory is configured outside the project, so the dynamic paths are marked for the bundler.
 */
import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export class StorageNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageNotConfiguredError";
  }
}

const STORAGE_KEY_PATTERN = /^[a-f0-9]{48}\.(jpg|png|pdf)$/;

/** The configured private directory. Throws when it is missing, relative, or inside the public folder. */
export function maintenanceStorageDir(): string {
  const raw = process.env.MAINTENANCE_DOCUMENT_STORAGE_DIR?.trim();
  if (!raw) {
    throw new StorageNotConfiguredError(
      "Document storage is not configured. Set MAINTENANCE_DOCUMENT_STORAGE_DIR to an absolute folder outside the public site.",
    );
  }
  if (!path.isAbsolute(raw)) {
    throw new StorageNotConfiguredError("MAINTENANCE_DOCUMENT_STORAGE_DIR must be an absolute path.");
  }
  const resolved = path.resolve(raw);
  const publicDir = path.resolve(process.cwd(), "public");
  if (resolved === publicDir || resolved.startsWith(publicDir + path.sep)) {
    throw new StorageNotConfiguredError("MAINTENANCE_DOCUMENT_STORAGE_DIR must not be inside the public folder.");
  }
  return resolved;
}

export function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Writes the bytes under a new random name and returns that name. Fails if the name already exists, never overwrites. */
export async function storeMaintenanceFile(bytes: Buffer, extension: "jpg" | "png" | "pdf"): Promise<string> {
  const dir = maintenanceStorageDir();
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const storageKey = `${randomBytes(24).toString("hex")}.${extension}`;
  await writeFile(path.join(/* turbopackIgnore: true */ dir, storageKey), bytes, { flag: "wx", mode: 0o600 });
  return storageKey;
}

/** Reads a stored file. The storage key is checked against its expected shape before it is used as a path. */
export async function readMaintenanceFile(storageKey: string): Promise<Buffer> {
  if (!STORAGE_KEY_PATTERN.test(storageKey)) throw new Error("Stored document name is not valid.");
  return readFile(path.join(/* turbopackIgnore: true */ maintenanceStorageDir(), storageKey));
}

/** Removes a file that was written but whose database row could not be saved. Errors are ignored: the file is unreferenced. */
export async function removeMaintenanceFile(storageKey: string): Promise<void> {
  if (!STORAGE_KEY_PATTERN.test(storageKey)) return;
  await rm(path.join(/* turbopackIgnore: true */ maintenanceStorageDir(), storageKey), { force: true }).catch(() => undefined);
}
