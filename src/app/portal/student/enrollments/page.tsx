import EmptyState from "@/components/student/EmptyState";
import { formatDate, formatMoney, labels } from "@/components/student/format";
import PageIntro from "@/components/student/PageIntro";
import StatusBadge from "@/components/student/StatusBadge";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { getEnrollments } from "@/lib/student/data";

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
                  <h2 id={`enrollment-${enrollment.id}`} className="text-[1.25rem] font-bold text-ink">
                    {enrollment.packageName}
                  </h2>
                  <p className="mt-1 text-[0.8125rem] text-muted">Enrolled {formatDate(enrollment.enrollmentDate.toISOString().slice(0, 10))}</p>
                </div>
                <StatusBadge status={enrollment.status} label={labels.enrollmentStatus[enrollment.status]} />
              </div>

              <dl className="mt-5 grid gap-4 text-[0.9375rem] sm:grid-cols-3">
                <div>
                  <dt className="text-[0.8125rem] font-semibold text-muted">Agreed price</dt>
                  <dd className="mt-1 font-medium text-ink">{formatMoney(enrollment.agreedPrice)}</dd>
                </div>
                <div>
                  <dt className="text-[0.8125rem] font-semibold text-muted">Final fee</dt>
                  <dd className="mt-1 font-medium text-ink">{formatMoney(enrollment.finalFee)}</dd>
                </div>
                <div>
                  <dt className="text-[0.8125rem] font-semibold text-muted">Approved payments</dt>
                  <dd className="mt-1 font-medium text-ink">{formatMoney(enrollment.approvedPaid)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-[0.8125rem] text-muted">
                The outstanding balance is not calculated automatically yet. Discounts and payment terms are confirmed by the school.
              </p>

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
