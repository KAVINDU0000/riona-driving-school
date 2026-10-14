import { createHash, randomBytes } from "node:crypto";

/**
 * 256-bit random token for sessions, password resets and email changes.
 * Only the SHA-256 hash is stored, so a database leak does not expose usable tokens.
 */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * SHA-256 is enough here because the input already has 256 bits of entropy. Lookups go through
 * the unique index on the hash, so no separate constant-time comparison is needed.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
