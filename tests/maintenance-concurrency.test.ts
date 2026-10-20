// Database-backed. Insurance overlap under concurrent writes: the vehicle row lock must let exactly one overlapping period in.
// Runs only on the guarded disposable target (see tests/setup.ts). Resets the test tables first.
import { beforeAll, describe, expect, it } from "vitest";
import { UserRole, VehicleStatus } from "@/generated/prisma/enums";
import { AuthError } from "@/lib/auth/http";
import { prisma } from "@/lib/prisma";
import { createInsurancePolicy } from "@/lib/vehicles/maintenance-data";
import { parseInsuranceInput } from "@/lib/vehicles/maintenance-input";
import { createAccount, resetDatabase } from "./helpers";

const ADMIN = "ADMIN-CONC";
let vehicleId = "";

function period(policyNumber: string, startsOn: string, expiresOn: string) {
  const parsed = parseInsuranceInput({ insurer: "Fixture", policyNumber, coverage: "Comprehensive", startsOn, expiresOn, premium: 1000 });
  if (!parsed.ok) throw new Error(parsed.message);
  return parsed.value;
}

beforeAll(async () => {
  await resetDatabase();
  await createAccount({ userId: ADMIN, email: "admin-conc@riona.test", role: UserRole.ADMIN });
  const vehicle = await prisma.vehicle.create({ data: { registrationNumber: "CONC-0001", vehicleType: "CAR", status: VehicleStatus.ACTIVE }, select: { id: true } });
  vehicleId = vehicle.id;
});

describe("insurance overlap under concurrency", () => {
  it("lets exactly one of eight overlapping concurrent periods in, and refuses the others as overlaps", async () => {
    const attempts = Array.from({ length: 8 }, (_, i) => period(`CONC-${i}`, "2027-01-01", "2027-12-31"));
    const results = await Promise.allSettled(attempts.map((input) => createInsurancePolicy(vehicleId, ADMIN, input)));

    const accepted = results.filter((r) => r.status === "fulfilled");
    const refused = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(accepted).toHaveLength(1);
    expect(refused).toHaveLength(7);
    for (const failure of refused) {
      expect(failure.reason).toBeInstanceOf(AuthError);
      expect((failure.reason as AuthError).status).toBe(422);
      expect((failure.reason as AuthError).message).toMatch(/overlaps an insurance period/);
    }
    expect(await prisma.vehicleInsurancePolicy.count({ where: { vehicleId, startsOn: new Date("2027-01-01T00:00:00.000Z") } })).toBe(1);
  });

  it("accepts six non-overlapping periods written concurrently, one per year", async () => {
    const vehicleTwo = await prisma.vehicle.create({ data: { registrationNumber: "CONC-0002", vehicleType: "VAN", status: VehicleStatus.ACTIVE }, select: { id: true } });
    const attempts = Array.from({ length: 6 }, (_, i) => period(`YEAR-${i}`, `${2030 + i}-01-01`, `${2030 + i}-12-31`));
    const results = await Promise.allSettled(attempts.map((input) => createInsurancePolicy(vehicleTwo.id, ADMIN, input)));
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    expect(await prisma.vehicleInsurancePolicy.count({ where: { vehicleId: vehicleTwo.id } })).toBe(6);
  });
});
