/**
 * Creates the administrator and one vehicle for the maintenance browser spec, and prints two lines: the vehicle ID and an
 * administrator session token. Refuses any database except the approved test targets (see tests/test-target.ts).
 * Run by e2e/maintenance-admin.spec.ts after the packages are seeded. Prints nothing else.
 *
 * The app modules are loaded inside main(), after the guard and after both connection variables are set, because the
 * Prisma client reads DATABASE_URL when its module is first loaded.
 */
import { isApprovedTestUrl } from "./test-target";

async function main() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !isApprovedTestUrl(new URL(url))) {
    throw new Error("Refusing to seed: TEST_DATABASE_URL is not an approved test database.");
  }
  process.env.DATABASE_URL = url;
  process.env.DIRECT_URL = url;

  const { prisma } = await import("@/lib/prisma");
  const { createSession } = await import("@/lib/auth/session");
  const { VehicleStatus, UserRole } = await import("@/generated/prisma/enums");
  const { createAccount } = await import("./helpers");

  // Unique per run, so a second run in the same database does not collide with the first.
  const suffix = Date.now().toString(36);
  const adminId = `ADMIN-MAINT-${suffix}`;
  await createAccount({ userId: adminId, email: `admin-maint-${suffix}@riona.test`, role: UserRole.ADMIN });
  const vehicle = await prisma.vehicle.create({
    data: { registrationNumber: `MNT-E2E-${suffix}`, vehicleType: "CAR", status: VehicleStatus.ACTIVE },
    select: { id: true, registrationNumber: true },
  });
  const { token } = await createSession(adminId);
  // A student account, for the protected-access check. Its session is printed so the spec can use it.
  const studentId = `STU-MAINT-${suffix}`;
  await createAccount({ userId: studentId, email: `stu-maint-${suffix}@riona.test`, role: UserRole.STUDENT });
  const { token: studentToken } = await createSession(studentId);
  process.stdout.write(`${vehicle.id}\n${token}\n${studentToken}\n${vehicle.registrationNumber}\n`);
  await prisma.$disconnect();
}

void main();
