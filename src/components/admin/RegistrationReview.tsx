"use client";

import { useEffect, useState, type FormEvent } from "react";
import ConfirmDialog from "@/components/student/ConfirmDialog";
import { formatDate, formatDateTime, formatMoney, labels } from "@/components/student/format";
import StatusBadge from "@/components/student/StatusBadge";

type Filter = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ALL", label: "All" },
];

const REASON_MIN = 10;
const REASON_MAX = 500;

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
  rejectionReason: string | null;
  approvedStudentUserId: string | null;
};

/** Reads the error message the API returns. Responses never include stack traces or internal details. */
async function errorFrom(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

/** Admin review queue: list applications, inspect one, approve or reject it. Every action is checked again on the server. */
export default function RegistrationReview() {
  const [filter, setFilter] = useState<Filter>("PENDING");
  const [items, setItems] = useState<Summary[]>([]);
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
    fetch(`/api/admin/registrations?status=${filter}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(await errorFrom(response, "The applications could not be loaded."));
        return (await response.json()) as { registrations: Summary[] };
      })
      .then((body) => {
        if (!active) return;
        setItems(body.registrations);
        setLoadError("");
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : "The applications could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, [filter, listVersion]);

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

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <section aria-labelledby="queue-heading" className="glass rounded-[22px] p-5">
        <h2 id="queue-heading" className="text-[1.125rem] font-bold text-ink">
          Registration queue
        </h2>
        <div role="tablist" aria-label="Filter applications" className="mt-4 flex flex-wrap gap-2">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={`rounded-full px-3.5 py-1.5 text-[0.8125rem] font-semibold ring-1 ${
                filter === option.value ? "bg-gold-soft text-gold-ink ring-gold/60" : "bg-white text-muted ring-line"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {loadError && <p role="alert" className="mt-4 text-[0.875rem] text-red-700">{loadError}</p>}

        {items.length === 0 && !loadError ? (
          <p className="mt-6 text-[0.9375rem] text-muted">No applications in this list.</p>
        ) : (
          <ul className="mt-4 grid gap-2">
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
              {detail.approvedStudentUserId && <Field label="Student ID" value={detail.approvedStudentUserId} />}
              {detail.rejectionReason && <Field label="Rejection reason" value={detail.rejectionReason} />}
            </dl>
            {detail.additionalNote && <Field label="Applicant's note" value={detail.additionalNote} />}

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
          enrollment in {detail?.selectedPackage.name ?? "the selected package"}. No payment is recorded.
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
