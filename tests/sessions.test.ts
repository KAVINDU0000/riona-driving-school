import { beforeEach, describe, expect, it } from "vitest";
import { UserRole } from "@/generated/prisma/enums";
import { POST as studentLogin } from "@/app/api/auth/student/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as me } from "@/app/api/auth/me/route";
import { getUserFromSessionToken } from "@/lib/auth/authorize";
import { hashToken } from "@/lib/auth/tokens";
import { resetRateLimits } from "@/lib/auth/rate-limit";
import { prisma } from "@/lib/prisma";
import { AccountStatus } from "@/generated/prisma/enums";
import { DEFAULT_PASSWORD, createAccount, getRequest, postRequest, rawTokenFromCookie, resetDatabase, sessionCookieFrom } from "./helpers";

async function loginAsStudent() {
  const response = await studentLogin(postRequest("/api/auth/student/login", { identifier: "STU-001", password: DEFAULT_PASSWORD }));
  const cookie = sessionCookieFrom(response);
  if (!cookie) throw new Error("login did not set a session cookie");
  return cookie;
}

describe("sessions", () => {
  beforeEach(async () => {
    await resetDatabase();
    resetRateLimits();
    await createAccount({ userId: "STU-001", email: "student@riona.lk", role: UserRole.STUDENT });
  });

  it("sets a session cookie that is HttpOnly, SameSite=Lax and path /", async () => {
    const response = await studentLogin(postRequest("/api/auth/student/login", { identifier: "STU-001", password: DEFAULT_PASSWORD }));
    const header = response.headers.get("set-cookie") ?? "";
    expect(header).toMatch(/HttpOnly/i);
    expect(header).toMatch(/SameSite=Lax/i);
    expect(header).toMatch(/Path=\//i);
    expect(header).not.toMatch(/Secure/i); // Secure is applied in production only
  });

  it("stores only the hash of the session token", async () => {
    const cookie = await loginAsStudent();
    const raw = rawTokenFromCookie(cookie);

    const rows = await prisma.session.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).toBe(hashToken(raw));
    expect(JSON.stringify(rows)).not.toContain(raw);
  });

  it("authenticates a valid session", async () => {
    const cookie = await loginAsStudent();
    const response = await me(getRequest("/api/auth/me", cookie));
    expect(response.status).toBe(200);
    expect((await response.json()).user).toMatchObject({ userId: "STU-001", role: "STUDENT" });
  });

  it("rejects a missing or unknown session", async () => {
    expect((await me(getRequest("/api/auth/me"))).status).toBe(401);
    expect((await me(getRequest("/api/auth/me", "riona_session=not-a-real-token"))).status).toBe(401);
    expect(await getUserFromSessionToken(undefined)).toBeNull();
  });

  it("rejects an expired session", async () => {
    const cookie = await loginAsStudent();
    await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await me(getRequest("/api/auth/me", cookie))).status).toBe(401);
  });

  it("issues a new token at each login and retires the old one (no session fixation)", async () => {
    const first = await loginAsStudent();
    const second = await studentLogin(postRequest("/api/auth/student/login", { identifier: "STU-001", password: DEFAULT_PASSWORD }, { cookie: first }));
    const secondCookie = sessionCookieFrom(second);

    expect(secondCookie).toBeDefined();
    expect(secondCookie).not.toBe(first);
    expect((await me(getRequest("/api/auth/me", first))).status).toBe(401);
    expect((await me(getRequest("/api/auth/me", secondCookie))).status).toBe(200);
  });

  it("logout invalidates the session, clears the cookie, and a replayed token stops working", async () => {
    const cookie = await loginAsStudent();

    const response = await logout(postRequest("/api/auth/logout", {}, { cookie }));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toMatch(/riona_session=;/);

    expect((await me(getRequest("/api/auth/me", cookie))).status).toBe(401);
    expect(await prisma.session.count()).toBe(0);
  });

  it("logout with no session still succeeds", async () => {
    const response = await logout(postRequest("/api/auth/logout", {}));
    expect(response.status).toBe(200);
  });

  it("rejects every session for an account that has been deactivated", async () => {
    const cookie = await loginAsStudent();
    await prisma.user.update({ where: { userId: "STU-001" }, data: { status: AccountStatus.INACTIVE } });
    expect((await me(getRequest("/api/auth/me", cookie))).status).toBe(401);
  });
});
