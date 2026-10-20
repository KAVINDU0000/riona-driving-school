import Link from "next/link";
import type { DirectoryStatus } from "@/lib/admin/directory";
import { BUTTON_INK, FIELD, LABEL } from "@/components/admin/admin-ui";
import AutoSubmitSelect from "@/components/admin/AutoSubmitSelect";

/**
 * Search and status filter for a directory. It is a plain GET form, so it works without JavaScript and the
 * result is a link the admin can bookmark or share.
 */
export function DirectorySearch({
  label,
  placeholder,
  q,
  status,
  statusLabels,
  id,
}: {
  label: string;
  placeholder: string;
  q: string;
  status: DirectoryStatus;
  statusLabels: Record<DirectoryStatus, string>;
  id: string;
}) {
  return (
    <form role="search" method="get" className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,12rem)_auto] sm:items-end">
      <div className="grid gap-1.5">
        <label htmlFor={`${id}-q`} className={LABEL}>
          {label}
        </label>
        <div className="relative">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            id={`${id}-q`}
            name="q"
            type="search"
            defaultValue={q}
            maxLength={100}
            placeholder={placeholder}
            className={`${FIELD} h-11 pl-10`}
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <label htmlFor={`${id}-status`} className={LABEL}>
          Status
        </label>
        <div className="relative">
          <AutoSubmitSelect
            id={`${id}-status`}
            name="status"
            defaultValue={status}
            options={(Object.keys(statusLabels) as DirectoryStatus[]).map((value) => ({ value, label: statusLabels[value] }))}
          />
          <ChevronIcon />
        </div>
      </div>
      <button type="submit" className={BUTTON_INK}>
        Search
      </button>
    </form>
  );
}

/** Previous and next links that keep the search and filter in the address. Renders nothing when everything fits on one page. */
export function DirectoryPager({
  basePath,
  q,
  status,
  page,
  pageCount,
  total,
  label,
}: {
  basePath: string;
  q: string;
  status: DirectoryStatus;
  page: number;
  pageCount: number;
  total: number;
  label: string;
}) {
  const href = (target: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status !== "ALL") params.set("status", status);
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const pagerButton =
    "inline-flex h-10 items-center justify-center rounded-xl border border-line bg-white px-4 text-[0.875rem] font-semibold text-ink shadow-[0_1px_2px_rgba(16,27,48,0.04)] transition-colors hover:bg-page";
  const pagerDisabled =
    "inline-flex h-10 items-center justify-center rounded-xl border border-line/60 bg-page/60 px-4 text-[0.875rem] font-semibold text-muted/60";

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <span className="text-[0.8125rem] text-muted" aria-live="polite">
        {total === 1 ? "1 result" : `${total} results`}
      </span>
      {pageCount > 1 && (
        <nav aria-label={label} className="flex items-center gap-2">
          {page > 1 ? (
            <Link href={href(page - 1)} className={pagerButton}>
              Previous
            </Link>
          ) : (
            <span className={pagerDisabled}>Previous</span>
          )}
          <span className="px-2 text-[0.8125rem] text-muted">
            Page {page} of {pageCount}
          </span>
          {page < pageCount ? (
            <Link href={href(page + 1)} className={pagerButton}>
              Next
            </Link>
          ) : (
            <span className={pagerDisabled}>Next</span>
          )}
        </nav>
      )}
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 7.5 5 5 5-5" />
    </svg>
  );
}
