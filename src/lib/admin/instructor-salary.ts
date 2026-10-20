import { SalaryMonthStatus, UserRole } from "@/generated/prisma/enums";
import { AuthError } from "@/lib/auth/http";
import { prisma } from "@/lib/prisma";
import { dateToString, parseDateOnly, schoolNow } from "@/lib/student/time";

/**
 * Instructor salary tracking. Admins only. The fixed monthly salary is a default; each month is recorded as its own row
 * with the amount copied at that time, so changing the salary later does not change past months. Nothing here moves money:
 * it records what the school has paid and when.
 */

const INSTRUCTOR_ID_PATTERN = /^[A-Za-z0-9-]{1,32}$/;
const AMOUNT_PATTERN = /^\d{1,8}(\.\d{1,2})?$/;
const MONTH_PATTERN = /^\d{4}-\d{2}$/;
const DATE_TEXT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const NOTE_MAX_LENGTH = 300;

export type SalaryMonthRow = {
  id: string;
  /** The salary month as YYYY-MM. */
  month: string;
  /** The amount in rupees with two decimals, for example "26000.00". */
  amount: string;
  status: SalaryMonthStatus;
  /** The date the salary was paid, as YYYY-MM-DD, or null while unpaid. */
  paidOn: string | null;
  note: string | null;
};

/** A positive amount in rupees with at most two decimals. Returned as a string with two decimals. */
export function parseSalaryAmount(value: unknown): string {
  const text = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!AMOUNT_PATTERN.test(text) || Number(text) <= 0) {
    throw new AuthError(422, "Enter an amount in rupees above zero, for example 26000.");
  }
  return Number(text).toFixed(2);
}

/** The salary month as a first-of-month date. A month later than the current school month is refused. */
export function parseSalaryMonth(value: unknown): { date: Date; month: string } {
  const month = typeof value === "string" ? value.trim() : "";
  if (!MONTH_PATTERN.test(month)) throw new AuthError(422, "Choose the salary month.");
  if (month > schoolNow().date.slice(0, 7)) throw new AuthError(422, "A month that has not started yet cannot be recorded.");
  const date = parseDateOnly(`${month}-01`);
  if (!date) throw new AuthError(422, "Choose the salary month.");
  return { date, month };
}

function parsePaidOn(value: unknown): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  if (!DATE_TEXT_PATTERN.test(text) || !parseDateOnly(text)) throw new AuthError(422, "Choose a valid paid date.");
  if (text > schoolNow().date) throw new AuthError(422, "The paid date cannot be in the future.");
  return text;
}

function parseNote(value: unknown): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length > NOTE_MAX_LENGTH) throw new AuthError(422, `The note can be up to ${NOTE_MAX_LENGTH} characters.`);
  return text || null;
}

function parseInstructorId(raw: string): string {
  const userId = raw.trim();
  if (!INSTRUCTOR_ID_PATTERN.test(userId)) throw new AuthError(400, "Invalid instructor ID.");
  return userId;
}

async function requireInstructor(userId: string) {
  const user = await prisma.user.findFirst({
    where: { userId, role: UserRole.INSTRUCTOR },
    select: { userId: true, instructorProfile: { select: { monthlySalary: true } } },
  });
  if (!user?.instructorProfile) throw new AuthError(404, "That instructor was not found.");
  return user.instructorProfile;
}

function toRow(row: {
  id: string;
  salaryMonth: Date;
  amount: { toString(): string };
  status: SalaryMonthStatus;
  paidOn: Date | null;
  note: string | null;
}): SalaryMonthRow {
  return {
    id: row.id,
    month: dateToString(row.salaryMonth).slice(0, 7),
    amount: Number(row.amount.toString()).toFixed(2),
    status: row.status,
    paidOn: row.paidOn ? dateToString(row.paidOn) : null,
    note: row.note,
  };
}

