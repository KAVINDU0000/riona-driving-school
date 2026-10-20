"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/Icon";
import PaymentForm from "@/components/auth/PaymentForm";
import { formatLkr } from "@/lib/packages/format";

/** The status the server returns after a successful check. Mirrors readApplicationStatus. */
type PaymentView = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  amount: string;
  paymentMethod: string;
  paymentDate: string;
  submittedAt: string;
  bankName: string | null;
  accountHolderName: string | null;
  accountNumberLast4: string | null;
  branch: string | null;
  rejectionReason: string | null;
};

type StatusView = {
  referenceNumber: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
  email: string;
  package: { name: string; price: string };
  rejectionReason: string | null;
  studentUserId: string | null;
  payments: PaymentView[];
  instalments: {
    allowed: boolean;
    fee: number;
    approvedPaid: number;
    balance: number;
    balanceDueBy: string | null;
    deadlinePassed: boolean;
    canPayBalance: boolean;
  };
  canResubmit: boolean;
  previousBank: { paymentMethod: string; bankName: string; accountHolderName: string; branch: string } | null;
};

type Credentials = { referenceNumber: string; password: string };

const inputBase =
  "h-12 w-full rounded-xl border bg-white pl-11 pr-4 text-[0.9375rem] text-ink placeholder:text-muted/70 transition-[border-color,box-shadow] focus:border-gold-dark focus:outline-none focus:ring-4 focus:ring-gold/25";

const APPLICATION_LABEL: Record<StatusView["status"], string> = {
  PENDING: "Under review",
  APPROVED: "Approved",
  REJECTED: "Not approved",
};

