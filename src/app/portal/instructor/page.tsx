import type { Metadata } from "next";
import Link from "next/link";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminStatCard from "@/components/admin/AdminStatCard";
import InstructorFrame from "@/components/instructor/InstructorFrame";
import LessonItem from "@/components/instructor/LessonItem";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { getDashboardSummary } from "@/lib/instructor/lessons";
import { vehicleWarning } from "@/lib/instructor/lesson-rules";
import { formatDate } from "@/components/student/format";

export const metadata: Metadata = {
  title: "Instructor Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

/** Admin list row: bordered white card, gold border on hover. */
const ROW = "flex flex-col gap-1 rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(16,27,48,0.04)] transition-all hover:border-gold/60 hover:shadow-[0_12px_28px_-18px_rgba(16,27,48,0.45)]";

/** Today's lessons, pending actions and upcoming schedule for the signed-in instructor. Every figure is read from lesson records. */
export default async function InstructorDashboardPage() {
  const user = await requirePortalUser("INSTRUCTOR");
  const data = await getDashboardSummary(user.userId);

  return (
    <InstructorFrame title="Dashboard" description="Today's lessons, anything that needs your action, and your upcoming schedule." active="/portal/instructor">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Today's lessons" value={data.todayCount} caption="Excludes cancelled lessons" icon="calendar" />
        <AdminStatCard label="Upcoming" value={data.upcomingCount} caption="Scheduled after today" icon="car" />
        <AdminStatCard label="Completed today" value={data.completedToday} caption={formatDate(data.today)} icon="check-circle" />
        <AdminStatCard label="Needs action" value={data.pendingActions.length} caption="Ended, still open" icon="badge-check" />
      </div>

      {data.availability.upcomingWindowCount === 0 ? (
        <p role="status" className="mt-6 rounded-2xl bg-amber-50 px-5 py-4 text-[0.9375rem] text-amber-900 ring-1 ring-amber-200">
          You have no availability set, so students cannot book lessons with you.{" "}
          <Link href="/portal/instructor/availability" className="font-semibold underline">
            Set your availability
          </Link>
        </p>
      ) : (
        <p className="mt-6 text-[0.875rem] text-muted">
          {data.availability.todayWindows.length === 0
            ? "You are not available today."
            : `Available today: ${data.availability.todayWindows.map((window) => `${window.startTime}–${window.endTime}`).join(", ")}.`}{" "}
          <Link href="/portal/instructor/availability" className="font-semibold text-gold-ink hover:underline">
            Manage availability
          </Link>
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section aria-labelledby="today-heading" className="grid content-start gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="today-heading" className="text-[1.125rem] font-bold text-ink">Today&apos;s schedule</h2>
            <Link href="/portal/instructor/lessons" className="text-[0.875rem] font-semibold text-gold-ink hover:underline">
              Full schedule
            </Link>
          </div>
          {data.todaysLessons.length === 0 ? (
            <AdminEmptyState title="No lessons today" body="Lessons assigned to you for today appear here." />
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
              <AdminEmptyState title="Nothing to action" body="Lessons that have ended but still need attendance or an outcome appear here." />
            ) : (
              <ul className="grid gap-3">
                {data.pendingActions.map(({ lesson, needs }) => (
                  <li key={lesson.id}>
                    <Link href={`/portal/instructor/lessons/${lesson.id}`} className={ROW}>
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
              <AdminEmptyState title="No upcoming lessons" body="Scheduled lessons after today appear here." />
            ) : (
              <ul className="grid gap-3">
                {data.upcoming.map((lesson) => (
                  <LessonItem key={lesson.id} lesson={lesson} showDate />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="students-heading" className="grid gap-4">
            <div className="flex items-center justify-between gap-3">
              <h2 id="students-heading" className="text-[1.125rem] font-bold text-ink">Your students</h2>
              <Link href="/portal/instructor/students" className="text-[0.875rem] font-semibold text-gold-ink hover:underline">
                All students
              </Link>
            </div>
            {data.students.length === 0 ? (
              <AdminEmptyState title="No students assigned" body="Students with a scheduled lesson from today on appear here." />
            ) : (
              <ul className="grid gap-2">
                {data.students.map((student) => (
                  <li key={student.userId}>
                    <Link href={`/portal/instructor/students/${student.userId}`} className={ROW}>
                      <span className="text-[0.9375rem] font-bold text-ink">{student.fullName}</span>
                      <span className="text-[0.8125rem] text-muted">
                        {student.lessonCount} scheduled · next {formatDate(student.nextLessonDate)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="vehicles-heading" className="grid gap-4">
            <h2 id="vehicles-heading" className="text-[1.125rem] font-bold text-ink">Vehicles on your lessons</h2>
            {data.vehicles.length === 0 ? (
              <AdminEmptyState title="No vehicles assigned" body="Vehicles on your scheduled lessons appear here." />
            ) : (
              <ul className="grid gap-2">
                {data.vehicles.map((vehicle) => (
                  <li key={vehicle.id} className="rounded-2xl border border-line bg-white p-4 text-[0.9375rem] text-ink shadow-[0_1px_2px_rgba(16,27,48,0.04)]">
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
