import { AuthError } from "@/lib/auth/http";

/** Rows per page for every admin list. */
export const ADMIN_PAGE_SIZE = 20;

/** Longest search text accepted. Long input is refused rather than cut, so the user sees why results changed. */
export const SEARCH_MAX_LENGTH = 100;

/** Returns trimmed search text. Empty means no search. Anything longer than the limit is refused. */
export function parseSearchText(value: string | null): string {
  const text = (value ?? "").trim();
  if (text.length > SEARCH_MAX_LENGTH) {
    throw new AuthError(400, `Search text must be ${SEARCH_MAX_LENGTH} characters or fewer.`);
  }
  return text;
}

/** Returns a 1-based page number. Missing means page 1. Anything that is not a positive whole number is refused. */
export function parsePage(value: string | null): number {
  if (value === null || value === "") return 1;
  if (!/^[1-9][0-9]{0,5}$/.test(value)) {
    throw new AuthError(400, "The page number must be a whole number, 1 or more.");
  }
  return Number(value);
}

/**
 * Parses a YYYY-MM-DD filter value. Missing means no bound. The value must be a real calendar date.
 * Returns the date string unchanged so callers can turn it into a school-time boundary.
 */
export function parseFilterDate(value: string | null, label: string): string | null {
  if (value === null || value === "") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
  const isReal =
    date !== null &&
    date.getUTCFullYear() === Number(match![1]) &&
    date.getUTCMonth() === Number(match![2]) - 1 &&
    date.getUTCDate() === Number(match![3]);
  if (!isReal) {
    throw new AuthError(400, `${label} must be a date in the form YYYY-MM-DD.`);
  }
  return value;
}

/** Number of pages for a total. An empty list still has one page, so the controls always make sense. */
export function pageCount(total: number, pageSize = ADMIN_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
