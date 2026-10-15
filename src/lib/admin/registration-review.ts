import { Prisma } from "@/generated/prisma/client";
import { AccountStatus, PackageType, RegistrationStatus, UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { AuthError } from "@/lib/auth/http";
import { ADMIN_PAGE_SIZE, pageCount, parseFilterDate, parsePage, parseSearchText } from "@/lib/admin/query";
import { parseDateOnly } from "@/lib/student/time";

/** Application IDs are cuid values: lower-case letters and digits. Anything else cannot match a row. */
const REGISTRATION_ID_PATTERN = /^[a-z0-9]{1,64}$/;
/** Package IDs are cuid values or the slugs in src/data/packages.ts, such as "daily-car". */
const PACKAGE_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;
const STATUS_FILTERS = ["PENDING", "APPROVED", "REJECTED", "ALL"] as const;
const SORT_ORDERS = ["oldest", "newest"] as const;
const REJECTION_REASON_MIN = 10;
const REJECTION_REASON_MAX = 500;
/** Asia/Colombo has no daylight saving time, so a fixed offset gives the school's day boundaries exactly. */
const SCHOOL_UTC_OFFSET = "+05:30";

type StatusFilter = (typeof STATUS_FILTERS)[number];
type SortOrder = (typeof SORT_ORDERS)[number];

export type RegistrationListQuery = {
  status: StatusFilter;
  search: string;
  packageId: string | null;
  submittedFrom: string | null;
  submittedTo: string | null;
  order: SortOrder;
  page: number;
};

const summarySelect = {
  id: true,
  referenceNumber: true,
  status: true,
  fullName: true,
  email: true,
  phoneNumber: true,
  nicNumber: true,
  submittedAt: true,
  reviewedAt: true,
  selectedPackage: { select: { id: true, name: true, packageType: true, price: true } },
} satisfies Prisma.RegistrationRequestSelect;

const detailSelect = {
  ...summarySelect,
  birthday: true,
  address: true,
  additionalNote: true,
  packagePriceAtSubmission: true,
  reviewedByUserId: true,
  rejectionReason: true,
  approvedStudentUserId: true,
  // Payments are read for the history only. Bank details and slips are not selected here.
  payments: {
    orderBy: { createdAt: "asc" },
    select: { id: true, status: true, amount: true, paymentMethod: true, paymentDate: true, createdAt: true, lastReviewedAt: true },
  },
  enrollment: { select: { id: true, status: true, enrollmentDate: true } },
} satisfies Prisma.RegistrationRequestSelect;

export type RegistrationSummary = Prisma.RegistrationRequestGetPayload<{ select: typeof summarySelect }>;

/** One line of the application's recorded history. The system keeps no separate audit log, so this is built from the stored fields. */
export type HistoryEvent = { at: string; event: string; detail: string | null };

/** Returns the application ID, or a 404 for anything that cannot be an ID, so the route never queries malformed input. */
export function parseRegistrationId(value: string): string {
  if (!REGISTRATION_ID_PATTERN.test(value)) {
    throw new AuthError(404, "That application was not found.");
  }
  return value;
}

function parseStatusFilter(value: string | null): StatusFilter {
  if (value === null || value === "") return "PENDING";
  if ((STATUS_FILTERS as readonly string[]).includes(value)) return value as StatusFilter;
  throw new AuthError(400, "Choose PENDING, APPROVED, REJECTED or ALL.");
}

/**
 * Reads every filter from the query string. Each value is checked here, so the database only receives
 * well-formed input. Missing values fall back to the defaults: pending applications, oldest first, page 1.
 */
export function parseRegistrationListQuery(params: URLSearchParams): RegistrationListQuery {
  const status = parseStatusFilter(params.get("status"));
  const search = parseSearchText(params.get("q"));

  const packageParam = params.get("package") ?? "";
  if (packageParam && !PACKAGE_ID_PATTERN.test(packageParam)) {
    throw new AuthError(400, "Choose a package from the list.");
  }

  const submittedFrom = parseFilterDate(params.get("from"), "The 'from' date");
  const submittedTo = parseFilterDate(params.get("to"), "The 'to' date");
  if (submittedFrom && submittedTo && submittedFrom > submittedTo) {
    throw new AuthError(400, "The 'from' date must be on or before the 'to' date.");
  }

  const orderParam = params.get("order") ?? "oldest";
  if (!(SORT_ORDERS as readonly string[]).includes(orderParam)) {
    throw new AuthError(400, "Sort by oldest or newest.");
  }

  return {
    status,
    search,
    packageId: packageParam || null,
    submittedFrom,
    submittedTo,
    order: orderParam as SortOrder,
    page: parsePage(params.get("page")),
  };
}

/** Start of a school date, as an instant. The day after `date` is the exclusive end of that day. */
function schoolDayStart(date: string): Date {
  return new Date(`${date}T00:00:00${SCHOOL_UTC_OFFSET}`);
}

function nextDate(date: string): string {
  const day = parseDateOnly(date)!;
  day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}

function buildWhere(query: RegistrationListQuery): Prisma.RegistrationRequestWhereInput {
  const where: Prisma.RegistrationRequestWhereInput = {};
  if (query.status !== "ALL") where.status = query.status as RegistrationStatus;

  if (query.search) {
    where.OR = [
      { fullName: { contains: query.search, mode: "insensitive" } },
      { referenceNumber: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
      { nicNumber: { contains: query.search, mode: "insensitive" } },
      { phoneNumber: { contains: query.search, mode: "insensitive" } },
    ];
  }
  if (query.packageId) where.selectedPackageId = query.packageId;
  if (query.submittedFrom || query.submittedTo) {
    where.submittedAt = {
      ...(query.submittedFrom ? { gte: schoolDayStart(query.submittedFrom) } : {}),
      ...(query.submittedTo ? { lt: schoolDayStart(nextDate(query.submittedTo)) } : {}),
    };
  }
  return where;
}

/**
 * One page of applications for the admin review screen, with the total for the filters. The ID breaks ties
 * in the sort, so a page never repeats or skips a row when several applications share a submission time.
 */
export async function listRegistrations(query: RegistrationListQuery) {
  const where = buildWhere(query);
  const direction = query.order === "newest" ? "desc" : "asc";
  const [total, registrations] = await prisma.$transaction([
    prisma.registrationRequest.count({ where }),
    prisma.registrationRequest.findMany({
      where,
      select: summarySelect,
      orderBy: [{ submittedAt: direction }, { id: direction }],
      skip: (query.page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
  ]);
  return { registrations, total, page: query.page, pageSize: ADMIN_PAGE_SIZE, pageCount: pageCount(total) };
}

/** Builds the recorded events for one application, oldest first. Each event comes from a stored field. */
function buildHistory(registration: {
  submittedAt: Date;
  selectedPackage: { name: string };
  status: RegistrationStatus;
  reviewedAt: Date | null;
  reviewedByUserId: string | null;
  rejectionReason: string | null;
  approvedStudentUserId: string | null;
  enrollment: { enrollmentDate: Date } | null;
  payments: { status: string; createdAt: Date; lastReviewedAt: Date | null }[];
}): HistoryEvent[] {
  const events: HistoryEvent[] = [{ at: registration.submittedAt.toISOString(), event: "Submitted", detail: registration.selectedPackage.name }];

  if (registration.reviewedAt) {
    const by = registration.reviewedByUserId ? ` by ${registration.reviewedByUserId}` : "";
    if (registration.status === RegistrationStatus.APPROVED) {
      events.push({
        at: registration.reviewedAt.toISOString(),
        event: `Approved${by}`,
        detail: registration.approvedStudentUserId ? `Student ID ${registration.approvedStudentUserId}` : null,
      });
    } else if (registration.status === RegistrationStatus.REJECTED) {
      events.push({ at: registration.reviewedAt.toISOString(), event: `Rejected${by}`, detail: registration.rejectionReason });
    }
  }

  if (registration.enrollment) {
    events.push({ at: registration.enrollment.enrollmentDate.toISOString(), event: "Enrollment created", detail: null });
  }

  for (const payment of registration.payments) {
    const outcome = payment.status === "APPROVED" ? "approved" : payment.status === "REJECTED" ? "rejected" : "awaiting review";
    events.push({ at: payment.createdAt.toISOString(), event: "Payment recorded", detail: `Payment ${outcome}` });
    if (payment.lastReviewedAt) {
      events.push({ at: payment.lastReviewedAt.toISOString(), event: "Payment reviewed", detail: `Payment ${outcome}` });
    }
  }

  return events.sort((a, b) => a.at.localeCompare(b.at));
}

/** Full application for review, with its recorded history. The stored password hash is never selected. */
export async function getRegistration(registrationId: string) {
  const id = parseRegistrationId(registrationId);
  const registration = await prisma.registrationRequest.findUnique({ where: { id }, select: detailSelect });
  if (!registration) {
    throw new AuthError(404, "That application was not found.");
  }
  return { ...registration, history: buildHistory(registration) };
}

/** Trims and checks a rejection reason. The school needs enough words to explain the decision, and the limit keeps the record short. */
export function validateRejectionReason(value: unknown): string {
  const reason = typeof value === "string" ? value.trim() : "";
  if (reason.length < REJECTION_REASON_MIN || reason.length > REJECTION_REASON_MAX) {
    throw new AuthError(400, `Enter a rejection reason of ${REJECTION_REASON_MIN} to ${REJECTION_REASON_MAX} characters.`);
  }
  return reason;
}

/** Locks one application row for the rest of the transaction. A second reviewer waits here, then sees the new status. */
async function lockRegistration(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT id FROM "RegistrationRequest" WHERE id = ${id} FOR UPDATE`;
  const registration = await tx.registrationRequest.findUnique({ where: { id } });
  if (!registration) {
    throw new AuthError(404, "That application was not found.");
  }
  if (registration.status !== RegistrationStatus.PENDING) {
    throw new AuthError(409, "This application has already been reviewed.");
  }
  return registration;
}

/** Next student ID in the STU-### sequence. Callers must hold the advisory lock taken in approveRegistration. */
async function nextStudentUserId(tx: Prisma.TransactionClient): Promise<string> {
  const [row] = await tx.$queryRaw<{ next: number }[]>`
    SELECT (COALESCE(MAX(CAST(SUBSTRING("userId" FROM 5) AS INTEGER)), 0) + 1)::int AS next
    FROM "User"
    WHERE "userId" ~ '^STU-[0-9]{3,}$'`;
  return `STU-${String(row.next).padStart(3, "0")}`;
}

/**
 * Approves a pending application. In one transaction it creates the student's user, profile, enrollment and
 * training requirements, then links the application to the new account. Nothing is merged: an existing account
 * with the same email or NIC blocks the approval. No payment is created; payments are recorded separately.
 *
 * Callers must already have checked that the requester is an admin.
 */
export async function approveRegistration(registrationId: string, adminUserId: string) {
  const id = parseRegistrationId(registrationId);

  try {
    return await prisma.$transaction(async (tx) => {
      const registration = await lockRegistration(tx, id);

      // Share-lock the package so a deactivation waits until this approval commits, then read it fresh.
      // Everything here runs before the first write, so a refused package creates nothing.
      await tx.$queryRaw`SELECT id FROM "TrainingPackage" WHERE id = ${registration.selectedPackageId} FOR SHARE`;
      const selectedPackage = await tx.trainingPackage.findUniqueOrThrow({
        where: { id: registration.selectedPackageId },
        select: { packageType: true, isActive: true },
      });
      if (!selectedPackage.isActive) {
        throw new AuthError(422, "This training package is no longer offered, so the application cannot be approved. Contact the school.");
      }
      if (selectedPackage.packageType === PackageType.DAILY) {
        throw new AuthError(422, "Per-session packages cannot be approved online yet. Contact the school.");
      }

      const emailOwner = await tx.user.findUnique({ where: { email: registration.email }, select: { userId: true } });
      if (emailOwner) {
        throw new AuthError(409, "An account with this email already exists. Accounts are not merged, so resolve it first.");
      }
      const nicOwner = await tx.studentProfile.findUnique({ where: { nicNumber: registration.nicNumber }, select: { userId: true } });
      if (nicOwner) {
        throw new AuthError(409, "A student profile with this NIC already exists. Accounts are not merged, so resolve it first.");
      }

      const items = await tx.trainingPackageItem.findMany({ where: { packageId: registration.selectedPackageId } });
      if (items.some((item) => item.requiredSessions === null)) {
        throw new AuthError(422, "This package has no session counts set yet, so it cannot be approved.");
      }

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('riona_student_id'))`;
      const userId = await nextStudentUserId(tx);

      await tx.user.create({
        data: {
          userId,
          email: registration.email,
          // The applicant chose this password at signup, so the account keeps it. No invitation is needed.
          passwordHash: registration.passwordHash,
          role: UserRole.STUDENT,
          status: AccountStatus.ACTIVE,
        },
      });
      await tx.studentProfile.create({
        data: {
          userId,
          fullName: registration.fullName,
          address: registration.address,
          birthday: registration.birthday,
          nicNumber: registration.nicNumber,
          phoneNumber: registration.phoneNumber,
        },
      });
      const enrollment = await tx.enrollment.create({
        data: {
          studentUserId: userId,
          packageId: registration.selectedPackageId,
          registrationRequestId: registration.id,
          agreedPrice: registration.packagePriceAtSubmission,
          finalFee: registration.packagePriceAtSubmission,
        },
      });
      if (items.length > 0) {
        await tx.enrollmentTrainingRequirement.createMany({
          data: items.map((item) => ({
            enrollmentId: enrollment.id,
            vehicleType: item.vehicleType,
            trainingType: item.trainingType,
            requiredSessions: item.requiredSessions as number,
          })),
        });
      }

      await tx.registrationRequest.update({
        where: { id },
        data: {
          status: RegistrationStatus.APPROVED,
          reviewedAt: new Date(),
          reviewedByUserId: adminUserId,
          approvedStudentUserId: userId,
        },
      });

      return { userId, enrollmentId: enrollment.id, referenceNumber: registration.referenceNumber };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AuthError(409, "This application could not be approved because an account conflict appeared. Refresh and check again.");
    }
    throw error;
  }
}

/** Rejects a pending application with a reason. The applicant gets no account. */
export async function rejectRegistration(registrationId: string, adminUserId: string, reason: unknown) {
  const id = parseRegistrationId(registrationId);
  const trimmed = validateRejectionReason(reason);

  return prisma.$transaction(async (tx) => {
    const registration = await lockRegistration(tx, id);
    await tx.registrationRequest.update({
      where: { id },
      data: {
        status: RegistrationStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedByUserId: adminUserId,
        rejectionReason: trimmed,
      },
    });
    return { referenceNumber: registration.referenceNumber, status: RegistrationStatus.REJECTED };
  });
}
