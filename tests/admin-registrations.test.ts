import { beforeEach, describe, expect, it } from "vitest";
import { UserRole } from "@/generated/prisma/enums";
import { GET as listRoute } from "@/app/api/admin/registrations/route";
import { GET as detailRoute } from "@/app/api/admin/registrations/[id]/route";
import { POST as approveRoute } from "@/app/api/admin/registrations/[id]/approve/route";
import { POST as rejectRoute } from "@/app/api/admin/registrations/[id]/reject/route";
import { POST as studentLogin } from "@/app/api/auth/student/login/route";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { resetRateLimits } from "@/lib/auth/rate-limit";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { generateReferenceNumber } from "@/lib/registration/submit";
import { createAccount, getRequest, postRequest, resetDatabase } from "./helpers";

const APPLICANT_PASSWORD = "applicant-chooses-this-1";
const REGULAR_ID = "regular-car-van";
const DAILY_ID = "daily-car";

async function cookieFor(userId: string) {
  const { token } = await createSession(userId);
  return `riona_session=${token}`;
}

async function seedPackages() {
  await prisma.trainingPackage.create({
    data: { id: REGULAR_ID, name: "Car and Van Training", packageType: "REGULAR", price: 26000, durationDays: 15, isActive: true },
  });
  await prisma.trainingPackage.create({
    data: { id: DAILY_ID, name: "Car Daily Training", packageType: "DAILY", price: 2000, sessionDurationMinutes: 30, isActive: true },
  });
}

async function createPending(overrides: Partial<{ email: string; nicNumber: string; selectedPackageId: string }> = {}) {
  return prisma.registrationRequest.create({
    data: {
      referenceNumber: generateReferenceNumber(),
      fullName: "Nimal Perera",
      birthday: new Date("2000-05-10"),
      nicNumber: overrides.nicNumber ?? "200012345678",
      phoneNumber: "0771234567",
      address: "No. 12, Main Street, Colombo 03",
      email: overrides.email ?? "nimal.perera@example.com",
      passwordHash: await hashPassword(APPLICANT_PASSWORD),
      selectedPackageId: overrides.selectedPackageId ?? REGULAR_ID,
      packagePriceAtSubmission: overrides.selectedPackageId === DAILY_ID ? 2000 : 26000,
    },
  });
}

/** Calls the approve handler for one application, as the route would receive it. */
function approve(id: string, cookie?: string, origin?: string | null) {
  return approveRoute(postRequest(`/api/admin/registrations/${id}/approve`, {}, { cookie, origin }), {
    params: Promise.resolve({ id }),
  });
}

function reject(id: string, body: unknown, cookie?: string, origin?: string | null) {
  return rejectRoute(postRequest(`/api/admin/registrations/${id}/reject`, body, { cookie, origin }), {
    params: Promise.resolve({ id }),
  });
}

function detail(id: string, cookie?: string) {
  return detailRoute(getRequest(`/api/admin/registrations/${id}`, cookie), { params: Promise.resolve({ id }) });
}

