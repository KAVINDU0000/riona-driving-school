import Link from "next/link";
import Icon from "@/components/ui/Icon";
import EmptyState from "@/components/student/EmptyState";
import { formatDate, formatDateTime, formatMoney, labels } from "@/components/student/format";
import PageIntro from "@/components/student/PageIntro";
import StatusBadge from "@/components/student/StatusBadge";
import StudentStatCard from "@/components/student/StudentStatCard";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { getDashboard } from "@/lib/student/data";

export const metadata = { title: "Dashboard | Student portal", robots: { index: false, follow: false } };

const quickLinks = [
  { href: "/portal/student/lessons", label: "Book or view lessons", icon: "car" },
  { href: "/portal/student/payments", label: "Payments and slips", icon: "wallet" },
  { href: "/portal/student/appointments", label: "Medical and exams", icon: "calendar" },
  { href: "/portal/student/profile", label: "Update my details", icon: "user" },
];

export default async function StudentDashboardPage() {
  const user = await requirePortalUser("STUDENT");
  const data = await getDashboard(user.userId);
  const firstName = data.profile?.fullName.split(" ")[0] ?? "there";
  const remaining = data.enrollments.reduce((sum, e) => sum + e.progress.reduce((s, p) => s + p.remaining, 0), 0);

  return (
    <>
      <PageIntro title={`Welcome back, ${firstName}`} description="Your registration, lessons, progress and appointments in one place." />

      <section aria-labelledby="stats" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <h2 id="stats" className="sr-only">
          Summary
        </h2>
        <StudentStatCard
          label="Registration"
          icon="file-check"
          value={data.registration ? <StatusBadge status={data.registration.status} label={labels.registrationStatus[data.registration.status]} /> : "Not linked"}
          caption={data.registration ? data.registration.selectedPackage.name : "No approved application is linked to your account yet."}
        />
        <StudentStatCard
          label="Training progress"
          icon="badge-check"
          value={data.progress.required > 0 ? `${data.progress.completed} / ${data.progress.required}` : "No sessions yet"}
          caption={data.progress.required > 0 ? `${remaining} session${remaining === 1 ? "" : "s"} still to book` : "Sessions appear once you have an active enrollment."}
        />
        <StudentStatCard
          label="Next lesson"
          icon="car"
          value={data.nextLesson ? formatDate(data.nextLesson.lessonDate) : "None booked"}
          caption={data.nextLesson ? `${data.nextLesson.startTime}–${data.nextLesson.endTime} · ${labels.vehicleType[data.nextLesson.vehicleType]}` : "Book a practical lesson from the Lessons page."}
        />
        <StudentStatCard
          label="Attendance"
          icon="check-circle"
          value={data.attendance.present + data.attendance.absent + data.attendance.late > 0 ? `${data.attendance.present} present` : "No record"}
          caption={`${data.attendance.absent} absent · ${data.attendance.late} late · ${data.attendance.notRecorded} not yet recorded`}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section aria-labelledby="enrollments-heading" className="glass rounded-[22px] p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 id="enrollments-heading" className="text-[1.125rem] font-bold text-ink">
              Your enrollments
            </h2>
            <Link href="/portal/student/enrollments" className="text-[0.8125rem] font-semibold text-gold-ink hover:text-ink">
              View all
            </Link>
          </div>
          <div className="mt-4 flex flex-col gap-4">
            {data.enrollments.length === 0 ? (
              <EmptyState title="No enrollments yet" body="Your training package appears here once your application is approved and enrolled." />
            ) : (
              data.enrollments.map((enrollment) => (
                <article key={enrollment.id} className="rounded-2xl border border-line bg-white/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-ink">{enrollment.packageName}</h3>
                    <StatusBadge status={enrollment.status} label={labels.enrollmentStatus[enrollment.status]} />
                  </div>
                  <ul className="mt-3 flex flex-col gap-3">
                    {enrollment.progress.map((item) => {
                      const percent = item.requiredSessions > 0 ? Math.round((item.completed / item.requiredSessions) * 100) : 0;
                      return (
                        <li key={item.id}>
                          <div className="flex justify-between text-[0.8125rem] text-muted">
                            <span>
                              {labels.vehicleType[item.vehicleType]} · {labels.trainingType[item.trainingType]}
                            </span>
                            <span>
                              {item.completed} of {item.requiredSessions} completed
                            </span>
                          </div>
                          <div
                            className="mt-1.5 h-2 overflow-hidden rounded-full bg-page"
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={item.requiredSessions}
                            aria-valuenow={item.completed}
                            aria-label={`${labels.vehicleType[item.vehicleType]} sessions completed`}
                          >
                            <div className="h-full rounded-full bg-gold" style={{ width: `${percent}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-3 text-[0.8125rem] text-muted">
                    Approved payments: {formatMoney(enrollment.approvedPaid)} of {formatMoney(enrollment.finalFee)} fee.
                  </p>
                </article>
              ))
            )}
          </div>
        </section>

        <section aria-labelledby="appointments-heading" className="glass rounded-[22px] p-6">
          <h2 id="appointments-heading" className="text-[1.125rem] font-bold text-ink">
            Upcoming appointments
          </h2>
          <div className="mt-4 flex flex-col gap-3">
            {data.upcomingAppointments.length === 0 ? (
              <EmptyState title="Nothing scheduled" body="Medical and driving exam appointments appear here once the school schedules them." />
            ) : (
              data.upcomingAppointments.map((item, index) => (
                <div key={index} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white/70 p-4">
                  <div>
                    <p className="font-semibold text-ink">{item.kind === "medical" ? "Medical appointment" : "Driving exam"}</p>
                    <p className="text-[0.8125rem] text-muted">{formatDateTime(item.date)}</p>
                  </div>
                  <StatusBadge status={item.status} label={item.status.charAt(0) + item.status.slice(1).toLowerCase()} />
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section aria-labelledby="recent-heading" className="glass rounded-[22px] p-6">
        <h2 id="recent-heading" className="text-[1.125rem] font-bold text-ink">
          Recent lessons
        </h2>
        <div className="mt-4">
          {data.recentLessons.length === 0 ? (
            <EmptyState title="No past lessons yet" body="Completed lessons appear here with their attendance and any feedback from your instructor." action={{ label: "Go to lessons", href: "/portal/student/lessons" }} />
          ) : (
            <ul className="divide-y divide-line">
              {data.recentLessons.map((lesson) => (
                <li key={lesson.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold text-ink">
                      {formatDate(lesson.lessonDate)} · {lesson.startTime}–{lesson.endTime}
                    </p>
                    <p className="text-[0.8125rem] text-muted">
                      {labels.vehicleType[lesson.vehicleType]} · {lesson.instructorName}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <StatusBadge status={lesson.status} label={labels.lessonStatus[lesson.status]} />
                    {lesson.attendance && <StatusBadge status={lesson.attendance} label={labels.attendance[lesson.attendance]} />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <nav aria-label="Quick links" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href} className="glass flex items-center gap-3 rounded-2xl p-4 text-[0.9375rem] font-semibold text-ink transition-colors hover:ring-1 hover:ring-gold/60">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gold-soft text-gold-ink ring-1 ring-gold/50">
              <Icon name={link.icon} className="h-[18px] w-[18px]" />
            </span>
            {link.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
