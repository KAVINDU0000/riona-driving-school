import type { Metadata } from "next";
import Link from "next/link";
import AdminFrame from "@/components/admin/AdminFrame";
import { FIELD, LABEL, ROW_LINK, BUTTON_INK, initialsOf } from "@/components/admin/admin-ui";
import { formatDate } from "@/components/student/format";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { listNeedingAction, listScheduledForDate } from "@/lib/admin/lessons";
import { parseDateOnly, schoolNow } from "@/lib/student/time";

export const metadata: Metadata = {
  title: "Lessons | Admin Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

/** Scheduled lessons for a chosen school date, or the lessons that still need action. Opens each lesson for changes. */
export default async function AdminLessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; needs?: string; page?: string }>;
}) {
  await requirePortalUser("ADMIN");
  const { date: dateParam, needs, page: pageParam } = await searchParams;
  const page = /^[1-9][0-9]{0,5}$/.test(pageParam ?? "") ? Number(pageParam) : 1;
  const today = schoolNow().date;
  const needsAction = needs === "action";

  const chosenDate = dateParam && parseDateOnly(dateParam) ? dateParam : today;
  const result = needsAction ? await listNeedingAction(page) : await listScheduledForDate(chosenDate, page);

  const pagerBase = needsAction ? "/portal/admin/lessons?needs=action" : `/portal/admin/lessons?date=${encodeURIComponent(chosenDate)}`;

  return (
    <AdminFrame
      title="Lessons"
      description={
        needsAction
          ? "Scheduled lessons that have ended or whose date has passed. Open a lesson to record attendance, reschedule it or cancel it."
          : "Scheduled lessons for the chosen school date. Open a lesson to record attendance, reschedule it or cancel it."
      }
      active="/portal/admin"
      crumbs={[{ label: "Dashboard", href: "/portal/admin" }, { label: needsAction ? "Lessons needing action" : "Lessons" }]}
    >
      <section aria-labelledby="lessons-heading" className="glass rounded-[22px] p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="lessons-heading" className="text-[1.125rem] font-bold text-ink">
            {needsAction ? "Needs action" : `Scheduled on ${formatDate(chosenDate)}`}
          </h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/portal/admin/lessons" className={`${BUTTON_INK} h-10 px-4`}>
              Today
            </Link>
            <Link href="/portal/admin/lessons?needs=action" className="inline-flex h-10 items-center rounded-xl border border-line bg-white px-4 text-[0.875rem] font-semibold text-ink hover:bg-page">
              Needs action
            </Link>
          </div>
        </div>

        {!needsAction && (
          <form method="get" action="/portal/admin/lessons" className="mt-4 grid gap-1.5 sm:max-w-xs">
            <label htmlFor="lesson-date" className={LABEL}>
              Show lessons on
            </label>
            <div className="flex gap-2">
              <input id="lesson-date" name="date" type="date" defaultValue={chosenDate} className={`${FIELD} h-11`} />
              <button type="submit" className={`${BUTTON_INK} h-11 px-5`}>
                Show
              </button>
            </div>
          </form>
        )}

        {result.pageCount > 1 && (
          <nav aria-label="Lesson pages" className="mt-5 flex items-center justify-between text-[0.875rem]">
            {result.page > 1 ? (
              <Link href={`${pagerBase}&page=${result.page - 1}`} className="font-semibold text-ink hover:underline">
                Previous
              </Link>
            ) : (
              <span className="text-muted">Previous</span>
            )}
            <span className="text-muted">
              Page {result.page} of {result.pageCount}
            </span>
            {result.page < result.pageCount ? (
              <Link href={`${pagerBase}&page=${result.page + 1}`} className="font-semibold text-ink hover:underline">
                Next
              </Link>
            ) : (
              <span className="text-muted">Next</span>
            )}
          </nav>
        )}

        {result.items.length === 0 ? (
          <p className="mt-6 text-[0.9375rem] text-muted">
            {needsAction ? "No lessons need action." : "No scheduled lessons on this date."}
          </p>
        ) : (
          <ul className="mt-5 grid gap-2.5">
            {result.items.map((lesson) => (
              <li key={lesson.id}>
                <Link href={`/portal/admin/lessons/${encodeURIComponent(lesson.id)}`} className={ROW_LINK}>
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-page text-[0.8125rem] font-bold text-ink-soft ring-1 ring-line"
                  >
                    {initialsOf(lesson.studentName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-bold text-ink">{lesson.studentName}</span>
                    <span className="block truncate text-[0.8125rem] text-muted">
                      {lesson.studentId} · {lesson.instructorName} · {lesson.vehicleLabel}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-[0.875rem] font-semibold text-ink">
                    {needsAction ? `${formatDate(lesson.lessonDate)}, ` : ""}
                    {lesson.startTime}–{lesson.endTime}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminFrame>
  );
}
