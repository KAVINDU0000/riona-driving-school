import type { Metadata } from "next";
import Link from "next/link";
import AvailabilityEditor from "@/components/instructor/AvailabilityEditor";
import InstructorFrame from "@/components/instructor/InstructorFrame";
import { formatDate } from "@/components/student/format";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { listAvailability } from "@/lib/instructor/availability";
import { shiftDate } from "@/lib/instructor/lesson-rules";
import { activeSessionSlots } from "@/lib/session-slots/store";
import { schoolNow } from "@/lib/student/time";

export const metadata: Metadata = {
  title: "Availability | Instructor Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Monday of the week containing the date. */
function weekStart(date: string): string {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return shiftDate(date, -((weekday + 6) % 7));
}

/**
 * The instructor's session times for one week. Each day, the instructor takes the open session times they are working, and
 * students can only book those. The week comes from the URL, but sessions are always limited to the signed-in instructor.
 */
export default async function InstructorAvailabilityPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const user = await requirePortalUser("INSTRUCTOR");
  const params = await searchParams;
  const today = schoolNow().date;
  const requested = params.date && DATE_PATTERN.test(params.date) && !Number.isNaN(Date.parse(`${params.date}T00:00:00Z`)) ? params.date : today;
  const from = weekStart(requested);
  const to = shiftDate(from, 6);
  const days = Array.from({ length: 7 }, (_, index) => shiftDate(from, index));
  const [windows, slots] = await Promise.all([listAvailability(user.userId, from, to), activeSessionSlots()]);

  const link = (date: string) => `/portal/instructor/availability?date=${date}`;
  const navButton = "rounded-xl bg-white px-4 py-2 text-[0.875rem] font-semibold text-ink ring-1 ring-line hover:bg-page";

  return (
    <InstructorFrame
      title="Availability"
      description="Take the session times you are working each day. Students book those sessions. A day with no session taken is a day off."
      active="/portal/instructor/availability"
    >
      <div className="glass mb-6 flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[0.9375rem] font-semibold text-ink">
          {formatDate(from)} to {formatDate(to)}
        </p>
        <nav aria-label="Move through the weeks" className="flex flex-wrap items-center gap-2">
          <Link href={link(shiftDate(from, -7))} className={navButton}>
            ← Previous week
          </Link>
          <Link href={link(today)} className={navButton}>
            This week
          </Link>
          <Link href={link(shiftDate(from, 7))} className={navButton}>
            Next week →
          </Link>
        </nav>
      </div>
      <AvailabilityEditor days={days} windows={windows} slots={slots} today={today} />
    </InstructorFrame>
  );
}
