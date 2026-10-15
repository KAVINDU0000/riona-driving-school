import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import InstructorFrame from "@/components/instructor/InstructorFrame";
import LessonActions from "@/components/instructor/LessonActions";
import { formatDate, labels } from "@/components/student/format";
import StatusBadge from "@/components/student/StatusBadge";
import { AuthError } from "@/lib/auth/http";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { vehicleWarning } from "@/lib/instructor/lesson-rules";
import { getLessonDetail } from "@/lib/instructor/lessons";

export const metadata: Metadata = {
  title: "Lesson | Instructor Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

/** One assigned lesson. A lesson that is not assigned to this instructor is reported as not found. */
export default async function InstructorLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePortalUser("INSTRUCTOR");
  const { id } = await params;

  let lesson;
  try {
    lesson = await getLessonDetail(user.userId, id);
  } catch (error) {
    if (error instanceof AuthError && error.status === 404) notFound();
    throw error;
  }

  return (
    <InstructorFrame title="Lesson" description="Lesson details, attendance and outcome, and feedback for the student." active="/portal/instructor/lessons">
      <p className="mb-4">
        <Link href="/portal/instructor/lessons" className="text-[0.875rem] font-semibold text-gold-ink hover:underline">
          ← Back to schedule
        </Link>
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section aria-labelledby="lesson-heading" className="glass grid content-start gap-5 rounded-[22px] p-5">
          {vehicleWarning(lesson.vehicle.status) && (
            <p role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-[0.875rem] text-amber-900 ring-1 ring-amber-200">
              {vehicleWarning(lesson.vehicle.status)}
            </p>
          )}
          <h2 id="lesson-heading" className="text-[1.125rem] font-bold text-ink">
            {formatDate(lesson.lessonDate)}, {lesson.startTime} – {lesson.endTime}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={lesson.status} label={labels.lessonStatus[lesson.status] ?? lesson.status} />
            {lesson.attendance ? (
              <StatusBadge status={lesson.attendance} label={labels.attendance[lesson.attendance]} />
            ) : (
              <span className="text-[0.875rem] text-muted">Attendance not recorded</span>
            )}
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Student" value={lesson.student.fullName} />
            <Field label="Student ID" value={lesson.student.userId} />
            <Field label="Student mobile" value={lesson.student.phoneNumber} />
            <Field label="Lesson type" value={labels.trainingType[lesson.trainingType] ?? lesson.trainingType} />
            <Field label="Duration" value={`${lesson.durationMinutes} minutes`} />
            <Field label="Vehicle" value={lesson.vehicle.label} />
            <Field label="Registration" value={lesson.vehicle.registrationNumber} />
            <Field label="Training progress" value={`${lesson.progress.completedSessions} of ${lesson.progress.requiredSessions} completed sessions`} />
          </dl>
          <p className="text-[0.8125rem] text-muted">
            Progress counts this student&apos;s completed lessons for this lesson type and vehicle. It does not list other lessons.
          </p>
          <Link href={`/portal/instructor/students/${lesson.student.userId}`} className="text-[0.875rem] font-semibold text-gold-ink hover:underline">
            View this student&apos;s progress with you →
          </Link>
        </section>

        <section aria-labelledby="actions-heading" className="glass rounded-[22px] p-5">
          <h2 id="actions-heading" className="mb-5 text-[1.125rem] font-bold text-ink">
            Record the lesson
          </h2>
          <LessonActions lessonId={lesson.id} attendance={lesson.attendance} permissions={lesson.permissions} feedback={lesson.feedback} />
        </section>
      </div>
    </InstructorFrame>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-muted">{label}</dt>
      <dd className="mt-1 break-words text-[0.9375rem] text-ink">{value}</dd>
    </div>
  );
}
