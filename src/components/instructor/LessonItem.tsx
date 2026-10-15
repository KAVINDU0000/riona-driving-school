import Link from "next/link";
import { formatDate, labels } from "@/components/student/format";
import StatusBadge from "@/components/student/StatusBadge";
import { vehicleWarning } from "@/lib/instructor/lesson-rules";
import type { InstructorLessonRow } from "@/lib/instructor/lessons";

/** One lesson in a schedule list. Status and attendance are shown as text labels, never by colour alone. */
export default function LessonItem({ lesson, showDate = false }: { lesson: InstructorLessonRow; showDate?: boolean }) {
  return (
    <li>
      <Link
        href={`/portal/instructor/lessons/${lesson.id}`}
        className="glass flex flex-col gap-3 rounded-2xl p-4 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <p className="text-[0.9375rem] font-bold text-ink">
            {showDate && <span className="mr-2 text-muted">{formatDate(lesson.lessonDate)} ·</span>}
            {lesson.startTime} – {lesson.endTime}
          </p>
          <p className="mt-1 text-[0.875rem] text-ink">{lesson.student.fullName}</p>
          <p className="mt-0.5 text-[0.8125rem] text-muted">
            {lesson.student.userId} · {labels.trainingType[lesson.trainingType] ?? lesson.trainingType} · {lesson.vehicle.label}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={lesson.status} label={labels.lessonStatus[lesson.status] ?? lesson.status} />
          {lesson.attendance ? (
            <StatusBadge status={lesson.attendance} label={labels.attendance[lesson.attendance]} />
          ) : (
            <span className="text-[0.8125rem] text-muted">Attendance not recorded</span>
          )}
          {vehicleWarning(lesson.vehicle.status) && (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[0.75rem] font-semibold text-amber-800 ring-1 ring-amber-200">
              Vehicle check needed
            </span>
          )}
          <span className="text-[0.8125rem] font-semibold text-gold-ink">Open →</span>
        </div>
      </Link>
    </li>
  );
}
