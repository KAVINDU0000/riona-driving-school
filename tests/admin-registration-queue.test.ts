import { beforeEach, describe, expect, it } from "vitest";
import { PaymentMethod, PaymentStatus, UserRole } from "@/generated/prisma/enums";
import { GET as listRoute } from "@/app/api/admin/registrations/route";
import { AuthError } from "@/lib/auth/http";
import { createSession } from "@/lib/auth/session";
import { ADMIN_PAGE_SIZE, parseSearchText } from "@/lib/admin/query";
import {
  approveRegistration,
  getRegistration,
  listRegistrations,
  parseRegistrationListQuery,
  rejectRegistration,
} from "@/lib/admin/registration-review";
import { prisma } from "@/lib/prisma";
import { createAccount, getRequest, resetDatabase } from "./helpers";

const REGULAR_ID = "regular-car-van";
const DAILY_ID = "daily-car";

let counter = 0;

/** Parses a query string the way the API does. */
function query(search: string) {
  return parseRegistrationListQuery(new URLSearchParams(search));
}

function statusOf(action: () => unknown): number | undefined {
  try {
    action();
    return undefined;
  } catch (error) {
    return error instanceof AuthError ? error.status : undefined;
  }
}

async function seedQueue() {
  await resetDatabase();
  await createAccount({ userId: "ADMIN-1", email: "admin@riona.test", role: UserRole.ADMIN });
  await prisma.trainingPackage.createMany({
    data: [
      { id: REGULAR_ID, name: "Car and Van Training", packageType: "REGULAR", price: 26000, durationDays: 15 },
      { id: DAILY_ID, name: "Car Daily Training", packageType: "DAILY", price: 2000, sessionDurationMinutes: 30 },
    ],
  });
  await prisma.trainingPackageItem.create({
    data: { packageId: REGULAR_ID, vehicleType: "CAR", trainingType: "REGULAR", requiredSessions: 15 },
  });
}

async function addApplication(
  overrides: Partial<{
    fullName: string;
    email: string;
    nicNumber: string;
    phoneNumber: string;
    referenceNumber: string;
    selectedPackageId: string;
    submittedAt: Date;
  }> = {},
) {
  counter += 1;
  const packageId = overrides.selectedPackageId ?? REGULAR_ID;
  return prisma.registrationRequest.create({
    data: {
      referenceNumber: overrides.referenceNumber ?? `RDS-Q${String(counter).padStart(6, "0")}`,
      fullName: overrides.fullName ?? `Applicant ${counter}`,
      birthday: new Date("2000-05-10"),
      nicNumber: overrides.nicNumber ?? `NICQ${String(counter).padStart(8, "0")}`,
      phoneNumber: overrides.phoneNumber ?? `0770${String(counter).padStart(6, "0")}`,
      address: "No. 12, Main Street, Colombo 03",
      email: overrides.email ?? `applicant${counter}@example.com`,
      // Never checked in these tests. Real hashes are covered in the registration tests.
      passwordHash: "not-used-in-this-test",
      selectedPackageId: packageId,
      packagePriceAtSubmission: packageId === DAILY_ID ? 2000 : 26000,
      ...(overrides.submittedAt ? { submittedAt: overrides.submittedAt } : {}),
    },
  });
}

