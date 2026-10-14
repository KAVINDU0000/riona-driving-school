import { beforeEach, describe, expect, it } from "vitest";
import { UserRole } from "@/generated/prisma/enums";
import { createBootstrapAdmin } from "@/lib/auth/bootstrap-admin";
import { verifyPassword } from "@/lib/auth/password";
import { resetRateLimits } from "@/lib/auth/rate-limit";
import { POST as adminLogin } from "@/app/api/auth/admin/login/route";
import { prisma } from "@/lib/prisma";
import { createAccount, postRequest, resetDatabase, sessionCookieFrom } from "./helpers";

const SETUP_PASSWORD = "setup-password-123";

describe("bootstrap admin command logic", () => {
  beforeEach(async () => {
    await resetDatabase();
    resetRateLimits();
  });

  it("creates the first admin with a normalised email and an Argon2id hash", async () => {
    const admin = await createBootstrapAdmin({ userId: " admin-001 ", email: "  Owner@Riona.LK ", password: SETUP_PASSWORD });

    expect(admin).toEqual({ userId: "ADMIN-001", email: "owner@riona.lk" });
    const row = await prisma.user.findUniqueOrThrow({ where: { userId: "ADMIN-001" } });
    expect(row.role).toBe(UserRole.ADMIN);
    expect(row.passwordHash.startsWith("$argon2id$")).toBe(true);
    expect(row.passwordHash).not.toContain(SETUP_PASSWORD);
    expect(await verifyPassword(row.passwordHash, SETUP_PASSWORD)).toBe(true);
  });

  it("the new admin can sign in through the admin login endpoint", async () => {
    await createBootstrapAdmin({ userId: "ADMIN-001", email: "owner@riona.lk", password: SETUP_PASSWORD });

    const response = await adminLogin(postRequest("/api/auth/admin/login", { identifier: "owner@riona.lk", password: SETUP_PASSWORD }));
    expect(response.status).toBe(200);
    expect(sessionCookieFrom(response)).toBeDefined();
  });

  it("refuses to create a second admin, even with a different ID and email", async () => {
    await createBootstrapAdmin({ userId: "ADMIN-001", email: "owner@riona.lk", password: SETUP_PASSWORD });

    await expect(
      createBootstrapAdmin({ userId: "ADMIN-002", email: "second@riona.lk", password: SETUP_PASSWORD }),
    ).rejects.toMatchObject({ status: 409 });
    expect(await prisma.user.count({ where: { role: UserRole.ADMIN } })).toBe(1);
  });

  it("refuses when two runs race: exactly one admin is created", async () => {
    const results = await Promise.allSettled([
      createBootstrapAdmin({ userId: "ADMIN-001", email: "one@riona.lk", password: SETUP_PASSWORD }),
      createBootstrapAdmin({ userId: "ADMIN-002", email: "two@riona.lk", password: SETUP_PASSWORD }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.user.count({ where: { role: UserRole.ADMIN } })).toBe(1);
  });

  it("rejects an invalid ID, email or weak password without creating anything", async () => {
    await expect(createBootstrapAdmin({ userId: "a", email: "owner@riona.lk", password: SETUP_PASSWORD })).rejects.toMatchObject({ status: 400 });
    await expect(createBootstrapAdmin({ userId: "ADMIN-001", email: "not-an-email", password: SETUP_PASSWORD })).rejects.toMatchObject({ status: 400 });
    await expect(createBootstrapAdmin({ userId: "ADMIN-001", email: "owner@riona.lk", password: "short" })).rejects.toMatchObject({ status: 400 });
    expect(await prisma.user.count()).toBe(0);
  });

  it("refuses an email that another account already uses, and creates nothing", async () => {
    await createAccount({ userId: "STU-001", email: "taken@riona.lk", role: UserRole.STUDENT });

    await expect(
      createBootstrapAdmin({ userId: "ADMIN-001", email: "TAKEN@riona.lk", password: SETUP_PASSWORD }),
    ).rejects.toMatchObject({ status: 409 });
    expect(await prisma.user.count({ where: { role: UserRole.ADMIN } })).toBe(0);
  });
});
