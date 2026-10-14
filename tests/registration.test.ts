import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/registration/route";
import { verifyPassword } from "@/lib/auth/password";
import { resetRateLimits } from "@/lib/auth/rate-limit";
import { prisma } from "@/lib/prisma";
import { packageGroups, isPerSession } from "@/data/packages";
import { generateReferenceNumber } from "@/lib/registration/submit";
import { postRequest, resetDatabase } from "./helpers";

const PASSWORD = "correct-horse-battery";
const PACKAGE_ID = "regular-car-van";
const INACTIVE_PACKAGE_ID = "retired-package";

async function resetRegistrationTables() {
  await resetDatabase();
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "RegistrationRequest" CASCADE');
}

async function seedPackages() {
  await prisma.trainingPackage.create({
    data: { id: PACKAGE_ID, name: "Car and Van Training", packageType: "REGULAR", price: 26000, isActive: true },
  });
  await prisma.trainingPackage.create({
    data: { id: INACTIVE_PACKAGE_ID, name: "Retired package", packageType: "REGULAR", price: 1000, isActive: false },
  });
  // The four per-session rows, copied from the static list so the tests use the same IDs as the app.
  for (const option of packageGroups.flatMap((group) => group.options).filter(isPerSession)) {
    await prisma.trainingPackage.create({
      data: {
        id: option.id,
        name: option.name,
        packageType: "DAILY",
        price: option.price,
        sessionDurationMinutes: option.detail?.includes("60") ? 60 : 30,
        isActive: true,
      },
    });
  }
}

const DAILY_IDS = packageGroups
  .flatMap((group) => group.options)
  .filter(isPerSession)
  .map((option) => option.id);

const PER_SESSION_MESSAGE = "This package is charged per session. Contact the school to register for it.";

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    fullName: "Nimal Perera",
    birthday: "2000-05-10",
    nicNumber: "200012345678",
    phoneNumber: "0771234567",
    email: "Nimal.Perera@Example.com",
    password: PASSWORD,
    address: "No. 12, Main Street, Colombo 03",
    packageId: PACKAGE_ID,
    additionalNote: "Weekend lessons preferred",
    ...overrides,
  };
}

async function submit(body: unknown, options?: Parameters<typeof postRequest>[2]) {
  const response = await POST(postRequest("/api/registration", body, options));
  const data = (await response.json()) as Record<string, unknown>;
  return { response, data };
}

