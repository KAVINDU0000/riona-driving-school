import Link from "next/link";
import type { ReactNode } from "react";
import type { VehicleStatus } from "@/generated/prisma/enums";
import { formatDate, labels } from "@/components/student/format";
import StatusBadge from "@/components/student/StatusBadge";
import Icon from "@/components/ui/Icon";
import { vehicleWarning } from "@/lib/instructor/lesson-rules";
import type { InstructorLessonRow } from "@/lib/instructor/lessons";

/** The vehicle type as a clear badge: Car, Van, Motorcycle or Three-wheeler. */
export function VehicleTypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-2.5 py-1 text-[0.75rem] font-bold uppercase tracking-[0.06em] text-white">
      <Icon name="car" className="h-3.5 w-3.5" />
      {labels.vehicleType[type] ?? type}
    </span>
  );
}

const CARD = "rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(16,27,48,0.04)]";
const LINK_CARD =
  "group flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(16,27,48,0.04)] transition-all hover:-translate-y-px hover:border-gold/60 hover:shadow-[0_12px_28px_-18px_rgba(16,27,48,0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark";

/** Dark banner at the top of the dashboard: the date, today's headline and the two main actions. */
export function DashboardHero({
  date,
  todayCount,
  availabilityLine,
  children,
}: {
  date: string;
  todayCount: number;
  availabilityLine: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby="dashboard-hero-heading" className="relative overflow-hidden rounded-3xl bg-ink p-6 text-white shadow-[0_24px_60px_-28px_rgba(16,27,48,0.7)] md:p-8">
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-white/5 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid min-w-0 gap-3">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-gold">{date}</p>
          <h2 id="dashboard-hero-heading" className="text-[1.5rem] font-bold leading-tight tracking-[-0.02em] md:text-[1.75rem]">
            {todayCount === 0 ? "No lessons today" : `${todayCount} ${todayCount === 1 ? "lesson" : "lessons"} today`}
          </h2>
          <div className="max-w-xl text-[0.9375rem] leading-relaxed text-white/75">{availabilityLine}</div>
        </div>
        <div className="flex flex-wrap gap-3">{children}</div>
      </div>
    </section>
  );
}

const TILE_TONES = {
  gold: "bg-gold-soft text-gold-ink ring-gold/60",
  ink: "bg-page text-ink-soft ring-line",
  success: "bg-success-soft text-success ring-success/30",
  alert: "bg-amber-50 text-amber-800 ring-amber-200",
} as const;

