import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdminFrame from "@/components/admin/AdminFrame";
import LessonActions from "@/components/admin/LessonActions";
import { formatDate, labels } from "@/components/student/format";
import StatusBadge from "@/components/student/StatusBadge";
import { getAdminLesson } from "@/lib/admin/lessons";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { activeSessionSlots } from "@/lib/session-slots/store";

export const metadata: Metadata = {
  title: "Lesson | Admin Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

/** One lesson. Instructor notes and feedback are not shown to admins. */
export default async function AdminLessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  await requirePortalUser("ADMIN");
  const { lessonId } = await params;
  let lesson;
  try {
    lesson = await getAdminLesson(lessonId);
  } catch {
    notFound();
  }

  const slots = await activeSessionSlots();
  const vehicleLine = [lesson.vehicle.registrationNumber, lesson.vehicle.make, lesson.vehicle.model].filter(Boolean).join(" · ");
  const cancelledBy = lesson.cancelledByRole === "ADMIN" ? "the school" : lesson.cancelledByRole === "INSTRUCTOR" ? "the instructor" : null;

  return (
    <AdminFrame
      title={`${lesson.studentName}: lesson`}
      description={`${formatDate(lesson.lessonDate)}, ${lesson.startTime}–${lesson.endTime}. ${labels.trainingType[lesson.trainingType] ?? lesson.trainingType}.`}
      active="/portal/admin"
      crumbs={[
        { label: "Dashboard", href: "/portal/admin" },
        { label: "Lessons", href: "/portal/admin/lessons" },
        { label: lesson.studentName },
      ]}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section aria-labelledby="lesson-heading" className="glass rounded-[22px] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="lesson-heading" className="text-[1.125rem] font-bold text-ink">
              Details
            </h2>
            <StatusBadge status={lesson.status} label={labels.lessonStatus[lesson.status] ?? lesson.status} />
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Date" value={formatDate(lesson.lessonDate)} />
            <Field label="Time" value={`${lesson.startTime}–${lesson.endTime} (${lesson.durationMinutes} minutes)`} />
            <Field label="Student" value={`${lesson.studentName} (${lesson.studentId})`} />
            <Field label="Instructor" value={lesson.instructorName} />
            <Field label="Vehicle" value={vehicleLine} />
            <Field label="Vehicle type" value={labels.vehicleType[lesson.vehicleType] ?? lesson.vehicleType} />
            <Field label="Attendance" value={lesson.attendance ? (labels.attendance[lesson.attendance] ?? lesson.attendance) : "Not recorded"} />
            <Field label="Training" value={labels.trainingType[lesson.trainingType] ?? lesson.trainingType} />
          </dl>
          {lesson.status === "CANCELLED" && (
            <div className="mt-5 rounded-2xl bg-page p-4 ring-1 ring-line">
              <p className="text-[0.8125rem] font-semibold text-ink">Cancelled{cancelledBy ? ` by ${cancelledBy}` : ""}</p>
              <p className="mt-1 text-[0.875rem] text-muted">{lesson.cancellationReason ?? "No reason recorded."}</p>
            </div>
          )}
          <p className="mt-5 text-[0.8125rem] text-muted">
            <Link href={`/portal/admin/students/${encodeURIComponent(lesson.studentId)}`} className="font-semibold text-ink underline">
              Open the student&rsquo;s profile
            </Link>
          </p>
        </section>

        <section aria-labelledby="actions-heading" className="glass rounded-[22px] p-5">
          <h2 id="actions-heading" className="text-[1.125rem] font-bold text-ink">
            Change this lesson
          </h2>
          <LessonActions
            lessonId={lesson.id}
            status={lesson.status as "SCHEDULED" | "COMPLETED" | "CANCELLED"}
            date={lesson.lessonDate}
            startTime={lesson.startTime}
            attendance={lesson.attendance}
            slots={slots}
          />
        </section>
      </div>
    </AdminFrame>
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
