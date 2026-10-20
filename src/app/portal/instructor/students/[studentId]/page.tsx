import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import InstructorFrame from "@/components/instructor/InstructorFrame";
import { formatDate, labels } from "@/components/student/format";
import StatusBadge from "@/components/student/StatusBadge";
import { AuthError } from "@/lib/auth/http";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { getStudentProgress } from "@/lib/instructor/lessons";

export const metadata: Metadata = {
  title: "Student progress | Instructor Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

/**
 * One student's progress as seen by the signed-in instructor. A student the instructor has never taught is reported
 * as not found, so changing the ID in the URL reveals nothing.
 */
export default async function InstructorStudentPage({ params }: { params: Promise<{ studentId: string }> }) {
  const user = await requirePortalUser("INSTRUCTOR");
  const { studentId } = await params;

  let progress;
  try {
    progress = await getStudentProgress(user.userId, studentId);
  } catch (error) {
    if (error instanceof AuthError && error.status === 404) notFound();
    throw error;
  }

  return (
    <InstructorFrame
      title="Student progress"
      description="Training progress for a student you have taught. Only your own lessons and feedback are listed."
      active="/portal/instructor/students"
    >
      <p className="mb-4">
        <Link href="/portal/instructor/students" className="text-[0.875rem] font-semibold text-gold-ink hover:underline">
          ← Back to students
        </Link>
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section aria-labelledby="student-heading" className="glass grid content-start gap-4 rounded-[22px] p-5">
          <h2 id="student-heading" className="text-[1.125rem] font-bold text-ink">
            {progress.student.fullName}
          </h2>
          <dl className="grid gap-3 text-[0.9375rem]">
            <div>
              <dt className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-muted">Student ID</dt>
              <dd className="mt-1 text-ink">{progress.student.userId}</dd>
            </div>
            <div>
              <dt className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-muted">Mobile</dt>
              <dd className="mt-1 text-ink">{progress.student.phoneNumber}</dd>
            </div>
          </dl>

          <h3 className="mt-2 text-[1rem] font-bold text-ink">Requirements</h3>
          {progress.requirements.length === 0 ? (
            <p className="text-[0.875rem] text-muted">No training requirements found for your lessons.</p>
          ) : (
            <ul className="grid gap-3">
              {progress.requirements.map((item) => (
                <li key={`${item.vehicleType}-${item.trainingType}`} className="rounded-xl bg-white p-3 ring-1 ring-line">
                  <p className="text-[0.9375rem] font-semibold text-ink">
                    {labels.trainingType[item.trainingType] ?? item.trainingType} · {labels.vehicleType[item.vehicleType] ?? item.vehicleType}
                  </p>
                  <p className="mt-1 text-[0.875rem] text-muted">
                    {item.requiredSessions === null
                      ? "Allocation pending"
                      : `${item.completedSessions} of ${item.requiredSessions} sessions completed`}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[0.8125rem] text-muted">Completed counts are from all instructors&apos; completed lessons for the same requirement.</p>
        </section>

        <section aria-labelledby="lessons-heading" className="glass grid content-start gap-4 rounded-[22px] p-5">
          <h2 id="lessons-heading" className="text-[1.125rem] font-bold text-ink">
            Your lessons with this student
          </h2>
          <ul className="grid gap-3">
            {progress.lessons.map((lesson) => (
              <li key={lesson.id}>
                <Link href={`/portal/instructor/lessons/${lesson.id}`} className="block rounded-xl bg-white p-3 ring-1 ring-line hover:bg-page">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[0.9375rem] font-semibold text-ink">
                      {formatDate(lesson.lessonDate)}, {lesson.startTime} – {lesson.endTime}
                    </span>
                    <span className="flex flex-wrap gap-2">
                      <StatusBadge status={lesson.status} label={labels.lessonStatus[lesson.status] ?? lesson.status} />
                      {lesson.attendance ? (
                        <StatusBadge status={lesson.attendance} label={labels.attendance[lesson.attendance]} />
                      ) : (
                        <span className="text-[0.8125rem] text-muted">Attendance not recorded</span>
                      )}
                    </span>
                  </div>
                  {lesson.feedback && (
                    <p className="mt-2 text-[0.875rem] text-muted">
                      Your feedback{lesson.feedback.rating ? ` (${lesson.feedback.rating} of 5)` : ""}: {lesson.feedback.feedback}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </InstructorFrame>
  );
}
