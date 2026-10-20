// Fixtures for the database-backed session-count tests. Nothing here truncates, resets or seeds a shared table.
// Every row this module creates is recorded by its exact primary key, and cleanup deletes only those keys, in an
// order that respects the foreign keys. A cleanup step that fails stops the run at once, with the exact IDs; nothing
// else is deleted, and no untracked row is ever removed.
import { randomBytes } from "node:crypto";
import { AccountStatus, PackageType, TrainingType, UserRole, VehicleType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/** Real packages on the branch. Read-only for these tests: they are never created, edited or deleted here. */
export const REAL_REGULAR_PACKAGE = "regular-car";
export const REAL_TRIAL_PACKAGE = "trial-car-motorcycle";
const REAL_PACKAGES = [REAL_REGULAR_PACKAGE, REAL_TRIAL_PACKAGE];

export type Tracked = {
  runId: string;
  userIds: string[];
  studentUserIds: string[];
  packageIds: string[];
  packageItemIds: string[];
  registrationIds: string[];
  referenceNumbers: string[];
  selectionIds: string[];
  enrollmentIds: string[];
  requirementIds: string[];
  paymentIds: string[];
  instructorUserIds: string[];
  priceChangeIds: string[];
};

export type Baseline = Record<string, number>;

export function newTracked(): Tracked {
  return {
    runId: randomBytes(4).toString("hex").toUpperCase(),
    userIds: [],
    studentUserIds: [],
    packageIds: [],
    packageItemIds: [],
    registrationIds: [],
    referenceNumbers: [],
    selectionIds: [],
    enrollmentIds: [],
    requirementIds: [],
    paymentIds: [],
    instructorUserIds: [],
    priceChangeIds: [],
  };
}

/** Text for an error, without a stack or connection details. */
export function errorText(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    return `${(error as { name?: string }).name ?? "Error"} (${String((error as { code?: unknown }).code)})`;
  }
  return error instanceof Error ? error.name : "unknown error";
}

/** Stops the run if the real packages the tests depend on are missing or inactive. Creates nothing. */
export async function assertRealPackagesPresent() {
  for (const id of REAL_PACKAGES) {
    const row = await prisma.trainingPackage.findUnique({ where: { id }, select: { id: true, isActive: true } });
    if (!row || !row.isActive) throw new Error(`Refusing to run: real package ${id} is missing or inactive.`);
  }
}

export async function snapshotPrices() {
  const rows = await prisma.trainingPackage.findMany({
    where: { id: { in: REAL_PACKAGES } },
    select: { id: true, price: true, isActive: true, updatedAt: true },
    orderBy: { id: "asc" },
  });
  return rows.map((r) => ({ id: r.id, price: r.price.toFixed(2), isActive: r.isActive, updatedAt: r.updatedAt.toISOString() }));
}

