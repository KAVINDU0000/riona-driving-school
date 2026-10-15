"use client";

import { useEffect, useState, type FormEvent } from "react";
import ConfirmDialog from "@/components/student/ConfirmDialog";
import { formatDate, formatDateTime, formatMoney, labels } from "@/components/student/format";
import StatusBadge from "@/components/student/StatusBadge";

type Status = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

const STATUS_TABS: { value: Status; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ALL", label: "All" },
];

const PAYMENT_METHOD_LABELS: Record<string, string> = { BANK_TRANSFER: "Online transfer", BANK_DEPOSIT: "Bank deposit" };

function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

const REASON_MIN = 10;
const REASON_MAX = 500;

type Filters = {
  status: Status;
  q: string;
  packageId: string;
  from: string;
  to: string;
  order: "oldest" | "newest";
};

const DEFAULT_FILTERS: Filters = { status: "PENDING", q: "", packageId: "", from: "", to: "", order: "oldest" };

type Summary = {
  id: string;
  referenceNumber: string;
  status: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  nicNumber: string;
  submittedAt: string;
  selectedPackage: { id: string; name: string; packageType: string; price: string };
};

type Detail = Summary & {
  birthday: string;
  address: string;
  additionalNote: string | null;
  packagePriceAtSubmission: string;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  rejectionReason: string | null;
  approvedStudentUserId: string | null;
  payments: {
    id: string;
    status: string;
    amount: string;
    paymentMethod: string;
    paymentDate: string;
    createdAt: string;
    transactionReference: string | null;
    bankName: string | null;
    accountHolderName: string | null;
    accountNumberLast4: string | null;
    branch: string | null;
    slips: { id: string; originalFileName: string; uploadedAt: string }[];
  }[];
  enrollment: { id: string; status: string; enrollmentDate: string } | null;
  history: { at: string; event: string; detail: string | null }[];
};

type ListBody = { registrations: Summary[]; total: number; page: number; pageCount: number };

