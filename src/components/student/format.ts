import { SCHOOL_TIME_ZONE } from "@/lib/student/time";

/** "Mon 1 Jun 2099" for a "YYYY-MM-DD" calendar date. Dates are not shifted by the viewer's time zone. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "Not set";
  const date = typeof value === "string" ? new Date(`${value}T00:00:00Z`) : value;
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

/** A date and time shown in school time. */
export function formatDateTime(value: Date | null | undefined): string {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: SCHOOL_TIME_ZONE,
  }).format(value);
}

export function formatMoney(amount: number): string {
  return `LKR ${amount.toLocaleString("en-LK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** Human labels for stored enum values. */
export const labels = {
  vehicleType: { CAR: "Car", VAN: "Van", MOTORCYCLE: "Motorcycle", THREE_WHEELER: "Three-wheeler" } as Record<string, string>,
  trainingType: { REGULAR: "Regular", TRIAL_PREPARATION: "Trial preparation", DAILY: "Daily" } as Record<string, string>,
  lessonStatus: { SCHEDULED: "Scheduled", COMPLETED: "Completed", CANCELLED: "Cancelled" } as Record<string, string>,
  attendance: { PRESENT: "Present", ABSENT: "Absent", LATE: "Late" } as Record<string, string>,
  paymentStatus: { PENDING: "Pending review", APPROVED: "Approved", REJECTED: "Rejected" } as Record<string, string>,
  paymentMethod: { BANK_TRANSFER: "Bank transfer", BANK_DEPOSIT: "Bank deposit" } as Record<string, string>,
  registrationStatus: { PENDING: "Pending review", APPROVED: "Approved", REJECTED: "Rejected" } as Record<string, string>,
  enrollmentStatus: { ACTIVE: "Active", COMPLETED: "Completed", CANCELLED: "Cancelled" } as Record<string, string>,
  medicalStatus: { SCHEDULED: "Scheduled", COMPLETED: "Completed", RESCHEDULED: "Rescheduled", CANCELLED: "Cancelled" } as Record<string, string>,
  examStatus: { SCHEDULED: "Scheduled", COMPLETED: "Completed", RESCHEDULED: "Rescheduled", CANCELLED: "Cancelled" } as Record<string, string>,
  examType: { WRITTEN: "Written test", OFFICIAL_DRIVING_TRIAL: "Official driving trial", OTHER: "Other" } as Record<string, string>,
  examResult: { PASS: "Pass", FAIL: "Fail", PENDING: "Pending" } as Record<string, string>,
};
