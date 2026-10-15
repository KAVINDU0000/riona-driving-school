import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AccountStatus, UserRole } from "@/generated/prisma/enums";
import { POST as adminLogin } from "@/app/api/auth/admin/login/route";
import { GET as me } from "@/app/api/auth/me/route";
import { resetAdminPassword } from "@/lib/auth/admin-recovery";
import { createBootstrapAdmin } from "@/lib/auth/bootstrap-admin";
import { confirmEmailChange, requestEmailChange } from "@/lib/auth/email-change";
import { verifyPassword } from "@/lib/auth/password";
import { issuePasswordResetToken, startPasswordReset } from "@/lib/auth/password-reset";
import { resetRateLimits } from "@/lib/auth/rate-limit";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createAccount, getRequest, postRequest, resetDatabase } from "./helpers";
import { configureEmailProvider, mockResend, restoreEmailEnv, tokenFromLatestMessage } from "./email-mock";

const ADMIN_PASSWORD = "admin-password-123";

async function insertRawUser(userId: string, email: string | null, role: "ADMIN" | "STUDENT" | "INSTRUCTOR") {
  await prisma.$executeRawUnsafe(
    `INSERT INTO "User" ("userId", email, "passwordHash", role, status, "updatedAt") VALUES ($1, $2, 'x', $3::"UserRole", 'ACTIVE', now())`,
    userId,
    email,
    role,
  );
}

function login(identifier: string, password: string) {
  return adminLogin(postRequest("/api/auth/admin/login", { identifier, password }));
}