/** Reads the message the API returns. Responses never include internal details. */
async function errorFrom(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

function Panel({ tone, title, children }: { tone: "ok" | "warn" | "bad" | "neutral"; title: string; children: ReactNode }) {
  const toneClass = {
    ok: "bg-success-soft text-success",
    warn: "bg-gold-soft text-gold-ink",
    bad: "bg-red-50 text-red-700",
    neutral: "bg-page text-ink ring-1 ring-line",
  }[tone];
  return (
    <section className={`flex flex-col gap-2 rounded-2xl px-5 py-4 ${toneClass}`} aria-label={title}>
      <h3 className="text-[1rem] font-bold">{title}</h3>
      <div className="text-[0.9375rem] leading-relaxed">{children}</div>
    </section>
  );
}

/**
 * Applicant status page. The reference number and password are checked on every request. They are kept only in
 * this page's memory, so closing the page signs the applicant out.
 */
export default function ApplicationStatus({ initialReference = "" }: { initialReference?: string }) {
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [status, setStatus] = useState<StatusView | null>(null);
  const [referenceInput, setReferenceInput] = useState(initialReference);
  const [passwordInput, setPasswordInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  const [payingBalance, setPayingBalance] = useState(false);
  // While the balance dialog is open, the page behind it does not scroll.
  useEffect(() => {
    if (!payingBalance) return;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previous;
    };
  }, [payingBalance]);

  async function loadStatus(next: Credentials) {
    const response = await fetch("/api/registration/status", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify(next),
    });
    if (!response.ok) throw new Error(await errorFrom(response, "The status could not be loaded. Try again."));
    const body = (await response.json()) as { status: StatusView };
    return body.status;
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const next = { referenceNumber: referenceInput.trim().toUpperCase(), password: passwordInput };
    try {
      const loaded = await loadStatus(next);
      setCredentials(next);
      setStatus(loaded);
      setPasswordInput("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The status could not be loaded. Try again.");
    } finally {
      setBusy(false);
    }
  }

  /** Reloads the status after a slip is accepted. The form stays open so the applicant sees the confirmation. */
  async function refreshStatus() {
    if (!credentials) return;
    setBusy(true);
    try {
      setStatus(await loadStatus(credentials));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The status could not be loaded. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    setCredentials(null);
    setStatus(null);
    setResubmitting(false);
    setError("");
  }

  if (!credentials || !status) {
    return (
      <form onSubmit={handleLogin} noValidate autoComplete="off" className="flex flex-col gap-5">
        <div>
          <h2 className="text-[1.5rem] font-bold leading-tight tracking-[-0.02em] text-ink">Check your application</h2>
          <p className="mt-1.5 text-[0.875rem] text-muted">Enter the reference number from your signup and the password you chose.</p>
        </div>

        <label htmlFor="statusReference" className="flex flex-col gap-2 text-[0.8125rem] font-semibold text-ink">
          Reference number *
          <div className="relative">
            <Icon name="file-check" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
            <input
              id="statusReference"
              name="referenceNumber"
              placeholder="RDS-XXXXXXXXXX"
              value={referenceInput}
              onChange={(event) => setReferenceInput(event.target.value)}
              className={`${inputBase} border-line`}
            />
          </div>
        </label>

        <label htmlFor="statusPassword" className="flex flex-col gap-2 text-[0.8125rem] font-semibold text-ink">
          Password *
          <div className="relative">
            <Icon name="id-card" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
            <input
              id="statusPassword"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="The password you chose at signup"
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
              className={`${inputBase} border-line`}
            />
          </div>
        </label>

        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center rounded-xl bg-gold px-6 py-3.5 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] hover:bg-gold-dark disabled:opacity-60"
        >
          {busy ? "Checking…" : "Check status"}
        </button>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[0.8125rem] font-medium text-red-700">
            {error}
          </p>
        )}
      </form>
    );
  }

  const latest = status.payments[0] ?? null;

  return (
    <div className="flex flex-col gap-5" role="status">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[1.5rem] font-bold leading-tight tracking-[-0.02em] text-ink">Application {status.referenceNumber}</h2>
          <p className="mt-1 text-[0.875rem] text-muted">
            {status.package.name} · submitted {new Date(status.submittedAt).toLocaleDateString("en-GB")}
          </p>
        </div>
        <button type="button" onClick={signOut} className="text-[0.8125rem] font-semibold text-gold-ink underline underline-offset-2">
          Check another application
        </button>
      </div>

      <p className="text-[0.9375rem] font-semibold text-ink">Application: {APPLICATION_LABEL[status.status]}</p>

      {status.status === "REJECTED" && (
        <Panel tone="bad" title="This application was not approved">
          {status.rejectionReason ?? "The school has not approved this application. Contact the school for details."}
        </Panel>
      )}

      {status.status === "APPROVED" && (
        <Panel tone="ok" title="Your application is approved">
          {status.studentUserId && (
            <p className="font-semibold">
              Your user ID: <span className="font-bold tracking-[0.04em]">{status.studentUserId}</span>
            </p>
          )}
          <p className="mt-2">Sign in with this user ID and the password you chose at signup.</p>
        </Panel>
      )}

      {latest?.status === "APPROVED" && (
        <Panel tone="ok" title="Payment approved">
          <p>Your payment has been approved.</p>
        </Panel>
      )}

      {latest?.status === "PENDING" && (
        <Panel tone="warn" title="Payment slip received">
          Your payment slip is waiting for review. It is not approved yet. No action is needed.
        </Panel>
      )}

      {latest?.status === "REJECTED" && (
        <Panel tone="bad" title="Payment rejected">
          <p>The school could not accept this payment slip.</p>
          {latest.rejectionReason && <p className="mt-2 font-semibold">Reason: {latest.rejectionReason}</p>}
          {status.canResubmit && <p className="mt-2">Please send a new payment slip below.</p>}
        </Panel>
      )}

      {!latest && status.status === "PENDING" && (
        <Panel tone="neutral" title="No payment slip yet">
          Send your payment slip to continue your application.
        </Panel>
      )}

      {status.instalments.allowed && status.instalments.approvedPaid > 0 && status.instalments.balance > 0 && (
        <Panel tone="neutral" title="Your balance">
          <p>
            Paid so far: <span className="font-semibold">{formatLkr(status.instalments.approvedPaid)}</span> of{" "}
            {formatLkr(status.instalments.fee)}. Balance still to pay:{" "}
            <span className="font-semibold">{formatLkr(status.instalments.balance)}</span>.
          </p>
          {status.instalments.balanceDueBy && (
            <p className="mt-2">
              {status.instalments.deadlinePassed
                ? `The balance was due by ${status.instalments.balanceDueBy}. Contact the school.`
                : `The balance must be received by ${status.instalments.balanceDueBy}.`}
            </p>
          )}
          {status.instalments.canPayBalance && !payingBalance && (
            <button
              type="button"
              onClick={() => setPayingBalance(true)}
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-gold px-6 py-3.5 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] hover:bg-gold-dark"
            >
              Pay the balance
            </button>
          )}
        </Panel>
      )}

      {/* Portalled to the body: the form card uses a backdrop blur, which would otherwise trap the fixed dialog inside it. */}
      {payingBalance && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="balance-title"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-ink/40 p-4 backdrop-blur-sm"
        >
          <div className="glass w-full max-w-[980px] rounded-[28px] p-6 shadow-[0_30px_70px_-20px_rgb(40_60_90/0.4)] md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
              <div>
                <h2 id="balance-title" className="text-[1.375rem] font-bold leading-tight text-ink">
                  Pay the balance
                </h2>
                <p className="mt-1 text-[0.875rem] text-muted">
                  {status.package.name}
                  {status.instalments.balanceDueBy ? ` · must be received by ${status.instalments.balanceDueBy}` : ""}
                </p>
                <button
                  type="button"
                  onClick={() => setPayingBalance(false)}
                  className="mt-2 text-[0.8125rem] font-semibold text-gold-ink underline underline-offset-2"
                >
                  Cancel
                </button>
              </div>
              <div className="text-right">
                <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-gold-ink">Balance to pay now</p>
                <p className="text-[1.75rem] font-bold leading-tight text-ink">{formatLkr(status.instalments.balance)}</p>
              </div>
            </div>

            <div className="mt-6">
              <PaymentForm
                pkg={{ id: "", name: status.package.name, price: status.instalments.fee }}
                balanceDue={status.instalments.balance}
                applicationReference={status.referenceNumber}
                initialEmail={status.email}
                initialPassword={credentials.password}
                onSubmitted={() => {
                  setPayingBalance(false);
                  refreshStatus();
                }}
              />
            </div>
          </div>
        </div>,
        document.body,
      )}

      {status.canResubmit && !resubmitting && (
        <button
          type="button"
          onClick={() => setResubmitting(true)}
          className="inline-flex w-full items-center justify-center rounded-xl bg-gold px-6 py-3.5 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] hover:bg-gold-dark"
        >
          {latest?.status === "REJECTED" ? "Resubmit payment" : "Submit payment slip"}
        </button>
      )}

      {resubmitting && (
        <PaymentForm
          pkg={{
            id: "",
            name: status.package.name,
            price: Number(status.package.price),
            instalments: status.instalments.allowed,
          }}
          applicationReference={status.referenceNumber}
          initialEmail={status.email}
          initialPassword={credentials.password}
          initialBank={
            status.previousBank
              ? {
                  paymentMethod: status.previousBank.paymentMethod,
                  bankName: status.previousBank.bankName,
                  accountName: status.previousBank.accountHolderName,
                  branch: status.previousBank.branch,
                }
              : undefined
          }
          onSubmitted={refreshStatus}
        />
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[0.8125rem] font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
