import { beforeEach, describe, expect, it } from "vitest";
import { AccountStatus, UserRole } from "@/generated/prisma/enums";
import { PUT as updateProfile } from "@/app/api/instructor/profile/route";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getInstructorAccount } from "@/lib/instructor/profile";
import { createAccount } from "./helpers";
import { seedStudentWorld } from "./student-fixtures";

async function cookieFor(userId: string) {
  const { token } = await createSession(userId);
  return `riona_session=${token}`;
}

function put(body: unknown, cookie?: string, origin?: string | null) {
  return updateProfile(
    new Request("http://localhost:3000/api/instructor/profile", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
        ...(origin === null ? {} : { origin: origin ?? "http://localhost:3000" }),
      },
      body: JSON.stringify(body),
    }),
  );
}

describe("instructor profile", () => {
  beforeEach(async () => {
    await seedStudentWorld();
    await createAccount({ userId: "INS-2", email: "ins2@riona.test", role: UserRole.INSTRUCTOR });
  });

  it("updates only the signed-in instructor's mobile number", async () => {
    const otherBefore = (await prisma.instructorProfile.findUnique({ where: { userId: "INS-2" } }))?.phoneNumber;
    const cookie = await cookieFor("INS-1");
    const response = await put({ phoneNumber: "071 234 5678" }, cookie);
    expect(response.status).toBe(200);

    expect((await prisma.instructorProfile.findUnique({ where: { userId: "INS-1" } }))?.phoneNumber).toBe("0712345678");
    expect((await prisma.instructorProfile.findUnique({ where: { userId: "INS-2" } }))?.phoneNumber).toBe(otherBefore);
  });

  it("refuses protected fields in the request body", async () => {
    const cookie = await cookieFor("INS-1");
    const response = await put({ phoneNumber: "0712345678", status: AccountStatus.INACTIVE }, cookie);
    expect(response.status).toBe(400);
    expect((await prisma.instructorProfile.findUnique({ where: { userId: "INS-1" } }))?.status).toBe(AccountStatus.ACTIVE);
  });

  it("rejects an invalid mobile number and leaves the stored value unchanged", async () => {
    const before = (await prisma.instructorProfile.findUnique({ where: { userId: "INS-1" } }))?.phoneNumber;
    const cookie = await cookieFor("INS-1");
    expect((await put({ phoneNumber: "1712345678" }, cookie)).status).toBe(400);
    expect((await prisma.instructorProfile.findUnique({ where: { userId: "INS-1" } }))?.phoneNumber).toBe(before);
  });

  it("rejects students, anonymous callers and cross-origin requests", async () => {
    expect((await put({ phoneNumber: "0712345678" }, await cookieFor("STU-A"))).status).toBe(403);
    expect((await put({ phoneNumber: "0712345678" })).status).toBe(401);
    expect((await put({ phoneNumber: "0712345678" }, await cookieFor("INS-1"), "https://evil.example")).status).toBe(403);
  });

  it("returns only the account fields, never a password hash", async () => {
    const account = await getInstructorAccount("INS-1");
    expect(Object.keys(account).sort()).toEqual(["email", "fullName", "hireDate", "instructorId", "phoneNumber", "status"]);
  });
});