/** Reads the error message the API returns. Responses never include stack traces or internal details. */
async function errorFrom(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

function hasActiveFilters(filters: Filters) {
  return filters.q !== "" || filters.packageId !== "" || filters.from !== "" || filters.to !== "" || filters.order !== "oldest";
}

/**
 * Admin review queue: search, filter and page through applications, then inspect one, approve or reject it.
 * The list and the detail come from the API. Every action is checked again on the server.
 */
export default function RegistrationReview({ packages }: { packages: { id: string; name: string }[] }) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Summary[]>([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [listVersion, setListVersion] = useState(0);
  const [detailVersion, setDetailVersion] = useState(0);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ status: filters.status, order: filters.order, page: String(page) });
    if (filters.q) params.set("q", filters.q);
    if (filters.packageId) params.set("package", filters.packageId);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);

    fetch(`/api/admin/registrations?${params.toString()}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(await errorFrom(response, "The applications could not be loaded."));
        return (await response.json()) as ListBody;
      })
      .then((body) => {
        if (!active) return;
        // The list can shrink after a decision. If this page no longer exists, move to the last one.
        if (body.total > 0 && body.page > body.pageCount) {
          setPage(body.pageCount);
          return;
        }
        setItems(body.registrations);
        setTotal(body.total);
        setPageCount(body.pageCount);
        setLoadError("");
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : "The applications could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, [filters, page, listVersion]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    fetch(`/api/admin/registrations/${selectedId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(await errorFrom(response, "That application could not be opened."));
        return (await response.json()) as { registration: Detail };
      })
      .then((body) => {
        if (!active) return;
        setDetail(body.registration);
        setActionError("");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setDetail(null);
        setActionError(error instanceof Error ? error.message : "That application could not be opened.");
      });
    return () => {
      active = false;
    };
  }, [selectedId, detailVersion]);

  function refresh() {
    setListVersion((version) => version + 1);
    setDetailVersion((version) => version + 1);
  }

  function changeFilters(patch: Partial<Filters>) {
    setPage(1);
    setFilters((current) => ({ ...current, ...patch }));
  }

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    changeFilters({ q: searchInput.trim() });
  }

  function clearFilters() {
    setSearchInput("");
    setPage(1);
    setFilters((current) => ({ ...DEFAULT_FILTERS, status: current.status }));
  }

  function choose(id: string) {
    setNotice("");
    setActionError("");
    setReason("");
    setSelectedId(id);
  }

  async function approve() {
    if (!detail) return;
    setBusy(true);
    setActionError("");
    try {
      const response = await fetch(`/api/admin/registrations/${detail.id}/approve`, { method: "POST" });
      if (!response.ok) throw new Error(await errorFrom(response, "The application could not be approved."));
      const body = (await response.json()) as { userId: string };
      setNotice(`Approved. Student ID ${body.userId} has been created and linked to this application.`);
      setConfirmApprove(false);
      refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The application could not be approved.");
      setConfirmApprove(false);
    } finally {
      setBusy(false);
    }
  }

  async function rejectApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    const trimmed = reason.trim();
    if (trimmed.length < REASON_MIN || trimmed.length > REASON_MAX) {
      setActionError(`Enter a rejection reason of ${REASON_MIN} to ${REASON_MAX} characters.`);
      return;
    }
    setBusy(true);
    setActionError("");
    try {
      const response = await fetch(`/api/admin/registrations/${detail.id}/reject`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: trimmed }),
      });
      if (!response.ok) throw new Error(await errorFrom(response, "The application could not be rejected."));
      setNotice("Application rejected. The applicant has no account.");
      setReason("");
      refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The application could not be rejected.");
    } finally {
      setBusy(false);
    }
  }

  const canReview = detail?.status === "PENDING";
  const filtered = hasActiveFilters(filters);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <section aria-labelledby="queue-heading" className="glass rounded-[22px] p-5">
        <h2 id="queue-heading" className="text-[1.125rem] font-bold text-ink">
          Registration queue
        </h2>

        <div role="tablist" aria-label="Filter applications by status" className="mt-4 flex flex-wrap gap-2">
          {STATUS_TABS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={filters.status === option.value}
              onClick={() => changeFilters({ status: option.value })}
              className={`rounded-full px-3.5 py-1.5 text-[0.8125rem] font-semibold ring-1 ${
                filters.status === option.value ? "bg-gold-soft text-gold-ink ring-gold/60" : "bg-white text-muted ring-line"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <form role="search" onSubmit={applySearch} className="mt-5 grid gap-2">
          <label htmlFor="reg-search" className="text-[0.8125rem] font-semibold text-ink">
            Search applications
          </label>
          <div className="flex gap-2">
            <input
              id="reg-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              maxLength={100}
              placeholder="Name, reference, email, NIC or phone"
              className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-2 text-[0.9375rem] text-ink focus:border-gold-dark focus:outline-none focus:ring-4 focus:ring-gold/25"
            />
            <button type="submit" className="rounded-xl bg-white px-4 py-2 text-[0.875rem] font-semibold text-ink ring-1 ring-line hover:bg-page">
              Search
            </button>
          </div>
        </form>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <label htmlFor="reg-package" className="text-[0.8125rem] font-semibold text-ink">
              Package
            </label>
            <select
              id="reg-package"
              value={filters.packageId}
              onChange={(event) => changeFilters({ packageId: event.target.value })}
              className="rounded-xl border border-line bg-white px-3 py-2 text-[0.9375rem] text-ink"
            >
              <option value="">All packages</option>
              {packages.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="reg-order" className="text-[0.8125rem] font-semibold text-ink">
              Sort by submission
            </label>
            <select
              id="reg-order"
              value={filters.order}
              onChange={(event) => changeFilters({ order: event.target.value as Filters["order"] })}
              className="rounded-xl border border-line bg-white px-3 py-2 text-[0.9375rem] text-ink"
            >
              <option value="oldest">Oldest first</option>
              <option value="newest">Newest first</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="reg-from" className="text-[0.8125rem] font-semibold text-ink">
              Submitted from
            </label>
            <input
              id="reg-from"
              type="date"
              value={filters.from}
              max={filters.to || undefined}
              onChange={(event) => changeFilters({ from: event.target.value })}
              className="rounded-xl border border-line bg-white px-3 py-2 text-[0.9375rem] text-ink"
            />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="reg-to" className="text-[0.8125rem] font-semibold text-ink">
              Submitted to
            </label>
            <input
              id="reg-to"
              type="date"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(event) => changeFilters({ to: event.target.value })}
              className="rounded-xl border border-line bg-white px-3 py-2 text-[0.9375rem] text-ink"
            />
          </div>
        </div>
        {filtered && (
          <button type="button" onClick={clearFilters} className="mt-3 text-[0.8125rem] font-semibold text-gold-ink underline-offset-2 hover:underline">
            Clear search and filters
          </button>
        )}

        {loadError && <p role="alert" className="mt-4 text-[0.875rem] text-red-700">{loadError}</p>}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[0.8125rem] text-muted" aria-live="polite">
          <span>{total === 1 ? "1 application" : `${total} applications`}</span>
          <span>
            Page {page} of {pageCount}
          </span>
        </div>

        {items.length === 0 && !loadError ? (
          <p className="mt-4 text-[0.9375rem] text-muted">
            {filtered ? "No applications match these filters." : "No applications in this list."}
          </p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => choose(item.id)}
                  aria-current={selectedId === item.id ? "true" : undefined}
                  className={`w-full rounded-2xl p-3.5 text-left ring-1 transition-colors ${
                    selectedId === item.id ? "bg-gold-soft ring-gold/60" : "bg-white ring-line hover:bg-page"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-ink">{item.fullName}</span>
                    <StatusBadge status={item.status} label={labels.registrationStatus[item.status] ?? item.status} />
                  </div>
                  <p className="mt-1 text-[0.8125rem] text-muted">
                    {item.referenceNumber} · {item.selectedPackage.name} · submitted {formatDateTime(new Date(item.submittedAt))}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}

        {pageCount > 1 && (
          <nav aria-label="Pages of applications" className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="rounded-xl bg-white px-4 py-2 text-[0.875rem] font-semibold text-ink ring-1 ring-line hover:bg-page disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              disabled={page >= pageCount}
              className="rounded-xl bg-white px-4 py-2 text-[0.875rem] font-semibold text-ink ring-1 ring-line hover:bg-page disabled:opacity-50"
            >
              Next
            </button>
          </nav>
        )}
      </section>

      <section aria-labelledby="detail-heading" className="glass rounded-[22px] p-5">
        <h2 id="detail-heading" className="text-[1.125rem] font-bold text-ink">
          Application details
        </h2>

        {notice && (
          <p role="status" className="mt-4 rounded-xl bg-success-soft px-4 py-3 text-[0.875rem] text-success">
            {notice}
          </p>
        )}
        {actionError && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[0.875rem] text-red-700">
            {actionError}
          </p>
        )}

        {!detail ? (
          <p className="mt-6 text-[0.9375rem] text-muted">Choose an application from the queue to review it.</p>
        ) : (
          <div className="mt-4 grid gap-5">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Field label="Reference" value={detail.referenceNumber} />
              <Field label="Status" value={labels.registrationStatus[detail.status] ?? detail.status} />
              <Field label="Full name" value={detail.fullName} />
              <Field label="Date of birth" value={formatDate(detail.birthday.slice(0, 10))} />
              <Field label="NIC" value={detail.nicNumber} />
              <Field label="Mobile" value={detail.phoneNumber} />
              <Field label="Email" value={detail.email} />
              <Field label="Address" value={detail.address} />
              <Field label="Package" value={detail.selectedPackage.name} />
              <Field label="Price at submission" value={formatMoney(Number(detail.packagePriceAtSubmission))} />
              <Field label="Submitted" value={formatDateTime(new Date(detail.submittedAt))} />
              {detail.reviewedAt && <Field label="Reviewed" value={formatDateTime(new Date(detail.reviewedAt))} />}
              {detail.reviewedByUserId && <Field label="Reviewed by" value={detail.reviewedByUserId} />}
              {detail.approvedStudentUserId && <Field label="Student ID" value={detail.approvedStudentUserId} />}
              {detail.rejectionReason && <Field label="Rejection reason" value={detail.rejectionReason} />}
            </dl>
            {detail.additionalNote && <Field label="Applicant's note" value={detail.additionalNote} />}

            <section aria-labelledby="history-heading" className="grid gap-2 border-t border-line pt-5">
              <h3 id="history-heading" className="text-[0.9375rem] font-bold text-ink">
                History
              </h3>
              <ol className="grid gap-2">
                {detail.history.map((entry, index) => (
                  <li key={`${entry.at}-${index}`} className="rounded-xl bg-white px-3.5 py-2.5 ring-1 ring-line">
                    <p className="text-[0.875rem] font-semibold text-ink">{entry.event}</p>
                    <p className="text-[0.8125rem] text-muted">
                      {formatDateTime(new Date(entry.at))}
                      {entry.detail ? ` · ${entry.detail}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
              <p className="text-[0.75rem] text-muted">
                Built from the stored fields of this application. The system keeps no separate audit log yet.
              </p>
            </section>

            {detail.payments.length > 0 && (
              <section aria-labelledby="payments-heading" className="grid gap-2">
                <h3 id="payments-heading" className="text-[0.9375rem] font-bold text-ink">
                  Payments recorded
                </h3>
                <ul className="grid gap-3">
                  {detail.payments.map((payment) => (
                    <li key={payment.id} className="grid gap-2 rounded-xl bg-page p-4 ring-1 ring-line">
                      <div className="flex flex-wrap justify-between gap-2 text-[0.875rem] text-ink">
                        <span>{formatMoney(Number(payment.amount))}</span>
                        <span className="text-muted">
                          {labels.paymentStatus[payment.status] ?? payment.status} · {formatDate(payment.paymentDate.slice(0, 10))}
                        </span>
                      </div>
                      <p className="text-[0.8125rem] text-muted">
                        {paymentMethodLabel(payment.paymentMethod)}
                        {payment.bankName ? ` · ${payment.bankName}` : ""}
                        {payment.branch ? `, ${payment.branch}` : ""}
                        {payment.accountHolderName ? ` · ${payment.accountHolderName}` : ""}
                        {payment.accountNumberLast4 ? ` · account ending ${payment.accountNumberLast4}` : ""}
                        {payment.transactionReference ? ` · reference ${payment.transactionReference}` : ""}
                      </p>
                      {payment.slips.length > 0 ? (
                        <ul className="flex flex-wrap gap-3">
                          {payment.slips.map((slip) => (
                            <li key={slip.id}>
                              <a
                                href={`/api/admin/payment-slips/${encodeURIComponent(slip.id)}`}
                                className="text-[0.875rem] font-semibold text-gold-ink underline underline-offset-2"
                              >
                                Open slip: {slip.originalFileName}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[0.8125rem] text-muted">No slip attached.</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {canReview && (
              <div className="grid gap-4 border-t border-line pt-5">
                <button
                  type="button"
                  onClick={() => setConfirmApprove(true)}
                  disabled={busy}
                  className="inline-flex items-center justify-center rounded-xl bg-gold px-6 py-3 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] hover:bg-gold-dark disabled:opacity-60"
                >
                  Approve and create student account
                </button>

                <form onSubmit={rejectApplication} className="grid gap-2">
                  <label htmlFor="reject-reason" className="text-[0.8125rem] font-semibold text-ink">
                    Rejection reason (shown to the school record)
                  </label>
                  <textarea
                    id="reject-reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    maxLength={REASON_MAX}
                    rows={3}
                    className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[0.9375rem] text-ink focus:border-gold-dark focus:outline-none focus:ring-4 focus:ring-gold/25"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="justify-self-start rounded-xl px-5 py-2.5 text-[0.9375rem] font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-60"
                  >
                    Reject application
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirmApprove}
        title="Approve this application?"
        confirmLabel="Approve"
        busy={busy}
        onConfirm={approve}
        onCancel={() => setConfirmApprove(false)}
      >
        <p>
          This creates a student account for {detail?.fullName ?? "the applicant"}, with the password they chose at signup, and an
          enrollment in {detail?.selectedPackage.name ?? "the selected package"}. It does not approve or change any payment.
        </p>
      </ConfirmDialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-muted">{label}</dt>
      <dd className="mt-1 break-words text-[0.9375rem] text-ink">{value}</dd>
    </div>
  );
}
