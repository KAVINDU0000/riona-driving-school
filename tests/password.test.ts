import { describe, expect, it } from "vitest";
import { getDummyHash, hashPassword, validateNewPassword, verifyPassword } from "@/lib/auth/password";
import { hashToken, generateToken } from "@/lib/auth/tokens";

describe("password hashing", () => {
  it("stores an Argon2id hash, never the plaintext", async () => {
    const hash = await hashPassword("a-good-password");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(hash).not.toContain("a-good-password");
  });

  it("verifies the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("a-good-password");
    expect(await verifyPassword(hash, "a-good-password")).toBe(true);
    expect(await verifyPassword(hash, "a-good-passwore")).toBe(false);
  });

  it("returns false for a malformed stored hash instead of throwing", async () => {
    expect(await verifyPassword("not-a-hash", "anything")).toBe(false);
  });

  it("salts each hash, so equal passwords hash differently", async () => {
    expect(await hashPassword("same-password")).not.toBe(await hashPassword("same-password"));
  });

  it("the dummy hash never verifies a real password", async () => {
    expect(await verifyPassword(await getDummyHash(), "guess")).toBe(false);
  });

  it("enforces password length bounds", () => {
    expect(validateNewPassword("short")).toMatch(/8/);
    expect(validateNewPassword("long-enough")).toBeNull();
    expect(validateNewPassword("x".repeat(129))).toMatch(/128/);
    expect(validateNewPassword(12345678)).not.toBeNull();
  });
});

describe("tokens", () => {
  it("generates unpredictable 256-bit tokens", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43); // 32 bytes, base64url
  });

  it("hashes tokens deterministically without exposing the input", () => {
    const token = generateToken();
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toContain(token);
  });
});
