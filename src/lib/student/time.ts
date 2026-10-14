/**
 * Lesson times are stored as a calendar date plus wall-clock times, with no time zone (PostgreSQL DATE and TIME).
 * The school operates in Sri Lanka time, so "now" is read in Asia/Colombo whenever a booking is checked.
 *
 * Prisma represents @db.Date and @db.Time(0) as JavaScript Dates. A DATE is stored at UTC midnight, and a TIME
 * is stored on 1970-01-01 in UTC. These helpers convert between those forms and "YYYY-MM-DD" / "HH:MM" strings.
 */

export const SCHOOL_TIME_ZONE = "Asia/Colombo";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Returns "YYYY-MM-DD" for a Prisma DATE value. */
export function dateToString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Returns "HH:MM" for a Prisma TIME value. */
export function timeToString(time: Date): string {
  return time.toISOString().slice(11, 16);
}

/** Converts "YYYY-MM-DD" to the Date Prisma expects for a DATE column. Returns null if the date is not real. */
export function parseDateOnly(value: string): Date | null {
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const isReal = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return isReal ? date : null;
}

/** Converts "HH:MM" to the Date Prisma expects for a TIME column. Returns null if the time is not valid. */
export function parseTimeOnly(value: string): Date | null {
  const match = TIME_PATTERN.exec(value);
  if (!match) return null;
  return new Date(Date.UTC(1970, 0, 1, Number(match[1]), Number(match[2])));
}

/** Minutes since midnight for a "HH:MM" string, e.g. "09:30" -> 570. */
export function minutesOfDay(time: string): number {
  const match = TIME_PATTERN.exec(time);
  if (!match) throw new Error("minutesOfDay expects HH:MM");
  return Number(match[1]) * 60 + Number(match[2]);
}

/** "HH:MM" for a number of minutes since midnight. */
export function formatMinutes(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** The current date and time in Sri Lanka, as "YYYY-MM-DD" and minutes since midnight. */
export function schoolNow(now: Date = new Date()): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SCHOOL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}