/** The fixed monthly salary and every recorded month, newest first. */
export async function getInstructorSalary(instructorIdRaw: string) {
  const userId = parseInstructorId(instructorIdRaw);
  const profile = await requireInstructor(userId);
  const rows = await prisma.instructorSalaryMonth.findMany({
    where: { instructorUserId: userId },
    orderBy: { salaryMonth: "desc" },
    select: { id: true, salaryMonth: true, amount: true, status: true, paidOn: true, note: true },
  });
  return {
    monthlySalary: profile.monthlySalary ? Number(profile.monthlySalary.toString()).toFixed(2) : null,
    months: rows.map(toRow),
  };
}

/** Sets the fixed monthly salary. An empty value clears it. Months already recorded keep their amounts. */
export async function setInstructorMonthlySalary(instructorIdRaw: string, amountRaw: unknown) {
  const userId = parseInstructorId(instructorIdRaw);
  await requireInstructor(userId);
  const empty = amountRaw === null || amountRaw === undefined || (typeof amountRaw === "string" && amountRaw.trim() === "");
  const monthlySalary = empty ? null : parseSalaryAmount(amountRaw);
  await prisma.instructorProfile.update({ where: { userId }, data: { monthlySalary } });
  return { monthlySalary };
}

/**
 * Records one salary month. The amount defaults to the fixed monthly salary. A month can be recorded only once, so a
 * second attempt is refused instead of creating a duplicate.
 */
export async function recordSalaryMonth(instructorIdRaw: string, body: { month?: unknown; amount?: unknown }, adminUserId: string) {
  const userId = parseInstructorId(instructorIdRaw);
  const profile = await requireInstructor(userId);
  const { date } = parseSalaryMonth(body.month);

  const hasAmount = body.amount !== undefined && body.amount !== null && body.amount !== "";
  let amount: string;
  if (hasAmount) {
    amount = parseSalaryAmount(body.amount);
  } else if (profile.monthlySalary) {
    amount = Number(profile.monthlySalary.toString()).toFixed(2);
  } else {
    throw new AuthError(422, "Set the monthly salary first, or enter an amount for this month.");
  }

  try {
    const row = await prisma.instructorSalaryMonth.create({
      data: { instructorUserId: userId, salaryMonth: date, amount, status: SalaryMonthStatus.UNPAID, recordedByUserId: adminUserId },
      select: { id: true, salaryMonth: true, amount: true, status: true, paidOn: true, note: true },
    });
    return toRow(row);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      throw new AuthError(409, "This month is already recorded for this instructor.");
    }
    throw error;
  }
}

/** Marks one recorded month as paid (with a paid date) or unpaid. Only the status, paid date and note change. */
export async function updateSalaryMonth(
  instructorIdRaw: string,
  rowIdRaw: string,
  body: { status?: unknown; paidOn?: unknown; note?: unknown },
) {
  const userId = parseInstructorId(instructorIdRaw);
  await requireInstructor(userId);
  const rowId = rowIdRaw.trim();
  if (!/^[a-z0-9]{10,40}$/i.test(rowId)) throw new AuthError(400, "Invalid salary month.");

  const existing = await prisma.instructorSalaryMonth.findFirst({ where: { id: rowId, instructorUserId: userId }, select: { id: true } });
  if (!existing) throw new AuthError(404, "That salary month was not found.");

  if (body.status !== SalaryMonthStatus.PAID && body.status !== SalaryMonthStatus.UNPAID) {
    throw new AuthError(422, "Choose PAID or UNPAID.");
  }
  const paid = body.status === SalaryMonthStatus.PAID;
  const paidOnText = paid ? parsePaidOn(body.paidOn) ?? schoolNow().date : null;

  const data: { status: SalaryMonthStatus; paidOn: Date | null; note?: string | null } = {
    status: body.status,
    paidOn: paidOnText ? parseDateOnly(paidOnText) : null,
  };
  if (body.note !== undefined) data.note = parseNote(body.note);

  const row = await prisma.instructorSalaryMonth.update({
    where: { id: rowId },
    data,
    select: { id: true, salaryMonth: true, amount: true, status: true, paidOn: true, note: true },
  });
  return toRow(row);
}
