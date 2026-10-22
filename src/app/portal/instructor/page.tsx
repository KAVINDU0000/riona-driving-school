import type { Metadata } from "next";
import Link from "next/link";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import InstructorFrame from "@/components/instructor/InstructorFrame";
import {
  ActionItem,
  DashboardHero,
  Panel,
  PanelLink,
  StatTile,
  StudentRow,
  TodayLessonCard,
  UpcomingRow,
  VehicleRow,
} from "@/components/instructor/InstructorDashboardParts";
import Icon from "@/components/ui/Icon";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { getDashboardSummary } from "@/lib/instructor/lessons";
import { formatDate } from "@/components/student/format";

export const metadata: Metadata = {
  title: "Instructor Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

const HERO_PRIMARY = "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gold px-5 text-[0.9375rem] font-bold text-ink shadow-[0_8px_20px_-8px_rgba(255,201,51,0.7)] transition-colors hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";
const HERO_SECONDARY = "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 text-[0.9375rem] font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

/** Today's lessons, pending actions and upcoming schedule for the signed-in instructor. Every figure is read from lesson records. */
export default async function InstructorDashboardPage() {
  const user = await requirePortalUser("INSTRUCTOR");
  const data = await getDashboardSummary(user.userId);

  const availabilityLine =
    data.availability.upcomingWindowCount === 0
      ? "You have no availability set, so students cannot book lessons with you."
      : data.availability.todayWindows.length === 0
        ? "You are not available today."
        : `Available today: ${data.availability.todayWindows.map((window) => `${window.startTime}–${window.endTime}`).join(", ")}.`;

  return (
    <InstructorFrame title="Dashboard" description="Today's lessons, anything that needs your action, and your upcoming schedule." active="/portal/instructor">
      <DashboardHero date={formatDate(data.today)} todayCount={data.todayCount} availabilityLine={availabilityLine}>
        <Link href="/portal/instructor/lessons" className={HERO_PRIMARY}>
          Full schedule
        </Link>
        <Link href="/portal/instructor/availability" className={HERO_SECONDARY}>
          Manage availability
        </Link>
      </DashboardHero>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Today's lessons" value={data.todayCount} caption="Excludes cancelled lessons" icon="calendar" tone="gold" />
        <StatTile label="Upcoming" value={data.upcomingCount} caption="Scheduled after today" icon="car" tone="ink" />
        <StatTile label="Completed today" value={data.completedToday} caption={formatDate(data.today)} icon="check-circle" tone="success" />
        <StatTile
          label="Needs action"
          value={data.pendingActions.length}
          caption="Ended, still open"
          icon="badge-check"
          tone={data.pendingActions.length > 0 ? "alert" : "ink"}
        />
      </div>

      {/* Order: what needs action, then today, then what is coming, then the people and vehicles behind them. */}
      <div className="mt-8 grid gap-6">
        <Panel id="pending-heading" title="Needs your action" count={data.pendingActions.length}>
          {data.pendingActions.length === 0 ? (
            <p className="flex items-center gap-2.5 rounded-xl bg-success-soft px-4 py-3 text-[0.9375rem] font-medium text-success">
              <Icon name="check-circle" className="h-5 w-5 shrink-0" />
              Nothing to action. Every ended lesson is up to date.
            </p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.pendingActions.map(({ lesson, needs }) => (
                <ActionItem
                  key={lesson.id}
                  href={`/portal/instructor/lessons/${lesson.id}`}
                  date={formatDate(lesson.lessonDate)}
                  time={lesson.startTime}
                  student={lesson.student.fullName}
                  needs={needs === "attendance" ? "Record attendance" : "Mark completed or cancel"}
                />
              ))}
            </ul>
          )}
        </Panel>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
          <Panel id="today-heading" title="Today's schedule" action={<PanelLink href="/portal/instructor/lessons">Full schedule</PanelLink>}>
            {data.todaysLessons.length === 0 ? (
              <AdminEmptyState title="No lessons today" body="Lessons assigned to you for today appear here." />
            ) : (
              <ul className="grid gap-3">
                {data.todaysLessons.map((lesson) => (
                  <TodayLessonCard key={lesson.id} lesson={lesson} />
                ))}
              </ul>
            )}
          </Panel>

          <Panel id="upcoming-heading" title="Upcoming lessons" action={<PanelLink href="/portal/instructor/lessons">View all</PanelLink>}>
            {data.upcoming.length === 0 ? (
              <AdminEmptyState title="No upcoming lessons" body="Scheduled lessons after today appear here." />
            ) : (
              <ul className="grid gap-1">
                {data.upcoming.map((lesson) => (
                  <UpcomingRow key={lesson.id} lesson={lesson} />
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <Panel id="students-heading" title="Your students" action={<PanelLink href="/portal/instructor/students">All students</PanelLink>}>
            {data.students.length === 0 ? (
              <AdminEmptyState title="No students assigned" body="Students with a scheduled lesson from today on appear here." />
            ) : (
              <ul className="grid gap-1">
                {data.students.map((student) => (
                  <StudentRow
                    key={student.userId}
                    href={`/portal/instructor/students/${student.userId}`}
                    name={student.fullName}
                    lessonCount={student.lessonCount}
                    next={formatDate(student.nextLessonDate)}
                  />
                ))}
              </ul>
            )}
          </Panel>

          <Panel id="vehicles-heading" title="Vehicles on your lessons">
            {data.vehicles.length === 0 ? (
              <AdminEmptyState title="No vehicles assigned" body="Vehicles on your scheduled lessons appear here." />
            ) : (
              <ul className="grid gap-1">
                {data.vehicles.map((vehicle) => (
                  <VehicleRow
                    key={vehicle.id}
                    label={vehicle.label}
                    registrationNumber={vehicle.registrationNumber}
                    status={vehicle.status}
                    vehicleType={vehicle.vehicleType}
                  />
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </InstructorFrame>
  );
}
