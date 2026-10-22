import EmptyState from "@/components/student/EmptyState";
import LessonBookingForm, { type BookableRequirement } from "@/components/student/LessonBookingForm";
import { formatDate, labels } from "@/components/student/format";
import PageIntro from "@/components/student/PageIntro";
import StatusBadge from "@/components/student/StatusBadge";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { getEnrollments, getLessons } from "@/lib/student/data";
import type { StudentCancellation } from "@/lib/lessons/cancellation";
import SectionTitle from "@/components/student/SectionTitle";

export const metadata = { title: "Lessons | Student portal", robots: { index: false, follow: false } };

/**
 * The cancellation reason and details. A lesson cancelled before reasons were recorded shows that no reason exists,
 * rather than a guess. Notices are shown on this page only: the school does not send email about lesson cancellations.
 */
function CancellationNote({ cancellation }: { cancellation: StudentCancellation }) {
  const when = cancellation.cancelledAt
    ? new Date(cancellation.cancelledAt).toLocaleString("en-GB", { timeZone: "Asia/Colombo", dateStyle: "medium", timeStyle: "short" })
    : null;
  const who = cancellation.cancelledBy === "SCHOOL" ? "the school" : cancellation.cancelledBy === "INSTRUCTOR" ? "your instructor" : null;
  return (
    <div className="rounded-xl bg-page px-3 py-2 text-[0.8125rem] text-ink">
      <p>
        {who ? `Cancelled by ${who}` : "Cancelled"}
        {when ? ` on ${when}` : ""}.
      </p>
      <p>{cancellation.reason ? `Reason: ${cancellation.reason}` : "No reason was recorded for this cancellation."}</p>
    </div>
  );
}

export default async function StudentLessonsPage() {
  const user = await requirePortalUser("STUDENT");
  const [enrollments, lessons] = await Promise.all([getEnrollments(user.userId), getLessons(user.userId)]);

  // Only active enrollments with sessions still to book can be booked.
  const bookable: BookableRequirement[] = enrollments
    .filter((e) => e.status === "ACTIVE")
    .flatMap((enrollment) =>
      enrollment.progress
        // A pending allocation (no confirmed count) is never bookable.
        .filter((item) => !item.pending && item.remaining !== null && item.remaining > 0)
        .map((item) => ({
          key: `${enrollment.id}|${item.id}`,
          enrollmentId: enrollment.id,
          requirementId: item.id,
          enrollmentLabel: enrollment.packageName,
          requirementLabel: `${labels.vehicleType[item.vehicleType]} · ${labels.trainingType[item.trainingType]}`,
          vehicleLabel: labels.vehicleType[item.vehicleType],
          remaining: item.remaining ?? 0,
        })),
    );

  return (
    <>
      <PageIntro
        title="Lessons"
        description="Practical driving lessons in fixed session times. Each lesson is one-to-one: one student, one instructor and one vehicle."
      />

      <section aria-labelledby="book-heading" className="flex flex-col gap-4">
        <SectionTitle id="book-heading" icon="car" tone="gold">Book a lesson</SectionTitle>
        <LessonBookingForm requirements={bookable} />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section aria-labelledby="upcoming-heading" className="glass rounded-[22px] p-6">
          <SectionTitle id="upcoming-heading" icon="calendar" tone="blue">Upcoming lessons</SectionTitle>
          <div className="mt-4">
            {lessons.upcoming.length === 0 ? (
              <EmptyState title="No upcoming lessons" body="Lessons you book appear here." />
            ) : (
              <ul className="divide-y divide-line">
                {lessons.upcoming.map((lesson) => (
                  <li key={lesson.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-semibold text-ink">
                        {formatDate(lesson.lessonDate)} · {lesson.startTime}–{lesson.endTime}
                      </p>
                      <p className="text-[0.8125rem] text-muted">
                        {lesson.durationMinutes} min · {labels.vehicleType[lesson.vehicleType]} · {lesson.instructorName}
                      </p>
                      {lesson.cancellation && <CancellationNote cancellation={lesson.cancellation} />}
                    </div>
                    <StatusBadge status={lesson.status} label={labels.lessonStatus[lesson.status]} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section aria-labelledby="past-heading" className="glass rounded-[22px] p-6">
          <SectionTitle id="past-heading" icon="check-circle" tone="green">Lesson history</SectionTitle>
          <div className="mt-4">
            {lessons.past.length === 0 ? (
              <EmptyState title="No past lessons" body="Completed lessons appear here with attendance and any feedback." />
            ) : (
              <ul className="divide-y divide-line">
                {lessons.past.map((lesson) => (
                  <li key={lesson.id} className="flex flex-col gap-2 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-ink">
                        {formatDate(lesson.lessonDate)} · {lesson.startTime}–{lesson.endTime}
                      </p>
                      <div className="flex gap-2">
                        <StatusBadge status={lesson.status} label={labels.lessonStatus[lesson.status]} />
                        {lesson.attendance && <StatusBadge status={lesson.attendance} label={labels.attendance[lesson.attendance]} />}
                      </div>
                    </div>
                    <p className="text-[0.8125rem] text-muted">
                      {lesson.durationMinutes} min · {labels.vehicleType[lesson.vehicleType]} · {lesson.instructorName}
                    </p>
                    {lesson.cancellation && <CancellationNote cancellation={lesson.cancellation} />}
                    {lesson.feedback && <p className="rounded-xl bg-page px-3 py-2 text-[0.8125rem] text-ink">Feedback: {lesson.feedback.text}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
