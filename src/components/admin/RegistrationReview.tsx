"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
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

/** Shared control styles, so every input, select and textarea on this page looks the same. */
const FIELD =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[0.9375rem] text-ink shadow-[0_1px_2px_rgba(16,27,48,0.04)] transition-colors placeholder:text-muted/70 hover:border-[#c3cfdf] focus:border-gold-dark focus:outline-none focus:ring-4 focus:ring-gold/25";
const SELECT = `${FIELD} appearance-none pr-10`;
const LABEL = "text-[0.8125rem] font-semibold text-ink";
const BUTTON_SECONDARY =
  "inline-flex h-10 items-center justify-center rounded-xl border border-line bg-white px-4 text-[0.875rem] font-semibold text-ink shadow-[0_1px_2px_rgba(16,27,48,0.04)] transition-colors hover:bg-page disabled:opacity-60";
const BUTTON_DANGER =
  "inline-flex h-10 items-center justify-center rounded-xl border border-red-200 bg-white px-4 text-[0.875rem] font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60";

type Filters = {
  status: Status;
  q: string;
  packageId: string;
  from: string;
  to: string;
  order: "oldest" | "newest";
  /** Only applications whose payment is still waiting for review. Any application status can match. */
  payment: boolean;
};

const DEFAULT_FILTERS: Filters = { status: "PENDING", q: "", packageId: "", from: "", to: "", order: "oldest", payment: false };

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
    reviewHistory: { decision: string; reason: string | null; reviewedAt: string }[];
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
  return (
    filters.q !== "" || filters.packageId !== "" || filters.from !== "" || filters.to !== "" || filters.order !== "oldest" || filters.payment
  );
}

/** Up to two initials for the avatar. Falls back to "?" for an empty name. */
function initialsOf(name: string) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  return letters || "?";
}

/**
 * Admin review queue: search, filter and page through applications, then inspect one, approve or reject it.
 * The list and the detail come from the API. Every action is checked again on the server.
 */
