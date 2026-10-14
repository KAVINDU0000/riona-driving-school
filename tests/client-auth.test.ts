import { describe, expect, it } from "vitest";
import { loginErrorMessage, loginPathFor, portalPathForRole } from "@/lib/auth/portal";

describe("portal routing (client-safe)", () => {
  it("maps each server-returned role to its own fixed portal", () => {
    expect(portalPathForRole("STUDENT")).toBe("/portal/student");
    expect(portalPathForRole("INSTRUCTOR")).toBe("/portal/instructor");
    expect(portalPathForRole("ADMIN")).toBe("/portal/admin");
  });

  it("never returns a destination for anything that is not a known role (open-redirect guard)", () => {
    for (const value of ["//evil.example", "https://evil.example", "/portal/admin?next=x", "", undefined, null, 42, "admin"]) {
      expect(portalPathForRole(value)).toBeNull();
    }
  });

  it("builds login links with the role, and marks expired sessions", () => {
    expect(loginPathFor("STUDENT")).toBe("/login?role=student");
    expect(loginPathFor("ADMIN", "expired")).toBe("/login?role=admin&reason=expired");
  });
});

describe("login error messages", () => {
  it("uses one generic message for every credential failure", () => {
    expect(loginErrorMessage(401)).toBe("Invalid ID or password.");
  });

  it("explains rate limiting with a rounded-up wait", () => {
    expect(loginErrorMessage(429, 900)).toBe("Too many sign-in attempts. Try again in about 15 minutes.");
    expect(loginErrorMessage(429, 30)).toBe("Too many sign-in attempts. Try again in about 1 minute.");
  });

  it("never shows raw server text for unexpected failures", () => {
    expect(loginErrorMessage(500)).toBe("Something went wrong. Please try again.");
    expect(loginErrorMessage(0)).toMatch(/could not reach/);
  });
});
