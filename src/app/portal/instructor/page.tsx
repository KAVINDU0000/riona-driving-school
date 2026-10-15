import type { Metadata } from "next";
import Link from "next/link";
import InstructorFrame from "@/components/instructor/InstructorFrame";
import LessonItem from "@/components/instructor/LessonItem";
import EmptyState from "@/components/student/EmptyState";
import StudentStatCard from "@/components/student/StudentStatCard";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { getDashboardSummary } from "@/lib/instructor/lessons";
import { vehicleWarning } from "@/lib/instructor/lesson-rules";
import { formatDate } from "@/components/student/format";

export const metadata: Metadata = {
  title: "Instructor Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

/** Today's lessons, pending actions and upcoming schedule for the signed-in instructor. Every figure is read from lesson records. */
export default async function InstructorDashboardPage() {
  const user = await requirePortalUser("INSTRUCTOR");
  const data = await getDashboardSummary(user.userId);

  return (
    <InstructorFrame title="Dashboard" description="Today's lessons, anything that needs your action, and your upcoming schedule." active="/portal/instructor">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StudentStatCard label="Today's lessons" value={data.todayCount} caption="Excludes cancelled lessons" icon="calendar" />
        <StudentStatCard label="Upcoming" value={data.upcomingCount} caption="Scheduled after today" icon="car" />
        <StudentStatCard label="Completed today" value={data.completedToday} caption={formatDate(data.today)} icon="check-circle" />
        <StudentStatCard label="Needs action" value={data.pendingActions.length} caption="Ended, still open" icon="badge-check" />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section aria-labelledby="today-heading" className="grid content-start gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="today-heading" className="text-[1.125rem] font-bold text-ink">Today&apos;s schedule</h2>
            <Link href="/portal/instructor/lessons" className="text-[0.875rem] font-semibold text-gold-ink hover:underline">
              Full schedule
            </Link>
          </div>
          {data.todaysLessons.length === 0 ? (
            <EmptyState title="No lessons today" body="Lessons assigned to you for today appear here." />
          ) : (
            <ul className="grid gap-3">
              {data.todaysLessons.map((lesson) => (
                <LessonItem key={lesson.id} lesson={lesson} />
              ))}
            </ul>
          )}
        </section>

        <div className="grid content-start gap-8">
          <section aria-labelledby="pending-heading" className="grid gap-4">
            <h2 id="pending-heading" className="text-[1.125rem] font-bold text-ink">Needs your action</h2>
            {data.pendingActions.length === 0 ? (
              <EmptyState title="Nothing to action" body="Lessons that have ended but still need attendance or an outcome appear here." />
            ) : (
              <ul className="grid gap-3">
                {data.pendingActions.map(({ lesson, needs }) => (
                  <li key={lesson.id}>
                    <Link href={`/portal/instructor/lessons/${lesson.id}`} className="glass flex flex-col gap-1 rounded-2xl p-4 hover:bg-white">
                      <span className="text-[0.9375rem] font-bold text-ink">
                        {formatDate(lesson.lessonDate)} · {lesson.startTime}
                      </span>
                      <span className="text-[0.875rem] text-muted">{lesson.student.fullName}</span>
                      <span className="text-[0.8125rem] font-semibold text-gold-ink">
                        {needs === "attendance" ? "Record attendance" : "Mark completed or cancel"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="upcoming-heading" className="grid gap-4">
            <h2 id="upcoming-heading" className="text-[1.125rem] font-bold text-ink">Upcoming lessons</h2>
            {data.upcoming.length === 0 ? (
              <EmptyState title="No upcoming lessons" body="Scheduled lessons after today appear here." />
            ) : (
              <ul className="grid gap-3">
                {data.upcoming.map((lesson) => (
                  <LessonItem key={lesson.id} lesson={lesson} showDate />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="vehicles-heading" className="grid gap-4">
            <h2 id="vehicles-heading" className="text-[1.125rem] font-bold text-ink">Vehicles on your lessons</h2>
            {data.vehicles.length === 0 ? (
              <EmptyState title="No vehicles assigned" body="Vehicles on your scheduled lessons appear here." />
            ) : (
              <ul className="grid gap-2">
                {data.vehicles.map((vehicle) => (
                  <li key={vehicle.id} className="glass rounded-2xl p-4 text-[0.9375rem] text-ink">
                    <span className="font-semibold">{vehicle.label}</span>
                    <span className="ml-2 text-[0.8125rem] text-muted">{vehicle.registrationNumber}</span>
                    {vehicleWarning(vehicle.status) && <p className="mt-1 text-[0.8125rem] text-amber-800">{vehicleWarning(vehicle.status)}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </InstructorFrame>
  );
}
