import EmptyState from "@/components/student/EmptyState";
import { formatDateTime, labels } from "@/components/student/format";
import PageIntro from "@/components/student/PageIntro";
import StatusBadge from "@/components/student/StatusBadge";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { getAppointments } from "@/lib/student/data";

export const metadata = { title: "Appointments | Student portal", robots: { index: false, follow: false } };

/**
 * Read-only. Students cannot reschedule, complete or set results. The school records those changes, and the
 * history below shows each change with its reason.
 */
export default async function StudentAppointmentsPage() {
  const user = await requirePortalUser("STUDENT");
  const { medical, exams } = await getAppointments(user.userId);

  return (
    <>
      <PageIntro
        title="Appointments"
        description="Your medical appointments and driving exams. The school sets and changes these. To ask for a change, contact the school."
      />

      <section aria-labelledby="medical-heading" className="glass rounded-[22px] p-6">
        <h2 id="medical-heading" className="text-[1.125rem] font-bold text-ink">
          Medical appointments
        </h2>
        <div className="mt-4 flex flex-col gap-4">
          {medical.length === 0 ? (
            <EmptyState title="No medical appointments" body="Your medical appointment appears here once the school schedules it." />
          ) : (
            medical.map((item) => (
              <article key={item.id} className="rounded-2xl border border-line bg-white/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-ink">{formatDateTime(item.appointmentDate)}</p>
                  <StatusBadge status={item.status} label={labels.medicalStatus[item.status]} />
                </div>
                {item.description && <p className="mt-2 text-[0.875rem] text-muted">{item.description}</p>}
                <History entries={item.dateHistory} />
              </article>
            ))
          )}
        </div>
      </section>

      <section aria-labelledby="exam-heading" className="glass rounded-[22px] p-6">
        <h2 id="exam-heading" className="text-[1.125rem] font-bold text-ink">
          Driving exams
        </h2>
        <div className="mt-4 flex flex-col gap-4">
          {exams.length === 0 ? (
            <EmptyState title="No exams scheduled" body="Your written test and driving trial appear here when the school schedules them." />
          ) : (
            exams.map((exam) => (
              <article key={exam.id} className="rounded-2xl border border-line bg-white/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">{labels.examType[exam.examType]}</p>
                    <p className="text-[0.8125rem] text-muted">
                      {formatDateTime(exam.scheduledDate)}
                      {exam.vehicleType ? ` · ${labels.vehicleType[exam.vehicleType]}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={exam.status} label={labels.examStatus[exam.status]} />
                    {exam.result && <StatusBadge status={exam.result} label={labels.examResult[exam.result]} />}
                  </div>
                </div>
                {exam.description && <p className="mt-2 text-[0.875rem] text-muted">{exam.description}</p>}
                <History entries={exam.dateHistory} />
              </article>
            ))
          )}
        </div>
      </section>
    </>
  );
}

function History({ entries }: { entries: { previousDate: Date; newDate: Date; reason: string | null; changedAt: Date }[] }) {
  if (entries.length === 0) return null;
  return (
    <details className="mt-3 text-[0.875rem]">
      <summary className="cursor-pointer font-semibold text-gold-ink hover:text-ink">Rescheduling history ({entries.length})</summary>
      <ul className="mt-2 flex flex-col gap-2 text-muted">
        {entries.map((entry, index) => (
          <li key={index}>
            Moved from {formatDateTime(entry.previousDate)} to {formatDateTime(entry.newDate)}
            {entry.reason ? `. Reason: ${entry.reason}` : ""}
          </li>
        ))}
      </ul>
    </details>
  );
}