describe("reading the registration query", () => {
  it("uses the defaults when nothing is given: pending, oldest first, page 1", () => {
    expect(query("")).toEqual({
      status: "PENDING",
      search: "",
      packageId: null,
      submittedFrom: null,
      submittedTo: null,
      order: "oldest",
      page: 1,
    });
  });

  it("refuses malformed values with 400 rather than querying with them", () => {
    expect(statusOf(() => query("status=DELETED"))).toBe(400);
    expect(statusOf(() => query("page=0"))).toBe(400);
    expect(statusOf(() => query("page=abc"))).toBe(400);
    expect(statusOf(() => query("package=../../etc"))).toBe(400);
    expect(statusOf(() => query("from=2026-02-30"))).toBe(400);
    expect(statusOf(() => query("from=10-03-2026"))).toBe(400);
    expect(statusOf(() => query("from=2026-03-02&to=2026-03-01"))).toBe(400);
    expect(statusOf(() => query("order=random"))).toBe(400);
    expect(statusOf(() => query(`q=${"x".repeat(101)}`))).toBe(400);
  });

  it("trims search text and accepts a valid date range", () => {
    expect(parseSearchText("  Nimal  ")).toBe("Nimal");
    const parsed = query("q=%20nimal%20&from=2026-03-01&to=2026-03-31&order=newest&page=2");
    expect(parsed).toMatchObject({ search: "nimal", submittedFrom: "2026-03-01", submittedTo: "2026-03-31", order: "newest", page: 2 });
  });
});

describe("searching and filtering applications", () => {
  beforeEach(seedQueue);

  it("matches name, reference, email, NIC and phone, ignoring case", async () => {
    const nimal = await addApplication({
      fullName: "Nimal Perera",
      referenceNumber: "RDS-SEARCH01",
      email: "nimal.perera@example.com",
      nicNumber: "200012345678",
      phoneNumber: "0771112233",
    });
    const kamal = await addApplication({ fullName: "Kamal Silva", referenceNumber: "RDS-SEARCH02", email: "kamal@example.org" });

    const ids = async (search: string) => (await listRegistrations(query(`q=${search}`))).registrations.map((r) => r.id);
    expect(await ids("nimal")).toEqual([nimal.id]);
    expect(await ids("rds-search02")).toEqual([kamal.id]);
    expect(await ids("KAMAL%40EXAMPLE")).toEqual([kamal.id]);
    expect(await ids("2000123")).toEqual([nimal.id]);
    expect(await ids("0771112")).toEqual([nimal.id]);
    expect(await ids("nobody-by-this-name")).toEqual([]);
  });

  it("filters by package", async () => {
    const regular = await addApplication({ selectedPackageId: REGULAR_ID });
    const daily = await addApplication({ selectedPackageId: DAILY_ID });
    expect((await listRegistrations(query(`package=${DAILY_ID}`))).registrations.map((r) => r.id)).toEqual([daily.id]);
    expect((await listRegistrations(query(`package=${REGULAR_ID}`))).registrations.map((r) => r.id)).toEqual([regular.id]);
  });

  it("uses school-time day boundaries for the submission date filter", async () => {
    // 18:30 UTC is midnight in Asia/Colombo, so this one belongs to 11 March, the one before it to 10 March.
    const before = await addApplication({ submittedAt: new Date("2026-03-10T18:29:59.000Z") });
    const after = await addApplication({ submittedAt: new Date("2026-03-10T18:30:00.000Z") });

    const on = async (from: string, to: string) =>
      (await listRegistrations(query(`from=${from}&to=${to}`))).registrations.map((r) => r.id);
    expect(await on("2026-03-10", "2026-03-10")).toEqual([before.id]);
    expect(await on("2026-03-11", "2026-03-11")).toEqual([after.id]);
    expect(await on("2026-03-10", "2026-03-11")).toEqual([before.id, after.id]);
  });

  it("returns an empty page with a total of 0 when nothing matches", async () => {
    await addApplication();
    const result = await listRegistrations(query("q=no-such-applicant"));
    expect(result).toMatchObject({ total: 0, page: 1, pageCount: 1, registrations: [] });
  });
});