export default function RegistrationReview({
  packages,
  initialStatus = "PENDING",
  initialPaymentPending = false,
}: {
  packages: { id: string; name: string }[];
  initialStatus?: Status;
  initialPaymentPending?: boolean;
}) {
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS, status: initialStatus, payment: initialPaymentPending });
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
  // Each payment has its own rejection note, so one typed note cannot end up on another payment.
  const [paymentReasons, setPaymentReasons] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ status: filters.status, order: filters.order, page: String(page) });
    if (filters.q) params.set("q", filters.q);
    if (filters.payment) params.set("payment", "PENDING");
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

  /** Approves or rejects one pending payment. A rejection needs a reason, which the applicant sees on the status page. */
  async function reviewPayment(paymentId: string, decision: "APPROVED" | "REJECTED") {
    const note = (paymentReasons[paymentId] ?? "").trim();
    if (decision === "REJECTED" && (note.length < REASON_MIN || note.length > REASON_MAX)) {
      setActionError(`Enter a rejection reason of ${REASON_MIN} to ${REASON_MAX} characters.`);
      return;
    }
    if (decision === "APPROVED" && !window.confirm("Approve this payment? The applicant will see it as approved.")) {
      return;
    }
    setBusy(true);
    setActionError("");
    try {
      const response = await fetch(`/api/admin/payments/${encodeURIComponent(paymentId)}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, reason: note }),
      });
      if (!response.ok) throw new Error(await errorFrom(response, "The payment could not be reviewed."));
      setNotice(
        decision === "APPROVED"
          ? "Payment approved. The applicant will see it as approved on the status page."
          : "Payment rejected. The applicant will see the reason and can send a new slip.",
      );
      setPaymentReasons((current) => {
        const next = { ...current };
        delete next[paymentId];
        return next;
      });
      refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The payment could not be reviewed.");
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
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <section aria-labelledby="queue-heading" className="glass rounded-[22px] p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="queue-heading" className="text-[1.125rem] font-bold text-ink">
            Registration queue
          </h2>
          <span className="text-[0.8125rem] text-muted" aria-live="polite">
            {total === 1 ? "1 application" : `${total} applications`}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={filters.payment}
            onClick={() => changeFilters({ payment: !filters.payment, status: filters.payment ? filters.status : "ALL" })}
            className={`inline-flex h-9 items-center rounded-xl px-3.5 text-[0.8125rem] font-semibold ring-1 transition-colors ${
              filters.payment ? "bg-gold-soft text-ink ring-gold-dark" : "bg-white text-muted ring-line hover:text-ink"
            }`}
          >
            Payment awaiting review
          </button>
          {filters.payment && (
            <span className="text-[0.8125rem] text-muted">Showing all applications with a payment to review.</span>
          )}
        </div>

        <div
          role="tablist"
          aria-label="Filter applications by status"
          className="mt-3 inline-flex max-w-full flex-wrap gap-1 rounded-2xl bg-page p-1 ring-1 ring-line"
        >
          {STATUS_TABS.map((option) => {
            const active = filters.status === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => changeFilters({ status: option.value })}
                className={`rounded-xl px-3.5 py-1.5 text-[0.8125rem] font-semibold transition-all ${
                  active ? "bg-white text-ink shadow-[0_1px_3px_rgba(16,27,48,0.12)]" : "text-muted hover:text-ink"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <form role="search" onSubmit={applySearch} className="mt-5 grid gap-1.5">
          <label htmlFor="reg-search" className={LABEL}>
            Search applications
          </label>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
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
                id="reg-search"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                maxLength={100}
                placeholder="Name, reference, email, NIC or phone"
                className={`${FIELD} h-11 pl-10`}
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-ink px-5 text-[0.875rem] font-semibold text-white shadow-[0_6px_16px_-8px_rgba(16,27,48,0.6)] transition-colors hover:bg-ink-soft"
            >
              Search
            </button>
          </div>
        </form>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <label htmlFor="reg-package" className={LABEL}>
              Package
            </label>
            <div className="relative">
              <select id="reg-package" value={filters.packageId} onChange={(event) => changeFilters({ packageId: event.target.value })} className={`${SELECT} h-11`}>
                <option value="">All packages</option>
                {packages.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <ChevronIcon />
            </div>
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="reg-order" className={LABEL}>
              Sort by submission
            </label>
            <div className="relative">
              <select
                id="reg-order"
                value={filters.order}
                onChange={(event) => changeFilters({ order: event.target.value as Filters["order"] })}
                className={`${SELECT} h-11`}
              >
                <option value="oldest">Oldest first</option>
                <option value="newest">Newest first</option>
              </select>
              <ChevronIcon />
            </div>
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="reg-from" className={LABEL}>
              Submitted from
            </label>
            <input
              id="reg-from"
              type="date"
              value={filters.from}
              max={filters.to || undefined}
              onChange={(event) => changeFilters({ from: event.target.value })}
              className={`${FIELD} h-11 [color-scheme:light]`}
            />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="reg-to" className={LABEL}>
              Submitted to
            </label>
            <input
              id="reg-to"
              type="date"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(event) => changeFilters({ to: event.target.value })}
              className={`${FIELD} h-11 [color-scheme:light]`}
            />
          </div>
        </div>
        {filtered && (
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 text-[0.8125rem] font-semibold text-gold-ink underline-offset-4 hover:underline"
          >
            Clear search and filters
          </button>
        )}

        {loadError && (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[0.875rem] text-red-700">
            {loadError}
          </p>
        )}

        {items.length === 0 && !loadError ? (
          <div className="mt-6 rounded-2xl border border-dashed border-line bg-white/60 px-5 py-10 text-center">
            <p className="text-[0.9375rem] font-semibold text-ink">
              {filtered ? "No applications match these filters." : "No applications in this list."}
            </p>
            {filtered && <p className="mt-1 text-[0.8125rem] text-muted">Try a different search or clear the filters.</p>}
          </div>
        ) : (
          <ul className="mt-5 grid gap-2.5">
            {items.map((item) => {
              const active = selectedId === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => choose(item.id)}
                    aria-current={active ? "true" : undefined}
                    className={`group flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition-all ${
                      active
                        ? "border-gold/70 bg-gold-soft/60 shadow-[0_8px_20px_-14px_rgba(117,83,0,0.6)]"
                        : "border-line bg-white hover:-translate-y-px hover:border-gold/50 hover:shadow-[0_10px_24px_-18px_rgba(16,27,48,0.45)]"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[0.8125rem] font-bold ${
                        active ? "bg-gold text-ink" : "bg-page text-ink-soft ring-1 ring-line"
                      }`}
                    >
                      {initialsOf(item.fullName)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate font-semibold text-ink">{item.fullName}</span>
                        <StatusBadge status={item.status} label={labels.registrationStatus[item.status] ?? item.status} />
                      </span>
                      <span className="mt-0.5 block font-mono text-[0.75rem] text-muted">{item.referenceNumber}</span>
                      <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-muted">
                        <span className="rounded-md bg-page px-2 py-0.5 font-medium text-ink-soft ring-1 ring-line">
                          {item.selectedPackage.name}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Submitted {formatDateTime(new Date(item.submittedAt))}</span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {pageCount > 1 && (
          <nav aria-label="Pages of applications" className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className={BUTTON_SECONDARY}
            >
              Previous
            </button>
            <span className="text-[0.8125rem] text-muted">
              Page {page} of {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              disabled={page >= pageCount}
              className={BUTTON_SECONDARY}
            >
              Next
            </button>
          </nav>
        )}
      </section>

      <section aria-labelledby="detail-heading" className="glass rounded-[22px] p-5 sm:p-6 lg:sticky lg:top-6">
        <h2 id="detail-heading" className="text-[1.125rem] font-bold text-ink">
          Application details
        </h2>

        {notice && (
          <p role="status" className="mt-4 rounded-xl border border-success/20 bg-success-soft px-4 py-3 text-[0.875rem] text-success">
            {notice}
          </p>
        )}
        {actionError && (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[0.875rem] text-red-700">
            {actionError}
          </p>
        )}

        {!detail ? (
          <div className="mt-6 rounded-2xl border border-dashed border-line bg-white/60 px-5 py-12 text-center">
            <p className="text-[0.9375rem] text-muted">Choose an application from the queue to review it.</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-5">
            <div className="flex items-center gap-4 rounded-2xl bg-page p-4 ring-1 ring-line">
              <span
                aria-hidden="true"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink text-[1rem] font-bold text-white"
              >
                {initialsOf(detail.fullName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[1.0625rem] font-bold text-ink">{detail.fullName}</p>
                <p className="mt-0.5 font-mono text-[0.75rem] text-muted">{detail.referenceNumber}</p>
              </div>
              <StatusBadge status={detail.status} label={labels.registrationStatus[detail.status] ?? detail.status} />
            </div>

            <dl className="grid gap-x-6 gap-y-4 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2">
              <Field label="Date of birth" value={formatDate(detail.birthday.slice(0, 10))} />
              <Field label="NIC" value={detail.nicNumber} />
              <Field label="Mobile" value={detail.phoneNumber} />
              <Field label="Email" value={detail.email} />
              <Field label="Address" value={detail.address} wide />
              <Field label="Package" value={detail.selectedPackage.name} />
              <Field label="Price at submission" value={formatMoney(Number(detail.packagePriceAtSubmission))} />
              <Field label="Submitted" value={formatDateTime(new Date(detail.submittedAt))} />
              {detail.reviewedAt && <Field label="Reviewed" value={formatDateTime(new Date(detail.reviewedAt))} />}
              {detail.reviewedByUserId && <Field label="Reviewed by" value={detail.reviewedByUserId} />}
              {detail.approvedStudentUserId && <Field label="Student ID" value={detail.approvedStudentUserId} />}
              {detail.rejectionReason && <Field label="Rejection reason" value={detail.rejectionReason} wide />}
              {detail.additionalNote && <Field label="Applicant's note" value={detail.additionalNote} wide />}
            </dl>

            <Section id="history-heading" title="History">
              <ol className="relative grid gap-3 border-l border-line pl-5">
                {detail.history.map((entry, index) => (
                  <li key={`${entry.at}-${index}`} className="relative">
                    <span aria-hidden="true" className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full bg-gold-dark ring-4 ring-white" />
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
            </Section>

            {detail.payments.length > 0 && (
              <Section id="payments-heading" title="Payments recorded">
                <ul className="grid gap-3">
                  {detail.payments.map((payment) => (
                    <li key={payment.id} className="grid gap-3 rounded-2xl border border-line bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[1rem] font-bold text-ink">{formatMoney(Number(payment.amount))}</span>
                        <span className="rounded-full bg-page px-2.5 py-0.5 text-[0.75rem] font-semibold text-ink-soft ring-1 ring-line">
                          {labels.paymentStatus[payment.status] ?? payment.status} · {formatDate(payment.paymentDate.slice(0, 10))}
                        </span>
                      </div>
                      <p className="text-[0.8125rem] leading-relaxed text-muted">
                        {paymentMethodLabel(payment.paymentMethod)}
                        {payment.bankName ? ` · ${payment.bankName}` : ""}
                        {payment.branch ? `, ${payment.branch}` : ""}
                        {payment.accountHolderName ? ` · ${payment.accountHolderName}` : ""}
                        {payment.accountNumberLast4 ? ` · account ending ${payment.accountNumberLast4}` : ""}
                        {payment.transactionReference ? ` · reference ${payment.transactionReference}` : ""}
                      </p>
                      {payment.slips.length > 0 ? (
                        <ul className="flex flex-wrap gap-2">
                          {payment.slips.map((slip) => (
                            <li key={slip.id}>
                              <a
                                href={`/api/admin/payment-slips/${encodeURIComponent(slip.id)}`}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-gold-soft px-3 py-1.5 text-[0.8125rem] font-semibold text-gold-ink transition-colors hover:bg-gold/50"
                              >
                                Open slip: {slip.originalFileName}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[0.8125rem] text-muted">No slip attached.</p>
                      )}
                      {payment.status === "REJECTED" && payment.reviewHistory[0]?.reason && (
                        <p className="rounded-lg bg-red-50 px-3 py-2 text-[0.8125rem] text-red-700">Rejected: {payment.reviewHistory[0].reason}</p>
                      )}
                      {payment.status === "PENDING" && (
                        <div className="grid gap-2.5 border-t border-line pt-3">
                          <label htmlFor={`payment-reason-${payment.id}`} className={LABEL}>
                            Rejection reason (the applicant sees this if you reject)
                          </label>
                          <textarea
                            id={`payment-reason-${payment.id}`}
                            value={paymentReasons[payment.id] ?? ""}
                            onChange={(event) => setPaymentReasons((current) => ({ ...current, [payment.id]: event.target.value }))}
                            maxLength={REASON_MAX}
                            rows={2}
                            className={FIELD}
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => reviewPayment(payment.id, "APPROVED")}
                              className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 text-[0.875rem] font-semibold text-emerald-800 transition-colors hover:bg-emerald-50 disabled:opacity-60"
                            >
                              Approve payment
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => reviewPayment(payment.id, "REJECTED")}
                              className={BUTTON_DANGER}
                            >
                              Reject payment
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {canReview && (
              <div className="grid gap-5 rounded-2xl border border-line bg-white p-4">
                <div className="grid gap-2">
                  <p className="text-[0.9375rem] font-semibold text-ink">Decision</p>
                  <p className="text-[0.8125rem] text-muted">Approving creates the student account and enrollment. It does not change any payment.</p>
                  <button
                    type="button"
                    onClick={() => setConfirmApprove(true)}
                    disabled={busy}
                    className="inline-flex h-12 items-center justify-center rounded-xl bg-gold px-6 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] transition-colors hover:bg-gold-dark disabled:opacity-60"
                  >
                    Approve and create student account
                  </button>
                </div>

                <form onSubmit={rejectApplication} className="grid gap-2.5 border-t border-line pt-5">
                  <label htmlFor="reject-reason" className={LABEL}>
                    Rejection reason (shown to the school record)
                  </label>
                  <textarea
                    id="reject-reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    maxLength={REASON_MAX}
                    rows={3}
                    className={FIELD}
                  />
                  <button type="submit" disabled={busy} className={`${BUTTON_DANGER} justify-self-start`}>
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

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-3 border-t border-line pt-5">
      <h3 id={id} className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-muted">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">{label}</dt>
      <dd className="mt-1 break-words text-[0.9375rem] text-ink">{value}</dd>
    </div>
  );
}