/** One headline figure. The alert tone is used only when something needs the instructor's action. */
export function StatTile({
  label,
  value,
  caption,
  icon,
  tone,
}: {
  label: string;
  value: number;
  caption: string;
  icon: string;
  tone: keyof typeof TILE_TONES;
}) {
  return (
    <div className={`${CARD} flex items-start gap-4 p-5`}>
      <span aria-hidden="true" className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ring-1 ${TILE_TONES[tone]}`}>
        <Icon name={icon} className="h-[22px] w-[22px]" />
      </span>
      <div className="min-w-0">
        <p className="text-[0.8125rem] font-semibold text-muted">{label}</p>
        <p className="mt-0.5 text-[1.875rem] font-bold leading-none tracking-[-0.02em] text-ink">{value}</p>
        <p className="mt-1.5 truncate text-[0.8125rem] text-muted">{caption}</p>
      </div>
    </div>
  );
}

/** A dashboard panel: a titled white card with an optional count and link in the header. */
export function Panel({
  id,
  title,
  count,
  action,
  children,
}: {
  id: string;
  title: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={`${CARD} grid content-start gap-4 p-5 md:p-6`}>
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <h2 id={id} className="text-[1.0625rem] font-bold text-ink">
            {title}
          </h2>
          {count !== undefined && count > 0 && (
            <span className="rounded-full bg-ink px-2 py-0.5 text-[0.75rem] font-semibold text-white">{count}</span>
          )}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

/** A text link for a panel header. */
export function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="whitespace-nowrap text-[0.875rem] font-semibold text-gold-ink hover:underline">
      {children}
    </Link>
  );
}

/** One of today's lessons, shown as a timeline card with its time block on the left. */
export function TodayLessonCard({ lesson }: { lesson: InstructorLessonRow }) {
  const warning = vehicleWarning(lesson.vehicle.status);
  return (
    <li>
      <Link href={`/portal/instructor/lessons/${lesson.id}`} className={`${LINK_CARD} sm:grid sm:grid-cols-[104px_minmax(0,1fr)] sm:gap-5`}>
        <div className="flex items-center gap-3 sm:flex-col sm:justify-center sm:gap-0.5 sm:rounded-xl sm:bg-page sm:px-2 sm:py-3 sm:text-center sm:ring-1 sm:ring-line">
          <span className="text-[1.125rem] font-bold tabular-nums text-ink">{lesson.startTime}</span>
          <span className="text-[0.75rem] tabular-nums text-muted">to {lesson.endTime}</span>
        </div>
        <div className="grid min-w-0 gap-2.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[1rem] font-bold text-ink">{lesson.student.fullName}</p>
              <p className="text-[0.8125rem] text-muted">
                {lesson.student.userId} · {labels.trainingType[lesson.trainingType] ?? lesson.trainingType}
              </p>
            </div>
            <StatusBadge status={lesson.status} label={labels.lessonStatus[lesson.status] ?? lesson.status} />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[0.8125rem] text-muted">
            <VehicleTypeBadge type={lesson.vehicleType} />
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-page px-2.5 py-1 ring-1 ring-line">
              {lesson.vehicle.label}
            </span>
            {lesson.attendance ? (
              <StatusBadge status={lesson.attendance} label={labels.attendance[lesson.attendance]} />
            ) : (
              <span className="text-muted">Attendance not recorded</span>
            )}
            {warning && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[0.75rem] font-semibold text-amber-800 ring-1 ring-amber-200">Vehicle check needed</span>}
          </div>
          {lesson.groupmates.length > 0 && <p className="text-[0.8125rem] text-muted">Shared session with {lesson.groupmates.join(", ")}</p>}
          <span className="text-[0.8125rem] font-semibold text-gold-ink group-hover:underline">Open lesson →</span>
        </div>
      </Link>
    </li>
  );
}

/** Lesson that has ended and still needs attendance or an outcome. Amber accent, with the action named in text. */
export function ActionItem({ href, date, time, student, needs }: { href: string; date: string; time: string; student: string; needs: string }) {
  return (
    <li>
      <Link href={href} className="group flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 transition-colors hover:border-amber-300 hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark">
        <span aria-hidden="true" className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-amber-800 ring-1 ring-amber-200">
          <Icon name="clock" className="h-4 w-4" />
        </span>
        <span className="grid min-w-0 gap-0.5">
          <span className="text-[0.9375rem] font-bold text-ink">
            {date} · {time}
          </span>
          <span className="truncate text-[0.875rem] text-ink-soft">{student}</span>
          <span className="mt-1 text-[0.8125rem] font-semibold text-amber-900 group-hover:underline">{needs}</span>
        </span>
      </Link>
    </li>
  );
}

/** Next scheduled lesson in a compact row. */
export function UpcomingRow({ lesson }: { lesson: InstructorLessonRow }) {
  return (
    <li>
      <Link href={`/portal/instructor/lessons/${lesson.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark">
        <span className="grid w-14 shrink-0 place-items-center rounded-xl bg-page px-1 py-2 text-center ring-1 ring-line">
          <span className="text-[0.75rem] font-bold leading-tight text-ink">{formatDate(lesson.lessonDate)}</span>
          <span className="text-[0.6875rem] tabular-nums text-muted">{lesson.startTime}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.9375rem] font-semibold text-ink">{lesson.student.fullName}</span>
          <span className="mt-0.5 flex min-w-0 items-center gap-2">
            <VehicleTypeBadge type={lesson.vehicleType} />
            <span className="truncate text-[0.8125rem] text-muted">{lesson.vehicle.label}</span>
          </span>
        </span>
        <Icon name="arrow-right" className="h-4 w-4 shrink-0 text-muted" />
      </Link>
    </li>
  );
}

/** Initials for an avatar circle, from the first two words of a name. */
export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/** A student the instructor teaches, with how many lessons are scheduled and the next one. */
export function StudentRow({ href, name, lessonCount, next }: { href: string; name: string; lessonCount: number; next: string }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark">
        <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-[0.8125rem] font-bold text-white">
          {initialsOf(name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.9375rem] font-semibold text-ink">{name}</span>
          <span className="block truncate text-[0.8125rem] text-muted">
            {lessonCount} scheduled · next {next}
          </span>
        </span>
      </Link>
    </li>
  );
}

/** A vehicle on the instructor's lessons, with a warning line when it needs a check. */
export function VehicleRow({
  label,
  registrationNumber,
  status,
  vehicleType,
}: {
  label: string;
  registrationNumber: string;
  status: VehicleStatus;
  vehicleType: string;
}) {
  const warning = vehicleWarning(status);
  return (
    <li className="flex items-start gap-3 rounded-xl px-2 py-2.5">
      <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-page text-ink-soft ring-1 ring-line">
        <Icon name="car" className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[0.9375rem] font-semibold text-ink">{label}</span>
        <span className="mt-1 flex flex-wrap items-center gap-2">
          <VehicleTypeBadge type={vehicleType} />
          <span className="text-[0.8125rem] text-muted">{registrationNumber}</span>
        </span>
        {warning && <span className="mt-1 block text-[0.8125rem] font-semibold text-amber-800">{warning}</span>}
      </span>
    </li>
  );
}
