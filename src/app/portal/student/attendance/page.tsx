import EmptyState from "@/components/student/EmptyState";
import { formatDate, labels } from "@/components/student/format";
import PageIntro from "@/components/student/PageIntro";
import StatusBadge from "@/components/student/StatusBadge";
import StudentStatCard from "@/components/student/StudentStatCard";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { getAttendance } from "@/lib/student/data";
import SectionTitle from "@/components/student/SectionTitle";

export const metadata = { title: "Attendance | Student portal", robots: { index: false, follow: false } };

export default async function StudentAttendancePage() {
  const user = await requirePortalUser("STUDENT");
  const { rows, summary } = await getAttendance(user.userId);

  return (
    <>
      <PageIntro title="Attendance" description="Attendance is recorded by your instructor after each lesson. You can view it here but cannot change it." />

      <section aria-labelledby="summary-heading" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <h2 id="summary-heading" className="sr-only">
          Attendance summary
        </h2>
        <StudentStatCard label="Present" icon="check-circle" value={summary.present} caption="Lessons attended" />
        <StudentStatCard label="Late" icon="clock" value={summary.late} caption="Arrived after the start" />
        <StudentStatCard label="Absent" icon="x-circle" value={summary.absent} caption="Missed lessons" />
        <StudentStatCard label="Not yet recorded" icon="info" value={summary.notRecorded} caption="Waiting for the instructor" />
      </section>

      <section aria-labelledby="records-heading" className="glass rounded-[22px] p-6">
        <SectionTitle id="records-heading" icon="check-circle" tone="amber">Attendance records</SectionTitle>
        <div className="mt-4">
          {rows.length === 0 ? (
            <EmptyState title="No lessons yet" body="Attendance appears here after your first booked lesson." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-[0.875rem]">
                <caption className="sr-only">Your lessons and their attendance</caption>
                <thead>
                  <tr className="text-muted">
                    <th scope="col" className="border-b border-line px-3 py-2 font-semibold">Date</th>
                    <th scope="col" className="border-b border-line px-3 py-2 font-semibold">Time</th>
                    <th scope="col" className="border-b border-line px-3 py-2 font-semibold">Length</th>
                    <th scope="col" className="border-b border-line px-3 py-2 font-semibold">Vehicle</th>
                    <th scope="col" className="border-b border-line px-3 py-2 font-semibold">Lesson</th>
                    <th scope="col" className="border-b border-line px-3 py-2 font-semibold">Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="text-ink">
                      <td className="border-b border-line px-3 py-3">{formatDate(row.lessonDate)}</td>
                      <td className="border-b border-line px-3 py-3">
                        {row.startTime}–{row.endTime}
                      </td>
                      <td className="border-b border-line px-3 py-3">{row.durationMinutes} min</td>
                      <td className="border-b border-line px-3 py-3">{labels.vehicleType[row.vehicleType]}</td>
                      <td className="border-b border-line px-3 py-3">
                        <StatusBadge status={row.status} label={labels.lessonStatus[row.status]} />
                      </td>
                      <td className="border-b border-line px-3 py-3">
                        {row.attendance ? (
                          <StatusBadge status={row.attendance} label={labels.attendance[row.attendance]} />
                        ) : (
                          <span className="text-muted">Not yet recorded</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
