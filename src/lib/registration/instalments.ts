import { PackageType } from "@/generated/prisma/enums";
import { parseDateOnly } from "@/lib/student/time";

/*
 * Two-part payment for Regular packages only. The student pays any first amount, then the rest is the balance.
 * The balance must be received on or before the last day of the package period. The first day of the period is the
 * school date the enrollment was created, and the period lasts durationDays days (enrollment day counts as day 1).
 * No cash discount applies to instalments; nothing in this file changes a price.
 */

const SCHOOL_TIME_ZONE = "Asia/Colombo";

/** The school date of an instant, as YYYY-MM-DD. */
export function schoolDateOf(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SCHOOL_TIME_ZONE }).format(instant);
}

function addDays(day: string, count: number): string {
  const date = parseDateOnly(day);
  if (!date) throw new Error("addDays expects YYYY-MM-DD");
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

/** Whether a package takes instalments. Only Regular packages do. */
export function allowsInstalments(packageType: PackageType): boolean {
  return packageType === PackageType.REGULAR;
}

/** The last school date on which the balance may be paid, or null when the package has no period length. */
export function lastPaymentDay(enrollmentDate: Date, durationDays: number | null): string | null {
  if (!durationDays || durationDays < 1) return null;
  return addDays(schoolDateOf(enrollmentDate), durationDays - 1);
}

/** The money still owed: the agreed fee minus the approved payments. Never below zero. */
export function balanceOwed(fee: number, approvedPaid: number): number {
  return Math.max(0, Math.round((fee - approvedPaid) * 100) / 100);
}