describe("paging and order", () => {
  beforeEach(seedQueue);

  it("pages through every match once, even when submission times are identical", async () => {
    const sameTime = new Date("2026-04-01T04:00:00.000Z");
    for (let index = 0; index < ADMIN_PAGE_SIZE + 5; index += 1) {
      await addApplication({ submittedAt: sameTime });
    }

    const first = await listRegistrations(query("page=1"));
    const second = await listRegistrations(query("page=2"));
    expect(first.total).toBe(ADMIN_PAGE_SIZE + 5);
    expect(first.pageCount).toBe(2);
    expect(first.registrations).toHaveLength(ADMIN_PAGE_SIZE);
    expect(second.registrations).toHaveLength(5);

    const ids = [...first.registrations, ...second.registrations].map((r) => r.id);
    expect(new Set(ids).size).toBe(ADMIN_PAGE_SIZE + 5);
  });

  it("lists newest first when asked, and oldest first by default", async () => {
    const older = await addApplication({ submittedAt: new Date("2026-03-01T00:00:00Z") });
    const newer = await addApplication({ submittedAt: new Date("2026-03-05T00:00:00Z") });
    expect((await listRegistrations(query(""))).registrations.map((r) => r.id)).toEqual([older.id, newer.id]);
    expect((await listRegistrations(query("order=newest"))).registrations.map((r) => r.id)).toEqual([newer.id, older.id]);
  });
});

describe("application detail and history", () => {
  beforeEach(seedQueue);

  it("records the approval, the enrollment and the payment in order, and never returns the password hash", async () => {
    const applicant = await addApplication({ fullName: "Nimal Perera", submittedAt: new Date("2026-03-01T03:00:00Z") });
    await prisma.payment.create({
      data: { registrationRequestId: applicant.id, amount: 26000, paymentMethod: PaymentMethod.BANK_TRANSFER, paymentDate: new Date("2026-03-02"), status: PaymentStatus.PENDING },
    });
    await approveRegistration(applicant.id, "ADMIN-1");

    const detail = await getRegistration(applicant.id);
    const events = detail.history.map((entry) => entry.event);
    expect(events[0]).toBe("Submitted");
    expect(events).toContain("Approved by ADMIN-1");
    expect(events).toContain("Enrollment created");
    expect(events).toContain("Payment recorded");
    expect(detail.history.find((entry) => entry.event === "Approved by ADMIN-1")?.detail).toMatch(/^Student ID STU-\d{3,}$/);
    expect(detail.payments).toHaveLength(1);
    expect(JSON.stringify(detail)).not.toContain("not-used-in-this-test");
    expect("passwordHash" in detail).toBe(false);
  });

  it("shows the rejection reason in the history", async () => {
    const applicant = await addApplication();
    await rejectRegistration(applicant.id, "ADMIN-1", "Documents do not match the NIC.");
    const detail = await getRegistration(applicant.id);
    expect(detail.history.map((entry) => entry.event)).toEqual(["Submitted", "Rejected by ADMIN-1"]);
    expect(detail.history[1].detail).toBe("Documents do not match the NIC.");
  });

  it("lets only one of two concurrent rejections succeed, and the other is refused with 409", async () => {
    const applicant = await addApplication();
    const results = await Promise.allSettled([
      rejectRegistration(applicant.id, "ADMIN-1", "Duplicate application received."),
      rejectRegistration(applicant.id, "ADMIN-1", "Duplicate application received."),
    ]);
    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const refused = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(refused).toHaveLength(1);
    expect(refused[0].reason).toBeInstanceOf(AuthError);
    expect((refused[0].reason as AuthError).status).toBe(409);
  });
});

describe("the list route", () => {
  beforeEach(seedQueue);

  it("returns one page with the total and the page metadata, and refuses a bad page with 400", async () => {
    await addApplication();
    await addApplication();
    const { token } = await createSession("ADMIN-1");
    const cookie = `riona_session=${token}`;

    const ok = await listRoute(getRequest("/api/admin/registrations?status=PENDING&page=1", cookie));
    const body = (await ok.json()) as { registrations: unknown[]; total: number; page: number; pageCount: number; pageSize: number };
    expect(ok.status).toBe(200);
    expect(body).toMatchObject({ total: 2, page: 1, pageCount: 1, pageSize: ADMIN_PAGE_SIZE });
    expect(body.registrations).toHaveLength(2);

    const bad = await listRoute(getRequest("/api/admin/registrations?page=0", cookie));
    expect(bad.status).toBe(400);
  });
});