describe("admin accounts without an email address", () => {
  beforeEach(async () => {
    await resetDatabase();
    resetRateLimits();
  });

  afterEach(() => {
    restoreEmailEnv();
  });

  describe("database rule", () => {
    it("lets an admin have no email, and several admins without one do not collide", async () => {
      await insertRawUser("ADMIN-001", null, "ADMIN");
      await insertRawUser("ADMIN-002", null, "ADMIN");
      expect(await prisma.user.count({ where: { role: UserRole.ADMIN, email: null } })).toBe(2);
    });

    it("refuses a student or instructor without an email", async () => {
      await expect(insertRawUser("STU-001", null, "STUDENT")).rejects.toThrow(/User_email_required_unless_admin_check/);
      await expect(insertRawUser("INS-001", null, "INSTRUCTOR")).rejects.toThrow(/User_email_required_unless_admin_check/);
      await expect(
        prisma.user.create({ data: { userId: "STU-002", email: null, passwordHash: "x", role: UserRole.STUDENT } }),
      ).rejects.toThrow();
      expect(await prisma.user.count()).toBe(0);
    });

    it("refuses removing a student's existing email", async () => {
      await createAccount({ userId: "STU-001", email: "student@riona.lk", role: UserRole.STUDENT });
      await expect(prisma.user.update({ where: { userId: "STU-001" }, data: { email: null } })).rejects.toThrow();
      expect((await prisma.user.findUniqueOrThrow({ where: { userId: "STU-001" } })).email).toBe("student@riona.lk");
    });

    it("still keeps non-empty email addresses unique", async () => {
      await createAccount({ userId: "STU-001", email: "same@riona.lk", role: UserRole.STUDENT });
      await expect(createAccount({ userId: "INS-001", email: "same@riona.lk", role: UserRole.INSTRUCTOR })).rejects.toMatchObject({ code: "P2002" });
    });
  });

  describe("account flows", () => {
    beforeEach(async () => {
      await createBootstrapAdmin({ userId: "ADMIN-001", password: ADMIN_PASSWORD });
      await createAccount({ userId: "STU-001", email: "student@riona.lk", role: UserRole.STUDENT });
    });

    it("/api/auth/me returns the admin with a null email, and a student with theirs", async () => {
      const adminToken = (await createSession("ADMIN-001")).token;
      const adminMe = await me(getRequest("/api/auth/me", `riona_session=${adminToken}`));
      expect(await adminMe.json()).toEqual({ user: { userId: "ADMIN-001", email: null, role: "ADMIN" } });

      const studentToken = (await createSession("STU-001")).token;
      const studentMe = await me(getRequest("/api/auth/me", `riona_session=${studentToken}`));
      expect(await studentMe.json()).toEqual({ user: { userId: "STU-001", email: "student@riona.lk", role: "STUDENT" } });
    });

    it("an emailed password reset can never reach an admin without an email", async () => {
      configureEmailProvider();
      const { messages } = mockResend();
      await startPasswordReset("admin-001@riona.lk");
      await startPasswordReset("");
      expect(messages).toHaveLength(0);
      expect(await prisma.passwordResetToken.count({ where: { userId: "ADMIN-001" } })).toBe(0);
    });

    it("the student emailed password reset still works", async () => {
      configureEmailProvider();
      const { messages } = mockResend();
      await startPasswordReset("Student@Riona.lk");
      expect(messages).toHaveLength(1);
      expect(messages[0].to).toEqual(["student@riona.lk"]);
      expect(await prisma.passwordResetToken.count({ where: { userId: "STU-001", usedAt: null } })).toBe(1);
    });

    it("an admin without an email can add one through the confirmed email change", async () => {
      configureEmailProvider();
      const { messages } = mockResend();
      await requestEmailChange("ADMIN-001", ADMIN_PASSWORD, "Owner@Riona.lk");
      await confirmEmailChange(tokenFromLatestMessage(messages));
      expect((await prisma.user.findUniqueOrThrow({ where: { userId: "ADMIN-001" } })).email).toBe("owner@riona.lk");
      // Even with an email on file, the admin still signs in by ID only.
      expect((await login("owner@riona.lk", ADMIN_PASSWORD)).status).toBe(401);
      expect((await login("ADMIN-001", ADMIN_PASSWORD)).status).toBe(200);
    });
  });

  describe("local admin password recovery", () => {
    beforeEach(async () => {
      await createBootstrapAdmin({ userId: "ADMIN-001", password: ADMIN_PASSWORD });
      await createAccount({ userId: "STU-001", email: "student@riona.lk", role: UserRole.STUDENT });
    });

    it("sets a new password, signs the admin out everywhere and voids unused reset links", async () => {
      await createSession("ADMIN-001");
      await createSession("ADMIN-001");
      await issuePasswordResetToken("ADMIN-001");

      const result = await resetAdminPassword(" admin-001 ", "recovered-password-1");

      expect(result).toEqual({ userId: "ADMIN-001", status: AccountStatus.ACTIVE });
      expect(await prisma.session.count({ where: { userId: "ADMIN-001" } })).toBe(0);
      expect(await prisma.passwordResetToken.count({ where: { userId: "ADMIN-001", usedAt: null } })).toBe(0);
      expect((await login("ADMIN-001", ADMIN_PASSWORD)).status).toBe(401);
      expect((await login("ADMIN-001", "recovered-password-1")).status).toBe(200);

      const row = await prisma.user.findUniqueOrThrow({ where: { userId: "ADMIN-001" } });
      expect(row).toMatchObject({ email: null, role: UserRole.ADMIN, status: AccountStatus.ACTIVE });
    });

    it("refuses a student, an unknown ID, an invalid ID and a weak password, changing nothing", async () => {
      const studentHash = (await prisma.user.findUniqueOrThrow({ where: { userId: "STU-001" } })).passwordHash;

      await expect(resetAdminPassword("STU-001", "recovered-password-1")).rejects.toMatchObject({ status: 404 });
      await expect(resetAdminPassword("ADMIN-999", "recovered-password-1")).rejects.toMatchObject({ status: 404 });
      await expect(resetAdminPassword("a", "recovered-password-1")).rejects.toMatchObject({ status: 400 });
      await expect(resetAdminPassword("ADMIN-001", "short")).rejects.toMatchObject({ status: 400 });

      expect((await prisma.user.findUniqueOrThrow({ where: { userId: "STU-001" } })).passwordHash).toBe(studentHash);
      expect(await verifyPassword((await prisma.user.findUniqueOrThrow({ where: { userId: "ADMIN-001" } })).passwordHash, ADMIN_PASSWORD)).toBe(true);
    });

    it("keeps an inactive admin inactive: the new password does not reopen the account", async () => {
      await prisma.user.update({ where: { userId: "ADMIN-001" }, data: { status: AccountStatus.INACTIVE } });
      const result = await resetAdminPassword("ADMIN-001", "recovered-password-1");
      expect(result.status).toBe(AccountStatus.INACTIVE);
      expect((await login("ADMIN-001", "recovered-password-1")).status).toBe(401);
    });
  });
});
