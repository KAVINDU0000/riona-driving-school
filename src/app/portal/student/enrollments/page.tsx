import Link from "next/link";
import EmptyState from "@/components/student/EmptyState";
import { formatDate, formatMoney, labels } from "@/components/student/format";
import PageIntro from "@/components/student/PageIntro";
import StatusBadge from "@/components/student/StatusBadge";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { getEnrollments } from "@/lib/student/data";
import SectionTitle from "@/components/student/SectionTitle";

export const metadata = { title: "Enrollments | Student portal", robots: { index: false, follow: false } };

export default async function StudentEnrollmentsPage() {
  const user = await requirePortalUser("STUDENT");
  const enrollments = await getEnrollments(user.userId);

  return (
    <>
      <PageIntro
        title="Enrollments"
        description="Each enrollment keeps its own fees, sessions and payments. Several enrollments can be active at the same time."
      />

      {enrollments.length === 0 ? (
        <EmptyState title="No enrollments yet" body="Your training package appears here once your application is approved and enrolled." />
      ) : (
        <div className="flex flex-col gap-6">
          {enrollments.map((enrollment) => (
            <article key={enrollment.id} aria-labelledby={`enrollment-${enrollment.id}`} className="glass rounded-[22px] p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <SectionTitle id={`enrollment-${enrollment.id}`} icon="book" tone="gold">
                    {enrollment.packageName}
                  </SectionTitle>
                  <p className="mt-1 pl-13 text-[0.8125rem] text-muted">Enrolled {formatDate(enrollment.enrollmentDate.toISOString().slice(0, 10))}</p>
                </div>
                <StatusBadge status={enrollment.status} label={labels.enrollmentStatus[enrollment.status]} />
              </div>

              <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Agreed price", value: enrollment.agreedPrice },
                  { label: "Final fee", value: enrollment.finalFee },
                  { label: "Paid so far", value: enrollment.approvedPaid },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-page px-4 py-3 ring-1 ring-line">
                    <dt className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-muted">{item.label}</dt>
                    <dd className="mt-1 text-[1.0625rem] font-bold text-ink">{formatMoney(item.value)}</dd>
                  </div>
                ))}
              </dl>

              {enrollment.balance > 0 ? (
                <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-gold/60 bg-gold-soft/50 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-gold-ink">Balance to pay</p>
                    <p className="mt-1 text-[1.5rem] font-bold leading-tight text-ink">{formatMoney(enrollment.balance)}</p>
                    {enrollment.balanceDueBy && (
                      <p className="mt-1.5 text-[0.875rem] text-muted">
                        Must be received by <span className="font-semibold text-ink">{formatDate(enrollment.balanceDueBy)}</span>.
                        You can pay it in one part or two.
                      </p>
                    )}
                  </div>
                  {enrollment.canPayBalance ? (
                    <div className="flex flex-col gap-1.5 sm:items-end">
                      <Link
                        href={`/portal/student/enrollments/${enrollment.id}/balance`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] transition-colors hover:bg-gold-dark"
                      >
                        Pay the balance
                        <span aria-hidden="true">→</span>
                      </Link>
                      <p className="text-[0.75rem] text-muted">You will confirm with your password.</p>
                    </div>
                  ) : (
                    <p className="text-[0.8125rem] text-muted sm:max-w-[16rem] sm:text-right">
                      To pay this balance, contact the school.
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-3 rounded-2xl bg-success-soft px-5 py-4">
                  <span className="text-[0.9375rem] font-bold text-success">Fully paid</span>
                  <span className="text-[0.8125rem] text-success">Thank you. No balance is left for this enrollment.</span>
                </div>
              )}
              <p className="mt-3 text-[0.8125rem] text-muted">Discounts and payment terms are confirmed by the school.</p>

              <h3 className="mt-6 text-[0.9375rem] font-semibold text-ink">Training requirements</h3>
              {enrollment.progress.length === 0 ? (
                <p className="mt-2 text-[0.875rem] text-muted">This enrollment has no training requirements recorded.</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[560px] border-separate border-spacing-0 text-left text-[0.875rem]">
                    <caption className="sr-only">Training requirements for {enrollment.packageName}</caption>
                    <thead>
                      <tr className="text-muted">
                        <th scope="col" className="border-b border-line px-3 py-2 font-semibold">Vehicle</th>
                        <th scope="col" className="border-b border-line px-3 py-2 font-semibold">Training</th>
                        <th scope="col" className="border-b border-line px-3 py-2 font-semibold">Required</th>
                        <th scope="col" className="border-b border-line px-3 py-2 font-semibold">Completed</th>
                        <th scope="col" className="border-b border-line px-3 py-2 font-semibold">Scheduled</th>
                        <th scope="col" className="border-b border-line px-3 py-2 font-semibold">Remaining</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrollment.progress.map((item) => (
                        <tr key={item.id} className="text-ink">
                          <th scope="row" className="border-b border-line px-3 py-3 font-semibold">{labels.vehicleType[item.vehicleType]}</th>
                          <td className="border-b border-line px-3 py-3">{labels.trainingType[item.trainingType]}</td>
                          {item.requiredSessions === null ? (
                            <td colSpan={4} className="border-b border-line px-3 py-3 text-muted">Allocation pending</td>
                          ) : (
                            <>
                              <td className="border-b border-line px-3 py-3">{item.requiredSessions}</td>
                              <td className="border-b border-line px-3 py-3">{item.completed}</td>
                              <td className="border-b border-line px-3 py-3">{item.scheduled}</td>
                              <td className="border-b border-line px-3 py-3">{item.remaining}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-3 text-[0.8125rem] text-muted">
                Default lesson length is 30 minutes. Standard 60-minute lessons are also available
                {enrollment.sessionDurationMinutes ? `, along with ${enrollment.sessionDurationMinutes} minutes for this package` : ""}.
              </p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