/** Every item of the two real packages, with the fields the tests read. Compared again after the run. */
export async function snapshotRealItems() {
  const rows = await prisma.trainingPackageItem.findMany({
    where: { packageId: { in: REAL_PACKAGES } },
    select: { id: true, packageId: true, vehicleType: true, trainingType: true, requiredSessions: true, updatedAt: true },
    orderBy: { id: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    packageId: r.packageId,
    vehicleType: r.vehicleType,
    trainingType: r.trainingType,
    requiredSessions: r.requiredSessions,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

/**
 * Compares the real packages and their items with the snapshots taken before the run. Reports a difference; never
 * repairs one. Items are only read, so a difference means something outside these tests changed them.
 */
export async function verifyRealRows(pricesBefore: Awaited<ReturnType<typeof snapshotPrices>>, itemsBefore: Awaited<ReturnType<typeof snapshotRealItems>>) {
  const pricesNow = await snapshotPrices();
  const itemsNow = await snapshotRealItems();
  const problems: string[] = [];
  if (JSON.stringify(pricesNow) !== JSON.stringify(pricesBefore)) problems.push("real package rows changed");
  if (JSON.stringify(itemsNow) !== JSON.stringify(itemsBefore)) problems.push("real package item rows changed");
  if (problems.length > 0) throw new Error(`Real package data differs from the snapshot: ${problems.join("; ")}. Report this before any further run.`);
}

/**
 * Row counts of the tables these tests can touch.
 *
 * LIMITATION: these are counts on a shared table. If another writer changes the same database during the run (a real
 * registration, an admin action, or a second test run), a count can differ from the baseline even though these tests
 * did not write that row. verifyBaseline reports such a difference and never repairs it. Rows that are not tracked in
 * this run are never deleted to make the counts match.
 */
export async function baseline(): Promise<Baseline> {
  const out: Baseline = {};
  out.User = await prisma.user.count();
  out.StudentProfile = await prisma.studentProfile.count();
  out.TrainingPackage = await prisma.trainingPackage.count();
  out.TrainingPackageItem = await prisma.trainingPackageItem.count();
  out.RegistrationRequest = await prisma.registrationRequest.count();
  out.RegistrationSessionSelection = await prisma.registrationSessionSelection.count();
  out.Enrollment = await prisma.enrollment.count();
  out.EnrollmentTrainingRequirement = await prisma.enrollmentTrainingRequirement.count();
  return out;
}

/** Compares the counts after cleanup with the baseline. A difference is reported, not repaired. See the limitation on baseline(). */
export async function verifyBaseline(before: Baseline) {
  const after = await baseline();
  const differences = Object.keys(before).filter((table) => after[table] !== before[table]).map((table) => `${table}: ${before[table]} -> ${after[table]}`);
  if (differences.length > 0) {
    throw new Error(
      `Counts differ from baseline after cleanup: ${differences.join("; ")}. This can be a concurrent write on the shared database, not this run. No untracked row was deleted.`,
    );
  }
  return after;
}

/** An admin account for this run only. Its ID carries the run ID, so it cannot match a real admin. */
export async function createAdminFixture(t: Tracked) {
  const userId = `TSS-ADM-${t.runId}`;
  await prisma.user.create({
    data: { userId, email: `tss-admin-${t.runId.toLowerCase()}@fixture.test`, passwordHash: "fixture-not-used", role: UserRole.ADMIN, status: AccountStatus.ACTIVE },
  });
  t.userIds.push(userId);
  return userId;
}

/**
 * A fixture package with no session rules, so the application's own rules do not apply to it. Used only for legacy-approval
 * tests. By default it is confirmed and its one row has a valid count (7). The options exist so the approval cases can
 * create the refused variants: an unconfirmed package, or a null count.
 */
export async function createLegacyPackageFixture(
  t: Tracked,
  options: { confirmed?: boolean; requiredSessions?: number | null; withItem?: boolean } = {},
) {
  // One ID per call, so a run can create several legacy packages. Each ID carries the run ID, so it cannot match a real package.
  const id = `TSS-PKG-${t.runId}-${t.packageIds.length}`;
  const confirmed = options.confirmed ?? true;
  const requiredSessions = options.requiredSessions === undefined ? 7 : options.requiredSessions;
  const withItem = options.withItem ?? true;
  await prisma.trainingPackage.create({
    data: {
      id,
      name: `Fixture package ${t.runId}`,
      packageType: PackageType.REGULAR,
      price: 1000,
      isActive: true,
      requirementsConfirmedAt: confirmed ? new Date() : null,
    },
  });
  t.packageIds.push(id);
  if (withItem) {
    const item = await prisma.trainingPackageItem.create({
      data: { packageId: id, vehicleType: VehicleType.CAR, trainingType: TrainingType.REGULAR, requiredSessions },
      select: { id: true },
    });
    t.packageItemIds.push(item.id);
  }
  return id;
}

/** A registration request row created directly, for tests that do not go through the public form. */
export async function createPendingRegistrationFixture(t: Tracked, packageId: string, seq: number) {
  const reference = `RDS-${t.runId}${String(seq).padStart(2, "0")}`.slice(0, 14);
  const nic = `2099${t.runId.replace(/[^0-9]/g, "").padEnd(4, "7").slice(0, 4)}${String(seq).padStart(4, "0")}`;
  const email = `tss-${t.runId.toLowerCase()}-${seq}@fixture.test`;
  const price = (await prisma.trainingPackage.findUniqueOrThrow({ where: { id: packageId }, select: { price: true } })).price;
  const row = await prisma.registrationRequest.create({
    data: {
      referenceNumber: reference,
      fullName: `Fixture Applicant ${t.runId}`,
      birthday: new Date("2001-03-04T00:00:00Z"),
      nicNumber: nic,
      phoneNumber: "0771234567",
      address: "No. 1, Fixture Road, Galle",
      email,
      passwordHash: "fixture-not-used",
      selectedPackageId: packageId,
      packagePriceAtSubmission: price,
    },
    select: { id: true, referenceNumber: true },
  });
  t.registrationIds.push(row.id);
  t.referenceNumbers.push(row.referenceNumber);
  return { ...row, email };
}

/** Refuses any email that is not this run's fixture email. Every email-based lookup below depends on this check. */
function assertFixtureEmail(t: Tracked, email: string) {
  if (!email.endsWith("@fixture.test") || !email.includes(t.runId.toLowerCase())) {
    throw new Error("Refusing to track: the email is not this run's fixture email.");
  }
}

/**
 * Tracks every registration request with this run's fixture email, and its session selections. Call it after every
 * POST, whatever the response was, so a row created before a failure is still tracked and cleaned up.
 */
export async function trackRegistrationsByEmail(t: Tracked, email: string) {
  assertFixtureEmail(t, email);
  const rows = await prisma.registrationRequest.findMany({ where: { email }, select: { id: true, referenceNumber: true } });
  for (const row of rows) {
    if (!t.registrationIds.includes(row.id)) t.registrationIds.push(row.id);
    if (!t.referenceNumbers.includes(row.referenceNumber)) t.referenceNumbers.push(row.referenceNumber);
    const selections = await prisma.registrationSessionSelection.findMany({ where: { registrationRequestId: row.id }, select: { id: true } });
    for (const s of selections) if (!t.selectionIds.includes(s.id)) t.selectionIds.push(s.id);
  }
  return rows;
}

/**
 * Tracks the student account, enrollment and requirement rows that approval created for this run's fixture email.
 * Call it after every approval attempt, in a finally block. Only accounts with a STU- ID are tracked.
 */
export async function trackApprovedRows(t: Tracked, email: string) {
  assertFixtureEmail(t, email);
  const users = await prisma.user.findMany({ where: { email }, select: { userId: true } });
  const studentIds = users.map((u) => u.userId).filter((id) => id.startsWith("STU-"));
  for (const id of studentIds) if (!t.studentUserIds.includes(id)) t.studentUserIds.push(id);
  if (studentIds.length === 0) return;
  const enrollments = await prisma.enrollment.findMany({ where: { studentUserId: { in: studentIds } }, select: { id: true } });
  for (const e of enrollments) if (!t.enrollmentIds.includes(e.id)) t.enrollmentIds.push(e.id);
  const requirements = await prisma.enrollmentTrainingRequirement.findMany({
    where: { enrollmentId: { in: enrollments.map((e) => e.id) } },
    select: { id: true },
  });
  for (const r of requirements) if (!t.requirementIds.includes(r.id)) t.requirementIds.push(r.id);
}

type CleanupStep = { table: string; ids: string[]; run: (ids: string[]) => Promise<{ count: number }> };

function cleanupSteps(t: Tracked): CleanupStep[] {
  return [
    { table: "Payment", ids: t.paymentIds, run: (ids) => prisma.payment.deleteMany({ where: { id: { in: ids } } }) },
    { table: "RegistrationSessionSelection", ids: t.selectionIds, run: (ids) => prisma.registrationSessionSelection.deleteMany({ where: { id: { in: ids } } }) },
    { table: "EnrollmentTrainingRequirement", ids: t.requirementIds, run: (ids) => prisma.enrollmentTrainingRequirement.deleteMany({ where: { id: { in: ids } } }) },
    { table: "Enrollment", ids: t.enrollmentIds, run: (ids) => prisma.enrollment.deleteMany({ where: { id: { in: ids } } }) },
    { table: "RegistrationRequest", ids: t.registrationIds, run: (ids) => prisma.registrationRequest.deleteMany({ where: { id: { in: ids } } }) },
    { table: "StudentProfile", ids: t.studentUserIds, run: (ids) => prisma.studentProfile.deleteMany({ where: { userId: { in: ids } } }) },
    { table: "InstructorProfile", ids: t.instructorUserIds, run: (ids) => prisma.instructorProfile.deleteMany({ where: { userId: { in: ids } } }) },
    { table: "User", ids: [...t.studentUserIds, ...t.userIds], run: (ids) => prisma.user.deleteMany({ where: { userId: { in: ids } } }) },
    // Price history references the package with RESTRICT, so it goes before the package.
    { table: "TrainingPackagePriceChange", ids: t.priceChangeIds, run: (ids) => prisma.trainingPackagePriceChange.deleteMany({ where: { id: { in: ids } } }) },
    { table: "TrainingPackageItem", ids: t.packageItemIds, run: (ids) => prisma.trainingPackageItem.deleteMany({ where: { id: { in: ids } } }) },
    { table: "TrainingPackage", ids: t.packageIds, run: (ids) => prisma.trainingPackage.deleteMany({ where: { id: { in: ids } } }) },
  ];
}

/**
 * Deletes exactly the rows recorded in `t`, in foreign-key order. Each step checks its own count. The first step that
 * fails (a wrong count or a database error) stops the cleanup at once with the exact IDs involved. No later step runs,
 * and nothing untracked is deleted.
 */
export async function cleanupFixtures(t: Tracked) {
  for (const step of cleanupSteps(t)) {
    if (step.ids.length === 0) continue;
    const exact = step.ids.join(", ");
    let deleted: number;
    try {
      deleted = (await step.run(step.ids)).count;
    } catch (error) {
      throw new Error(`Cleanup stopped at ${step.table} (${errorText(error)}). Exact tracked IDs: ${exact}. No further cleanup was attempted.`);
    }
    if (deleted !== step.ids.length) {
      throw new Error(
        `Cleanup stopped at ${step.table}: expected ${step.ids.length} row(s), deleted ${deleted}. Exact tracked IDs: ${exact}. No further cleanup was attempted.`,
      );
    }
  }
}

/**
 * Read-only report after a failed cleanup: which tracked IDs still exist, and which STU- accounts carry this run's
 * fixture email. Nothing is deleted here. A STU- account that is not tracked is reported, not removed.
 */
export async function remainingFixtureRows(t: Tracked): Promise<string[]> {
  const lines: string[] = [];
  try {
    for (const step of cleanupSteps(t)) {
      if (step.ids.length === 0) continue;
      const found = await countExisting(step.table, step.ids);
      if (found.length > 0) lines.push(`Still present in ${step.table}: ${found.join(", ")}`);
    }
    const stu = await prisma.user.findMany({ where: { email: { contains: t.runId.toLowerCase() } }, select: { userId: true } });
    const stuIds = stu.map((u) => u.userId).filter((id) => id.startsWith("STU-"));
    const untracked = stuIds.filter((id) => !t.studentUserIds.includes(id));
    lines.push(stuIds.length > 0 ? `STU- accounts with this run's email: ${stuIds.join(", ")}` : "No STU- accounts with this run's email remain.");
    if (untracked.length > 0) lines.push(`Untracked STU- accounts with this run's email (not deleted): ${untracked.join(", ")}`);
  } catch (error) {
    lines.push(`Could not read the remaining rows (${errorText(error)}). Check the database by hand against the tracked IDs above.`);
  }
  return lines;
}

async function countExisting(table: string, ids: string[]): Promise<string[]> {
  switch (table) {
    case "TrainingPackagePriceChange":
      return (await prisma.trainingPackagePriceChange.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((r) => r.id);
    case "InstructorProfile":
      return (await prisma.instructorProfile.findMany({ where: { userId: { in: ids } }, select: { userId: true } })).map((r) => r.userId);
    case "Payment":
      return (await prisma.payment.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((r) => r.id);
    case "RegistrationSessionSelection":
      return (await prisma.registrationSessionSelection.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((r) => r.id);
    case "EnrollmentTrainingRequirement":
      return (await prisma.enrollmentTrainingRequirement.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((r) => r.id);
    case "Enrollment":
      return (await prisma.enrollment.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((r) => r.id);
    case "RegistrationRequest":
      return (await prisma.registrationRequest.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((r) => r.id);
    case "StudentProfile":
      return (await prisma.studentProfile.findMany({ where: { userId: { in: ids } }, select: { userId: true } })).map((r) => r.userId);
    case "User":
      return (await prisma.user.findMany({ where: { userId: { in: ids } }, select: { userId: true } })).map((r) => r.userId);
    case "TrainingPackageItem":
      return (await prisma.trainingPackageItem.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((r) => r.id);
    case "TrainingPackage":
      return (await prisma.trainingPackage.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((r) => r.id);
    default:
      return [];
  }
}
