import type { Metadata } from "next";
import Link from "next/link";
import InstructorFrame from "@/components/instructor/InstructorFrame";
import LessonItem from "@/components/instructor/LessonItem";
import WeekGrid from "@/components/instructor/WeekGrid";
import EmptyState from "@/components/student/EmptyState";
import { formatDate } from "@/components/student/format";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { parseStatusFilter, shiftDate, STATUS_FILTERS, type StatusFilter } from "@/lib/instructor/lesson-rules";
import { lessonsBetween } from "@/lib/instructor/lessons";
import { schoolNow } from "@/lib/student/time";

export const metadata: Metadata = {
  title: "Lessons | Instructor Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
/** How far ahead the List view looks. */
const LIST_DAYS = 30;

type View = "day" | "week" | "list";

/** Monday to Sunday containing the date. */
function weekRange(date: string): { from: string; to: string } {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const from = shiftDate(date, -((weekday + 6) % 7));
  return { from, to: shiftDate(from, 6) };
}

function daysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  for (let day = from; day <= to; day = shiftDate(day, 1)) days.push(day);
  return days;
}

/**
 * The instructor's own schedule as a day list, a week grid, or an upcoming list. The view, date and status come from
 * the URL, but the lessons are always limited to the signed-in instructor on the server.
 */
export default async function InstructorLessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; status?: string }>;
}) {
  const user = await requirePortalUser("INSTRUCTOR");
  const params = await searchParams;
  const today = schoolNow().date;
  const date = params.date && DATE_PATTERN.test(params.date) ? params.date : today;
  const view: View = params.view === "week" || params.view === "list" ? params.view : "day";
  const status: StatusFilter = parseStatusFilter(params.status);

  const range =
    view === "week"
      ? weekRange(date)
      : view === "list"
        ? { from: today, to: shiftDate(today, LIST_DAYS - 1) }
        : { from: date, to: date };
  const step = view === "week" ? 7 : 1;
  const days = daysBetween(range.from, range.to);

  const lessons = await lessonsBetween(user.userId, range.from, range.to, status);
  const byDay = new Map(days.map((day) => [day, [] as typeof lessons]));
  for (const lesson of lessons) {
    byDay.get(lesson.lessonDate)?.push(lesson);
  }

  const link = (nextView: View, nextDate: string, nextStatus: StatusFilter = status) =>
    `/portal/instructor/lessons?view=${nextView}&date=${nextDate}&status=${nextStatus}`;
  const statusLabels: Record<StatusFilter, string> = { ALL: "All", SCHEDULED: "Scheduled", COMPLETED: "Completed", CANCELLED: "Cancelled" };
  const viewLabels: Record<View, string> = { day: "Day", week: "Week", list: "List" };
  const navButton = "rounded-xl bg-white px-4 py-2 text-[0.875rem] font-semibold text-ink ring-1 ring-line hover:bg-page";

  const heading =
    view === "week"
      ? `${formatDate(range.from)} to ${formatDate(range.to)}`
      : view === "list"
        ? `Next ${LIST_DAYS} days, from ${formatDate(today)}`
        : formatDate(date);

  return (
    <InstructorFrame title="Lessons" description="Your assigned lessons. You only see lessons assigned to you." active="/portal/instructor/lessons">
      <div className="glass mb-6 flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Schedule view">
          {(["day", "week", "list"] as const).map((option) => (
            <Link
              key={option}
              href={link(option, date)}
              aria-current={view === option ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-[0.875rem] font-semibold ring-1 ${
                view === option ? "bg-gold-soft text-gold-ink ring-gold/60" : "bg-white text-muted ring-line hover:text-ink"
              }`}
            >
              {viewLabels[option]}
            </Link>
          ))}
        </div>
        {view !== "list" && (
          <nav aria-label="Move through the schedule" className="flex flex-wrap items-center gap-2">
            <Link href={link(view, shiftDate(date, -step))} className={navButton}>
              ← Previous
            </Link>
            <Link href={link(view, today)} className={navButton}>
              Today
            </Link>
            <Link href={link(view, shiftDate(date, step))} className={navButton}>
              Next →
            </Link>
          </nav>
        )}
      </div>

      <nav aria-label="Filter by status" className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((option) => (
          <Link
            key={option}
            href={link(view, date, option)}
            aria-current={status === option ? "true" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-[0.8125rem] font-semibold ring-1 ${
              status === option ? "bg-gold-soft text-gold-ink ring-gold/60" : "bg-white text-muted ring-line hover:text-ink"
            }`}
          >
            {statusLabels[option]}
          </Link>
        ))}
      </nav>

      <p className="mb-4 text-[0.875rem] font-semibold text-ink">{heading}</p>

      {view === "week" ? (
        <div className="grid gap-4">
          {lessons.length === 0 && (
            <EmptyState title="No lessons in this period" body="Lessons assigned to you in this period appear here." />
          )}
          <WeekGrid days={days} lessons={lessons} today={today} />
        </div>
      ) : lessons.length === 0 ? (
        <EmptyState title="No lessons in this period" body="Lessons assigned to you in this period appear here." />
      ) : (
        <div className="grid gap-6">
          {[...byDay.entries()]
            .filter(([, dayLessons]) => dayLessons.length > 0)
            .map(([day, dayLessons]) => (
              <section key={day} aria-labelledby={`day-${day}`} className="grid gap-3">
                <h2 id={`day-${day}`} className="text-[0.9375rem] font-bold text-ink">
                  {formatDate(day)}
                  {day === today && <span className="ml-2 text-[0.8125rem] font-semibold text-gold-ink">Today</span>}
                </h2>
                <ul className="grid gap-3">
                  {dayLessons.map((lesson) => (
                    <LessonItem key={lesson.id} lesson={lesson} />
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}
    </InstructorFrame>
  );
}
