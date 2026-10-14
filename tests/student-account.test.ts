import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as changePasswordRoute } from "@/app/api/account/password/route";
import { GET as me } from "@/app/api/auth/me/route";
import { POST as studentLogin } from "@/app/api/auth/student/login/route";
import { changePassword } from "@/lib/auth/password-change";
import { resetRateLimits } from "@/lib/auth/rate-limit";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PASSWORD, getRequest, postRequest, sessionCookieFrom } from "./helpers";
import { seedStudentWorld } from "./student-fixtures";

// The portal guard reads cookies and redirects through Next. These mocks let it run inside Vitest.
const request = vi.hoisted(() => ({ cookie: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (request.cookie && name === "riona_session" ? { name, value: request.cookie } : undefined),
    has: (name: string) => Boolean(request.cookie && name === "riona_session"),
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

const { requirePortalUser } = await import("@/lib/auth/portal-guard");

async function sessionCookie(userId: string) {
  const { token } = await createSession(userId);
  return `riona_session=${token}`;
}

function passwordBody(current: string, next: string) {
  return { currentPassword: current, newPassword: next };
}

describe("student password change", () => {
  beforeEach(async () => {
    await seedStudentWorld();
    resetRateLimits();
  });

  it("requires the current password, so a stolen session alone cannot change it", async () => {
    const response = await changePasswordRoute(
      postRequest("/api/account/password", passwordBody("wrong-current-password", "brand-new-password"), { cookie: await sessionCookie("STU-A") }),
    );
    expect(response.status).toBe(401);
    const user = await prisma.user.findUniqueOrThrow({ where: { userId: "STU-A" } });
    expect(user.passwordHash.startsWith("$argon2id$")).toBe(true);
  });

  it("rejects a weak new password and a new password equal to the current one", async () => {
    const cookie = await sessionCookie("STU-A");
    expect((await changePasswordRoute(postRequest("/api/account/password", passwordBody(DEFAULT_PASSWORD, "short"), { cookie }))).status).toBe(400);
    expect((await changePasswordRoute(postRequest("/api/account/password", passwordBody(DEFAULT_PASSWORD, DEFAULT_PASSWORD), { cookie }))).status).toBe(400);
  });

  it("on success, signs out every other session, issues a fresh session, and the new password works", async () => {
    const otherDevice = await sessionCookie("STU-A");
    const thisDevice = await sessionCookie("STU-A");

    const response = await changePasswordRoute(
      postRequest("/api/account/password", passwordBody(DEFAULT_PASSWORD, "brand-new-password"), { cookie: thisDevice }),
    );
    expect(response.status).toBe(200);
    const replacement = sessionCookieFrom(response);
    expect(replacement).toBeDefined();

    expect((await me(getRequest("/api/auth/me", otherDevice))).status).toBe(401);
    expect((await me(getRequest("/api/auth/me", thisDevice))).status).toBe(401);
    expect((await me(getRequest("/api/auth/me", replacement))).status).toBe(200);

    const login = await studentLogin(postRequest("/api/auth/student/login", { identifier: "STU-A", password: "brand-new-password" }));
    expect(login.status).toBe(200);
    expect((await studentLogin(postRequest("/api/auth/student/login", { identifier: "STU-A", password: DEFAULT_PASSWORD }))).status).toBe(401);
  });

  it("refuses the change without a session, and any role still needs its own current password", async () => {
    expect((await changePasswordRoute(postRequest("/api/account/password", passwordBody(DEFAULT_PASSWORD, "brand-new-password")))).status).toBe(401);
    const instructorWrongCurrent = await changePasswordRoute(
      postRequest("/api/account/password", passwordBody("wrong-current-password", "brand-new-password"), { cookie: await sessionCookie("INS-1") }),
    );
    expect(instructorWrongCurrent.status).toBe(401);
  });

  it("the service keeps the password hash out of its return value", async () => {
    const result = await changePassword("STU-A", DEFAULT_PASSWORD, "another-new-password");
    expect(Object.keys(result)).toEqual(["token"]);
  });

  it("is rate limited per account after repeated wrong attempts", async () => {
    const cookie = await sessionCookie("STU-A");
    let last = 0;
    for (let i = 0; i < 6; i++) {
      last = (await changePasswordRoute(postRequest("/api/account/password", passwordBody("wrong-password-x", "brand-new-password"), { cookie }))).status;
    }
    expect(last).toBe(429);
  });
});

describe("portal route protection (server-side guard)", () => {
  beforeEach(async () => {
    await seedStudentWorld();
    request.cookie = undefined;
  });

  it("with no session, a student page redirects to the student login", async () => {
    await expect(requirePortalUser("STUDENT")).rejects.toThrow("REDIRECT /login?role=student");
  });

  it("with an expired session cookie, it redirects with the expired notice", async () => {
    request.cookie = "not-a-real-token";
    await expect(requirePortalUser("STUDENT")).rejects.toThrow("REDIRECT /login?role=student&reason=expired");
  });

  it("an admin or instructor session is sent to their own portal, not the student one", async () => {
    request.cookie = (await sessionCookie("ADMIN-1")).replace("riona_session=", "");
    await expect(requirePortalUser("STUDENT")).rejects.toThrow("REDIRECT /portal/admin");

    request.cookie = (await sessionCookie("INS-1")).replace("riona_session=", "");
    await expect(requirePortalUser("STUDENT")).rejects.toThrow("REDIRECT /portal/instructor");
  });

  it("a student session passes the guard and returns the signed-in user", async () => {
    request.cookie = (await sessionCookie("STU-A")).replace("riona_session=", "");
    await expect(requirePortalUser("STUDENT")).resolves.toMatchObject({ userId: "STU-A", role: "STUDENT" });
  });

  it("a deactivated student loses access immediately", async () => {
    request.cookie = (await sessionCookie("STU-A")).replace("riona_session=", "");
    await prisma.user.update({ where: { userId: "STU-A" }, data: { status: "INACTIVE" } });
    await expect(requirePortalUser("STUDENT")).rejects.toThrow("REDIRECT /login?role=student&reason=expired");
  });
});
