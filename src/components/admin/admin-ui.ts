/**
 * Shared control styles for the admin portal. The registration queue, directories, vehicles and packages all use
 * these, so inputs, selects, labels and buttons look the same on every admin page.
 */

export const FIELD =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[0.9375rem] text-ink shadow-[0_1px_2px_rgba(16,27,48,0.04)] transition-colors placeholder:text-muted/70 hover:border-[#c3cfdf] focus:border-gold-dark focus:outline-none focus:ring-4 focus:ring-gold/25 disabled:opacity-60";

/** Add to FIELD for a select; pair with ChevronIcon in a relative wrapper. */
export const SELECT_FIELD = `${FIELD} appearance-none pr-10`;

export const LABEL = "text-[0.8125rem] font-semibold text-ink";

export const BUTTON_PRIMARY =
  "inline-flex h-11 items-center justify-center rounded-xl bg-gold px-5 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] transition-colors hover:bg-gold-dark disabled:opacity-60";

export const BUTTON_INK =
  "inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-ink px-5 text-[0.875rem] font-semibold text-white shadow-[0_6px_16px_-8px_rgba(16,27,48,0.6)] transition-colors hover:bg-ink-soft disabled:opacity-60";

export const BUTTON_SECONDARY =
  "inline-flex h-10 items-center justify-center rounded-xl border border-line bg-white px-4 text-[0.875rem] font-semibold text-ink shadow-[0_1px_2px_rgba(16,27,48,0.04)] transition-colors hover:bg-page disabled:opacity-60";

export const BUTTON_DANGER =
  "inline-flex h-10 items-center justify-center rounded-xl border border-red-200 bg-white px-4 text-[0.875rem] font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60";

/** A clickable list row: white card with a gold hover, used for directories and the fleet. */
export const ROW_LINK =
  "group flex w-full items-start gap-3.5 rounded-2xl border border-line bg-white p-4 text-left transition-all hover:-translate-y-px hover:border-gold/50 hover:shadow-[0_10px_24px_-18px_rgba(16,27,48,0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark";

/** Up to two initials for an avatar. Falls back to "?" for an empty name. */
export function initialsOf(name: string) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  return letters || "?";
}