describe("admin registration review", () => {
  beforeEach(async () => {
    await resetDatabase();
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "RegistrationRequest" CASCADE');
    resetRateLimits();
    await createAccount({ userId: "ADMIN-001", email: "admin@riona.lk", role: UserRole.ADMIN });
    await createAccount({ userId: "STU-001", email: "existing-student@riona.lk", role: UserRole.STUDENT });
    await createAccount({ userId: "INS-001", email: "instructor@riona.lk", role: UserRole.INSTRUCTOR });
    await seedPackages();
  });

  describe("authorization", () => {
    it("refuses anonymous requests on every route with 401", async () => {
      const pending = await createPending();
      expect((await listRoute(getRequest("/api/admin/registrations"))).status).toBe(401);
      expect((await detail(pending.id)).status).toBe(401);
      expect((await approve(pending.id)).status).toBe(401);
      expect((await reject(pending.id, { reason: "Documents do not match" })).status).toBe(401);
    });

    it("refuses students and instructors on every route with 403, and changes nothing", async () => {
      const pending = await createPending();
      for (const userId of ["STU-001", "INS-001"]) {
        const cookie = await cookieFor(userId);
        expect((await listRoute(getRequest("/api/admin/registrations", cookie))).status).toBe(403);
        expect((await detail(pending.id, cookie)).status).toBe(403);
        expect((await approve(pending.id, cookie)).status).toBe(403);
        expect((await reject(pending.id, { reason: "Documents do not match" }, cookie)).status).toBe(403);
      }
      expect((await prisma.registrationRequest.findUniqueOrThrow({ where: { id: pending.id } })).status).toBe("PENDING");
      expect(await prisma.enrollment.count()).toBe(0);
    });

    it("refuses a cross-site approval even from an admin (403) and creates no account", async () => {
      const pending = await createPending();
      const response = await approve(pending.id, await cookieFor("ADMIN-001"), "https://evil.example");
      expect(response.status).toBe(403);
      expect(await prisma.user.findUnique({ where: { email: pending.email } })).toBeNull();
    });
  });

  describe("reading applications", () => {
    it("lists pending applications by default, without the password hash", async () => {
      await createPending({ email: "a@example.com", nicNumber: "200000000001" });
      const approved = await createPending({ email: "b@example.com", nicNumber: "200000000002" });
      await prisma.registrationRequest.update({
        where: { id: approved.id },
        data: { status: "REJECTED", reviewedAt: new Date(), reviewedByUserId: "ADMIN-001", rejectionReason: "Documents do not match" },
      });

      const response = await listRoute(getRequest("/api/admin/registrations", await cookieFor("ADMIN-001")));
      const body = (await response.json()) as { registrations: { email: string }[] };
      expect(response.status).toBe(200);
      expect(body.registrations.map((r) => r.email)).toEqual(["a@example.com"]);
      expect(JSON.stringify(body)).not.toContain("passwordHash");
    });

    it("returns 400 for an unknown status filter", async () => {
      const response = await listRoute(getRequest("/api/admin/registrations?status=DELETED", await cookieFor("ADMIN-001")));
      expect(response.status).toBe(400);
    });

    it("returns the detail without the password hash, and 404 for unknown or malformed IDs", async () => {
      const pending = await createPending();
      const cookie = await cookieFor("ADMIN-001");
      const response = await detail(pending.id, cookie);
      const body = (await response.json()) as { registration: Record<string, unknown> };
      expect(response.status).toBe(200);
      expect(body.registration.referenceNumber).toBe(pending.referenceNumber);
      expect("passwordHash" in body.registration).toBe(false);

      expect((await detail("does-not-exist", cookie)).status).toBe(404);
      expect((await detail("../../etc", cookie)).status).toBe(404);
    });
  });

  describe("approval", () => {
    it("creates the student account, profile and enrollment, and links the application", async () => {
      const pending = await createPending();
      const response = await approve(pending.id, await cookieFor("ADMIN-001"));
      const body = (await response.json()) as { userId: string; enrollmentId: string };

      expect(response.status).toBe(200);
      // STU-001 already exists, so the next student ID is STU-002.
      expect(body.userId).toBe("STU-002");

      const user = await prisma.user.findUniqueOrThrow({ where: { userId: "STU-002" } });
      expect(user.role).toBe(UserRole.STUDENT);
      expect(user.email).toBe(pending.email);
      // The applicant's own password keeps working. Nothing else is stored.
      expect(await verifyPassword(user.passwordHash, APPLICANT_PASSWORD)).toBe(true);

      const profile = await prisma.studentProfile.findUniqueOrThrow({ where: { userId: "STU-002" } });
      expect(profile.nicNumber).toBe(pending.nicNumber);

      const enrollment = await prisma.enrollment.findUniqueOrThrow({ where: { id: body.enrollmentId } });
      expect(enrollment.studentUserId).toBe("STU-002");
      expect(enrollment.registrationRequestId).toBe(pending.id);
      expect(Number(enrollment.agreedPrice)).toBe(26000);
      expect(Number(enrollment.finalFee)).toBe(26000);

      const reviewed = await prisma.registrationRequest.findUniqueOrThrow({ where: { id: pending.id } });
      expect(reviewed.status).toBe("APPROVED");
      expect(reviewed.approvedStudentUserId).toBe("STU-002");
      expect(reviewed.reviewedByUserId).toBe("ADMIN-001");
      expect(reviewed.reviewedAt).not.toBeNull();

      // No payment is recorded at approval.
      expect(await prisma.payment.count()).toBe(0);
    });

    it("lets the approved applicant sign in with the password chosen at signup", async () => {
      const pending = await createPending();
      await approve(pending.id, await cookieFor("ADMIN-001"));

      const login = await studentLogin(
        postRequest("/api/auth/student/login", { identifier: "STU-002", password: APPLICANT_PASSWORD }),
      );
      expect(login.status).toBe(200);
    });

    it("copies the training requirements from the package", async () => {
      await prisma.trainingPackageItem.create({
        data: { packageId: REGULAR_ID, vehicleType: "CAR", trainingType: "REGULAR", requiredSessions: 20 },
      });
      const pending = await createPending();
      const response = await approve(pending.id, await cookieFor("ADMIN-001"));
      const body = (await response.json()) as { enrollmentId: string };

      const requirements = await prisma.enrollmentTrainingRequirement.findMany({ where: { enrollmentId: body.enrollmentId } });
      expect(requirements).toHaveLength(1);
      expect(requirements[0]).toMatchObject({ vehicleType: "CAR", trainingType: "REGULAR", requiredSessions: 20 });
    });

    it("refuses a package with no session count yet, and creates nothing", async () => {
      await prisma.trainingPackageItem.create({
        data: { packageId: REGULAR_ID, vehicleType: "CAR", trainingType: "REGULAR", requiredSessions: null },
      });
      const pending = await createPending();
      const response = await approve(pending.id, await cookieFor("ADMIN-001"));

      expect(response.status).toBe(422);
      expect(await prisma.user.count({ where: { role: UserRole.STUDENT } })).toBe(1);
      expect(await prisma.enrollment.count()).toBe(0);
      expect((await prisma.registrationRequest.findUniqueOrThrow({ where: { id: pending.id } })).status).toBe("PENDING");
    });

    it("refuses a second approval of the same application with 409, with no duplicate records", async () => {
      const pending = await createPending();
      const cookie = await cookieFor("ADMIN-001");
      expect((await approve(pending.id, cookie)).status).toBe(200);

      const again = await approve(pending.id, cookie);
      expect(again.status).toBe(409);
      expect(await prisma.user.count({ where: { role: UserRole.STUDENT } })).toBe(2);
      expect(await prisma.enrollment.count()).toBe(1);
    });

    it("lets only one of two concurrent approvals succeed", async () => {
      const pending = await createPending();
      const cookie = await cookieFor("ADMIN-001");
      const responses = await Promise.all([approve(pending.id, cookie), approve(pending.id, cookie)]);

      expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
      expect(await prisma.user.count({ where: { role: UserRole.STUDENT } })).toBe(2);
      expect(await prisma.enrollment.count()).toBe(1);
    });

    it("refuses a per-session daily package with 422, before creating anything", async () => {
      const pending = await createPending({ selectedPackageId: DAILY_ID, email: "daily@example.com" });
      const response = await approve(pending.id, await cookieFor("ADMIN-001"));

      expect(response.status).toBe(422);
      expect(await prisma.user.findUnique({ where: { email: "daily@example.com" } })).toBeNull();
      expect(await prisma.enrollment.count()).toBe(0);
      expect((await prisma.registrationRequest.findUniqueOrThrow({ where: { id: pending.id } })).status).toBe("PENDING");
    });

    it("refuses approval when the package was deactivated after submission, and creates nothing", async () => {
      const pending = await createPending({ email: "retired-package@example.com" });
      await prisma.trainingPackage.update({ where: { id: REGULAR_ID }, data: { isActive: false } });

      const response = await approve(pending.id, await cookieFor("ADMIN-001"));

      expect(response.status).toBe(422);
      expect(await prisma.user.findUnique({ where: { email: "retired-package@example.com" } })).toBeNull();
      expect(await prisma.studentProfile.count()).toBe(1);
      expect(await prisma.enrollment.count()).toBe(0);
      expect((await prisma.registrationRequest.findUniqueOrThrow({ where: { id: pending.id } })).status).toBe("PENDING");
    });

    it("refuses an email that already has an account, without merging", async () => {
      const pending = await createPending({ email: "existing-student@riona.lk" });
      const response = await approve(pending.id, await cookieFor("ADMIN-001"));

      expect(response.status).toBe(409);
      const existing = await prisma.user.findUniqueOrThrow({ where: { email: "existing-student@riona.lk" } });
      expect(existing.userId).toBe("STU-001");
      expect(await prisma.enrollment.count()).toBe(0);
      expect((await prisma.registrationRequest.findUniqueOrThrow({ where: { id: pending.id } })).status).toBe("PENDING");
    });

    it("refuses a NIC that already has a student profile, without merging", async () => {
      const pending = await createPending({ nicNumber: "NIC-STU-001", email: "new@example.com" });
      const response = await approve(pending.id, await cookieFor("ADMIN-001"));

      expect(response.status).toBe(409);
      expect(await prisma.user.findUnique({ where: { email: "new@example.com" } })).toBeNull();
      expect(await prisma.enrollment.count()).toBe(0);
    });
  });

  describe("rejection", () => {
    it("rejects a pending application with a reason and creates no account", async () => {
      const pending = await createPending();
      const response = await reject(pending.id, { reason: "  Documents do not match the NIC  " }, await cookieFor("ADMIN-001"));

      expect(response.status).toBe(200);
      const rejected = await prisma.registrationRequest.findUniqueOrThrow({ where: { id: pending.id } });
      expect(rejected.status).toBe("REJECTED");
      expect(rejected.rejectionReason).toBe("Documents do not match the NIC");
      expect(rejected.reviewedByUserId).toBe("ADMIN-001");
      expect(rejected.approvedStudentUserId).toBeNull();
      expect(await prisma.user.findUnique({ where: { email: pending.email } })).toBeNull();
    });

    it("refuses a missing, short or overlong reason with 400", async () => {
      const pending = await createPending();
      const cookie = await cookieFor("ADMIN-001");
      expect((await reject(pending.id, {}, cookie)).status).toBe(400);
      expect((await reject(pending.id, { reason: "too short" }, cookie)).status).toBe(400);
      expect((await reject(pending.id, { reason: "x".repeat(501) }, cookie)).status).toBe(400);
      expect((await prisma.registrationRequest.findUniqueOrThrow({ where: { id: pending.id } })).status).toBe("PENDING");
    });

    it("refuses to reject an application that was already reviewed, and blocks approval afterwards", async () => {
      const pending = await createPending();
      const cookie = await cookieFor("ADMIN-001");
      expect((await reject(pending.id, { reason: "Documents do not match" }, cookie)).status).toBe(200);

      expect((await reject(pending.id, { reason: "Changed my mind again" }, cookie)).status).toBe(409);
      expect((await approve(pending.id, cookie)).status).toBe(409);
      expect(await prisma.enrollment.count()).toBe(0);
    });

    it("allows rejecting a per-session application", async () => {
      const pending = await createPending({ selectedPackageId: DAILY_ID, email: "daily2@example.com" });
      const response = await reject(pending.id, { reason: "Not offered online yet" }, await cookieFor("ADMIN-001"));
      expect(response.status).toBe(200);
    });
  });
});
