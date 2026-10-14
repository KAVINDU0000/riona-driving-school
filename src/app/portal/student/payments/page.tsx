import EmptyState from "@/components/student/EmptyState";
import { formatDate, formatMoney, labels } from "@/components/student/format";
import PageIntro from "@/components/student/PageIntro";
import PaymentSlipForm from "@/components/student/PaymentSlipForm";
import StatusBadge from "@/components/student/StatusBadge";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { canUploadSlip, getPayments } from "@/lib/student/data";

export const metadata = { title: "Payments | Student portal", robots: { index: false, follow: false } };

export default async function StudentPaymentsPage() {
  const user = await requirePortalUser("STUDENT");
  const payments = await getPayments(user.userId);

  return (
    <>
      <PageIntro
        title="Payments"
        description="Your payment history. Upload a slip for a pending bank transfer or deposit. Payments are approved only by the school."
      />

      {payments.length === 0 ? (
        <EmptyState title="No payments yet" body="Payments on your enrollments appear here. The school records each one when it is received." />
      ) : (
        <ul className="flex flex-col gap-5">
          {payments.map((payment) => (
            <li key={payment.id} className="glass rounded-[22px] p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[1.125rem] font-bold text-ink">{formatMoney(payment.amount)}</p>
                  <p className="mt-1 text-[0.8125rem] text-muted">
                    {formatDate(payment.paymentDate.toISOString().slice(0, 10))} · {labels.paymentMethod[payment.method]}
                    {payment.appliesTo ? ` · ${payment.appliesTo.label}` : ""}
                  </p>
                </div>
                <StatusBadge status={payment.status} label={labels.paymentStatus[payment.status]} />
              </div>

              <dl className="mt-4 grid gap-3 text-[0.875rem] sm:grid-cols-3">
                <div>
                  <dt className="text-muted">Bank</dt>
                  <dd className="font-medium text-ink">{payment.bankName ?? "Not recorded"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Reference</dt>
                  <dd className="font-medium text-ink">{payment.transactionReference ?? "Not recorded"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Account</dt>
                  <dd className="font-medium text-ink">{payment.accountLast4 ? `Ending ${payment.accountLast4}` : "Not recorded"}</dd>
                </div>
              </dl>

              {payment.status === "REJECTED" && (
                <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[0.875rem] text-red-700">
                  Rejected{payment.rejectionReason ? `: ${payment.rejectionReason}` : ". Contact the school for details."}
                </p>
              )}

              {payment.status === "APPROVED" && payment.reviewedAt && (
                <p className="mt-4 text-[0.8125rem] text-success">Approved on {formatDate(payment.reviewedAt.toISOString().slice(0, 10))}.</p>
              )}

              <div className="mt-5 border-t border-line pt-4">
                <h2 className="text-[0.9375rem] font-semibold text-ink">Payment slips</h2>
                {payment.slips.length === 0 ? (
                  <p className="mt-2 text-[0.8125rem] text-muted">No slips uploaded for this payment.</p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-2">
                    {payment.slips.map((slip) => (
                      <li key={slip.id} className="flex flex-wrap items-center justify-between gap-2 text-[0.875rem]">
                        <span className="text-ink">{slip.fileName}</span>
                        <a
                          href={`/api/student/payments/slips/${slip.id}`}
                          className="font-semibold text-gold-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
                        >
                          Download<span className="sr-only"> {slip.fileName}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}

                {canUploadSlip(payment) ? (
                  <div className="mt-4">
                    <PaymentSlipForm paymentId={payment.id} />
                    <p className="mt-2 text-[0.75rem] text-muted">JPEG, PNG or PDF, up to 5 MB.</p>
                  </div>
                ) : (
                  <p className="mt-3 text-[0.8125rem] text-muted">Slips can be added while a payment is pending.</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
