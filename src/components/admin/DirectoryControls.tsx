import Link from "next/link";
import type { DirectoryStatus } from "@/lib/admin/directory";

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
    <form role="search" method="get" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
      <div className="grid gap-1.5">
        <label htmlFor={`${id}-q`} className="text-[0.8125rem] font-semibold text-ink">
          {label}
        </label>
        <input
          id={`${id}-q`}
          name="q"
          type="search"
          defaultValue={q}
          maxLength={100}
          placeholder={placeholder}
          className="rounded-xl border border-line bg-white px-3 py-2 text-[0.9375rem] text-ink focus:border-gold-dark focus:outline-none focus:ring-4 focus:ring-gold/25"
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor={`${id}-status`} className="text-[0.8125rem] font-semibold text-ink">
          Status
        </label>
        <select
          id={`${id}-status`}
          name="status"
          defaultValue={status}
          className="rounded-xl border border-line bg-white px-3 py-2 text-[0.9375rem] text-ink"
        >
          {(Object.keys(statusLabels) as DirectoryStatus[]).map((value) => (
            <option key={value} value={value}>
              {statusLabels[value]}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="rounded-xl bg-white px-4 py-2.5 text-[0.875rem] font-semibold text-ink ring-1 ring-line hover:bg-page"
      >
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

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[0.8125rem] text-muted">
      <span>{total === 1 ? "1 result" : `${total} results`}</span>
      {pageCount > 1 && (
        <nav aria-label={label} className="flex items-center gap-3">
          {page > 1 ? (
            <Link href={href(page - 1)} className="font-semibold text-ink hover:underline">
              Previous
            </Link>
          ) : (
            <span className="text-muted/60">Previous</span>
          )}
          <span>
            Page {page} of {pageCount}
          </span>
          {page < pageCount ? (
            <Link href={href(page + 1)} className="font-semibold text-ink hover:underline">
              Next
            </Link>
          ) : (
            <span className="text-muted/60">Next</span>
          )}
        </nav>
      )}
    </div>
  );
}