describe("public student registration", () => {
  beforeEach(async () => {
    await resetRegistrationTables();
    await seedPackages();
    resetRateLimits();
  });

  describe("successful submission", () => {
    it("creates one PENDING request with normalised fields and returns a reference", async () => {
      const { response, data } = await submit(validBody());

      expect(response.status).toBe(201);
      expect(data.referenceNumber).toMatch(/^RDS-[0-9A-F]{10}$/);

      const rows = await prisma.registrationRequest.findMany();
      expect(rows).toHaveLength(1);
      const row = rows[0]!;
      expect(row.status).toBe("PENDING");
      expect(row.referenceNumber).toBe(data.referenceNumber);
      expect(row.email).toBe("nimal.perera@example.com");
      expect(row.fullName).toBe("Nimal Perera");
      expect(row.selectedPackageId).toBe(PACKAGE_ID);
      expect(row.additionalNote).toBe("Weekend lessons preferred");
      expect(row.reviewedAt).toBeNull();
      expect(row.approvedStudentUserId).toBeNull();
    });

    it("normalises NIC and phone number before storing them", async () => {
      await submit(validBody({ nicNumber: " 123456789v ", phoneNumber: "077 123 4567" }));

      const row = await prisma.registrationRequest.findFirstOrThrow();
      expect(row.nicNumber).toBe("123456789V");
      expect(row.phoneNumber).toBe("0771234567");
    });

    it("ignores any price or status sent by the client and uses the database price", async () => {
      const { response } = await submit(validBody({ price: 1, packagePriceAtSubmission: 1, status: "APPROVED" }));

      expect(response.status).toBe(201);
      const row = await prisma.registrationRequest.findFirstOrThrow();
      expect(row.packagePriceAtSubmission.toString()).toBe("26000");
      expect(row.status).toBe("PENDING");
    });

    it("hashes the password with Argon2id and never stores or returns it in plain text", async () => {
      const { data } = await submit(validBody());

      const row = await prisma.registrationRequest.findFirstOrThrow();
      expect(row.passwordHash).toMatch(/^\$argon2id\$/);
      expect(row.passwordHash).not.toContain(PASSWORD);
      expect(await verifyPassword(row.passwordHash, PASSWORD)).toBe(true);

      const text = JSON.stringify(data);
      expect(text).not.toContain(PASSWORD);
      expect(text).not.toContain("argon2");
    });

    it("creates no User, StudentProfile or Enrollment records", async () => {
      await submit(validBody());

      expect(await prisma.user.count()).toBe(0);
      expect(await prisma.studentProfile.count()).toBe(0);
      expect(await prisma.enrollment.count()).toBe(0);
      expect(await prisma.payment.count()).toBe(0);
    });
  });

  describe("validation", () => {
    it("returns field messages for every missing or invalid field", async () => {
      const { response, data } = await submit({});

      expect(response.status).toBe(422);
      const fields = data.fields as Record<string, string>;
      expect(Object.keys(fields).sort()).toEqual(
        ["address", "birthday", "email", "fullName", "nicNumber", "packageId", "password", "phoneNumber"].sort(),
      );
      expect(await prisma.registrationRequest.count()).toBe(0);
    });

    it.each([
      ["invalid NIC", { nicNumber: "12345" }, "nicNumber"],
      ["invalid mobile number", { phoneNumber: "12345" }, "phoneNumber"],
      ["invalid email", { email: "not-an-email" }, "email"],
      ["impossible date", { birthday: "2000-02-31" }, "birthday"],
      ["future birthday", { birthday: "2999-01-01" }, "birthday"],
      ["short password", { password: "short" }, "password"],
      ["short address", { address: "Hi" }, "address"],
      ["over-long note", { additionalNote: "x".repeat(1001) }, "additionalNote"],
    ])("rejects %s", async (_label, override, field) => {
      const { response, data } = await submit(validBody(override));

      expect(response.status).toBe(422);
      expect((data.fields as Record<string, string>)[field]).toBeTruthy();
      expect(await prisma.registrationRequest.count()).toBe(0);
    });

    it("rejects a non-object body", async () => {
      const { response, data } = await submit("not json at all");

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid request.");
    });
  });

  describe("package checks", () => {
    it("rejects an unknown package id", async () => {
      const { response, data } = await submit(validBody({ packageId: "does-not-exist" }));

      expect(response.status).toBe(422);
      expect((data.fields as Record<string, string>).packageId).toBe("Select an available training package.");
      expect(await prisma.registrationRequest.count()).toBe(0);
    });

    it("rejects an inactive package", async () => {
      const { response } = await submit(validBody({ packageId: INACTIVE_PACKAGE_ID }));

      expect(response.status).toBe(422);
      expect(await prisma.registrationRequest.count()).toBe(0);
    });

    it("rejects a missing package id", async () => {
      const { response, data } = await submit(validBody({ packageId: "" }));

      expect(response.status).toBe(422);
      expect((data.fields as Record<string, string>).packageId).toBeTruthy();
    });
  });

  describe("per-session (daily) packages", () => {
    it("has the four daily packages from the static list", () => {
      expect(DAILY_IDS.sort()).toEqual(["daily-car", "daily-motorcycle", "daily-three-wheeler", "daily-van"]);
    });

    it.each(["daily-car", "daily-van", "daily-motorcycle", "daily-three-wheeler"])(
      "refuses %s with a 422 and creates no records",
      async (packageId) => {
        const { response, data } = await submit(validBody({ packageId }));

        expect(response.status).toBe(422);
        expect((data.fields as Record<string, string>).packageId).toBe(PER_SESSION_MESSAGE);
        expect(await prisma.registrationRequest.count()).toBe(0);
        expect(await prisma.user.count()).toBe(0);
        expect(await prisma.studentProfile.count()).toBe(0);
        expect(await prisma.enrollment.count()).toBe(0);
        expect(await prisma.payment.count()).toBe(0);
      },
    );

    it("leaves the daily rates unchanged after refused attempts", async () => {
      await submit(validBody({ packageId: "daily-car" }));

      const car = await prisma.trainingPackage.findUniqueOrThrow({ where: { id: "daily-car" } });
      const motorcycle = await prisma.trainingPackage.findUniqueOrThrow({ where: { id: "daily-motorcycle" } });
      expect(car.price.toString()).toBe("2000");
      expect(car.sessionDurationMinutes).toBe(30);
      expect(motorcycle.price.toString()).toBe("1000");
      expect(motorcycle.sessionDurationMinutes).toBe(60);
    });

    it("refuses a daily package even when the client sends a fee, total or session count", async () => {
      const { response, data } = await submit(
        validBody({
          packageId: "daily-van",
          price: 1,
          packagePriceAtSubmission: 1,
          totalFee: 1,
          sessionCount: 10,
          sessionRate: 1,
        }),
      );

      expect(response.status).toBe(422);
      expect((data.fields as Record<string, string>).packageId).toBe(PER_SESSION_MESSAGE);
      expect(await prisma.registrationRequest.count()).toBe(0);
    });

    it.each([
      ["a non-numeric session count", "abc"],
      ["a negative session count", -1],
      ["a zero session count", 0],
      ["a fractional session count", 1.5],
      ["an absurdly large session count", 1e9],
      ["a null session count", null],
    ])("ignores %s on a fixed-fee package and stores the database fee only", async (_label, sessionCount) => {
      const { response } = await submit(validBody({ sessionCount }));

      expect(response.status).toBe(201);
      const row = await prisma.registrationRequest.findFirstOrThrow();
      expect(row.packagePriceAtSubmission.toString()).toBe("26000");
    });

    it("keeps fixed-fee registration unchanged next to the per-session rule", async () => {
      const { response } = await submit(validBody({ packageId: PACKAGE_ID }));

      expect(response.status).toBe(201);
      const row = await prisma.registrationRequest.findFirstOrThrow();
      expect(row.selectedPackageId).toBe(PACKAGE_ID);
      expect(row.packagePriceAtSubmission.toString()).toBe("26000");
    });
  });

  describe("references and concurrency", () => {
    it("generates collision-resistant references", () => {
      const seen = new Set<string>();
      for (let i = 0; i < 1000; i += 1) seen.add(generateReferenceNumber());
      expect(seen.size).toBe(1000);
      for (const reference of seen) expect(reference).toMatch(/^RDS-[0-9A-F]{10}$/);
    });

    it("gives each concurrent submission its own reference and its own row", async () => {
      const results = await Promise.all(
        Array.from({ length: 5 }, (_, index) => submit(validBody({ nicNumber: `20001234567${index}` }))),
      );

      expect(results.every((result) => result.response.status === 201)).toBe(true);
      const references = results.map((result) => result.data.referenceNumber);
      expect(new Set(references).size).toBe(5);
      expect(await prisma.registrationRequest.count()).toBe(5);
    });

    it("records each identical concurrent submission as a separate application", async () => {
      // No duplicate rule has been approved yet, so identical applications are stored separately.
      // The school should decide the rule before this is tightened. See the final report.
      const results = await Promise.all(Array.from({ length: 3 }, () => submit(validBody())));

      expect(results.every((result) => result.response.status === 201)).toBe(true);
      expect(await prisma.registrationRequest.count()).toBe(3);
    });
  });

  describe("rate limiting and origin checks", () => {
    it("allows 10 submissions per connection per hour, then returns 429 with Retry-After", async () => {
      const headers = { "x-forwarded-for": "203.0.113.7" };
      const statuses: number[] = [];
      for (let i = 0; i < 10; i += 1) {
        const response = await POST(
          new Request("http://localhost:3000/api/registration", {
            method: "POST",
            headers: { "content-type": "application/json", origin: "http://localhost:3000", ...headers },
            body: JSON.stringify(validBody({ nicNumber: `20001234567${i}` })),
          }),
        );
        statuses.push(response.status);
      }
      expect(statuses.every((status) => status === 201)).toBe(true);

      const blocked = await POST(
        new Request("http://localhost:3000/api/registration", {
          method: "POST",
          headers: { "content-type": "application/json", origin: "http://localhost:3000", ...headers },
          body: JSON.stringify(validBody({ nicNumber: "200012345699" })),
        }),
      );
      expect(blocked.status).toBe(429);
      expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
      expect(await prisma.registrationRequest.count()).toBe(10);
    });

    it("rejects a request from another origin before reading the body", async () => {
      const { response } = await submit(validBody(), { origin: "https://evil.example" });

      expect(response.status).toBe(403);
      expect(await prisma.registrationRequest.count()).toBe(0);
    });
  });

  describe("safe error responses", () => {
    it("never returns Prisma or database details in an error", async () => {
      const { response, data } = await submit(validBody({ packageId: "x".repeat(200) }));

      expect(response.status).toBe(422);
      const text = JSON.stringify(data);
      expect(text).not.toMatch(/prisma|postgres|constraint|P2\d{3}/i);
    });
  });
});
