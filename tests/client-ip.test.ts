// Database-free. Rate-limit client address: forwarded headers are trusted only for the configured number of proxies.
import { describe, expect, it } from "vitest";
import { UNTRUSTED_CLIENT_KEY, parseTrustedProxyHops, resolveClientIp } from "@/lib/auth/client-ip";

describe("parseTrustedProxyHops", () => {
  it("is 0 when unset or blank", () => {
    expect(parseTrustedProxyHops(undefined)).toBe(0);
    expect(parseTrustedProxyHops("  ")).toBe(0);
  });

  it("accepts whole numbers from 0 to 10", () => {
    expect(parseTrustedProxyHops("0")).toBe(0);
    expect(parseTrustedProxyHops(" 2 ")).toBe(2);
    expect(parseTrustedProxyHops("10")).toBe(10);
  });

  it("refuses anything else, so a misconfigured server fails closed", () => {
    for (const bad of ["-1", "1.5", "abc", "11", "2a", "1e1"]) {
      expect(() => parseTrustedProxyHops(bad)).toThrow("TRUSTED_PROXY_HOPS must be a whole number from 0 to 10.");
    }
  });
});

describe("resolveClientIp with no trusted proxy (default)", () => {
  it("ignores a client-supplied X-Forwarded-For, so spoofing cannot choose a key", () => {
    expect(resolveClientIp("203.0.113.9", 0)).toBe(UNTRUSTED_CLIENT_KEY);
    expect(resolveClientIp("198.51.100.1, 203.0.113.9", 0)).toBe(UNTRUSTED_CLIENT_KEY);
  });

  it("uses the shared key when the header is absent", () => {
    expect(resolveClientIp(null, 0)).toBe(UNTRUSTED_CLIENT_KEY);
  });
});

describe("resolveClientIp with trusted proxies", () => {
  it("takes the address the one trusted proxy appended, and ignores anything the client put first", () => {
    // The proxy appends the address it received, so the last entry is the client.
    expect(resolveClientIp("203.0.113.7", 1)).toBe("203.0.113.7");
    expect(resolveClientIp("10.0.0.1, 203.0.113.7", 1)).toBe("203.0.113.7");
    // A spoofed first value does not win.
    expect(resolveClientIp("192.0.2.66, 203.0.113.7", 1)).toBe("203.0.113.7");
  });

  it("skips the trusted entries when two proxies append, and returns the client they saw", () => {
    expect(resolveClientIp("203.0.113.7, 10.0.0.2", 2)).toBe("203.0.113.7");
    expect(resolveClientIp("192.0.2.66, 203.0.113.7, 10.0.0.2", 2)).toBe("203.0.113.7");
  });

  it("is untrusted when the header has fewer entries than trusted proxies", () => {
    expect(resolveClientIp("203.0.113.7", 2)).toBe(UNTRUSTED_CLIENT_KEY);
    expect(resolveClientIp(null, 1)).toBe(UNTRUSTED_CLIENT_KEY);
  });

  it("treats empty entries and oversized entries as untrusted", () => {
    expect(resolveClientIp(", 203.0.113.7", 1)).toBe("203.0.113.7");
    expect(resolveClientIp("203.0.113.7,", 1)).toBe(UNTRUSTED_CLIENT_KEY);
    expect(resolveClientIp("x".repeat(65), 1)).toBe(UNTRUSTED_CLIENT_KEY);
  });

  it("trims whitespace around entries", () => {
    expect(resolveClientIp("  198.51.100.4  ", 1)).toBe("198.51.100.4");
  });
});
