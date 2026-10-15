import Link from "next/link";
import { formatDate, labels } from "@/components/student/format";
import { layoutDay, gridWindow } from "@/lib/instructor/calendar";
import { vehicleWarning } from "@/lib/instructor/lesson-rules";
import type { InstructorLessonRow } from "@/lib/instructor/lessons";

const PX_PER_MINUTE = 1.1;
const HEADER_PX = 44;

/** Weekly calendar. Time runs down the page and each column is one day. Status is printed as text, never shown by colour alone. */
export default function WeekGrid({
  days,
  lessons,
  today,
}: {
  days: string[];
  lessons: InstructorLessonRow[];
  today: string;
}) {
  const { start, end } = gridWindow(lessons);
  const height = (end - start) * PX_PER_MINUTE;
  const hours = Array.from({ length: (end - start) / 60 }, (_, index) => start + index * 60);
  const byDay = new Map(days.map((day) => [day, [] as InstructorLessonRow[]]));
  for (const lesson of lessons) byDay.get(lesson.lessonDate)?.push(lesson);

  return (
    <div className="glass overflow-x-auto rounded-2xl p-3" role="region" aria-label="Weekly schedule" tabIndex={0}>
      <div className="grid min-w-[640px] grid-cols-[56px_repeat(7,minmax(0,1fr))] gap-px">
        <div aria-hidden="true" />
        {days.map((day) => (
          <div
            key={day}
            className={`flex items-center justify-center rounded-t-lg px-1 text-center text-[0.8125rem] font-semibold ${
              day === today ? "bg-gold-soft text-gold-ink" : "text-ink"
            }`}
            style={{ height: HEADER_PX }}
          >
            {formatDate(day).replace(/,.*/, "")}
          </div>
        ))}

        <div className="relative" style={{ height }} aria-hidden="true">
          {hours.map((hour) => (
            <span
              key={hour}
              className="absolute left-0 -translate-y-1/2 pr-2 text-right text-[0.75rem] text-muted"
              style={{ top: (hour - start) * PX_PER_MINUTE, width: 56 }}
            >
              {String(Math.floor(hour / 60)).padStart(2, "0")}:00
            </span>
          ))}
        </div>

        {days.map((day) => {
          const placed = layoutDay(byDay.get(day) ?? []);
          return (
            <div
              key={day}
              className={`relative rounded-b-lg bg-white/70 ring-1 ring-line ${day === today ? "ring-gold/60" : ""}`}
              style={{ height }}
              aria-label={`${formatDate(day)} lessons`}
            >
              {hours.map((hour) => (
                <div key={hour} className="absolute inset-x-0 border-t border-line/70" style={{ top: (hour - start) * PX_PER_MINUTE }} aria-hidden="true" />
              ))}
              {placed.map((lesson) => {
                const width = 100 / lesson.lanes;
                const warning = vehicleWarning(lesson.vehicle.status);
                return (
                  <Link
                    key={lesson.id}
                    href={`/portal/instructor/lessons/${lesson.id}`}
                    className={`absolute overflow-hidden rounded-lg p-1.5 text-[0.75rem] leading-snug ring-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark ${
                      lesson.status === "CANCELLED"
                        ? "bg-red-50 text-red-900 ring-red-200 line-through"
                        : lesson.status === "COMPLETED"
                          ? "bg-success-soft text-ink ring-success/40"
                          : "bg-gold-soft text-ink ring-gold/60"
                    }`}
                    style={{
                      top: (lesson.top - start) * PX_PER_MINUTE + 1,
                      height: Math.max(lesson.height * PX_PER_MINUTE - 2, 24),
                      left: `calc(${lesson.lane * width}% + 2px)`,
                      width: `calc(${width}% - 4px)`,
                    }}
                    title={`${lesson.startTime}–${lesson.endTime} ${lesson.student.fullName}, ${labels.lessonStatus[lesson.status]}${warning ? `, ${warning}` : ""}`}
                  >
                    <span className="block font-semibold">
                      {lesson.startTime}–{lesson.endTime}
                    </span>
                    <span className="block truncate">{lesson.student.fullName}</span>
                    <span className="block text-[0.6875rem] font-semibold">
                      {labels.lessonStatus[lesson.status] ?? lesson.status}
                      {warning ? " · vehicle check" : ""}
                    </span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
