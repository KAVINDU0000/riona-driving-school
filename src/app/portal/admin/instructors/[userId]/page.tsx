import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminFrame from "@/components/admin/AdminFrame";
import { formatDate, formatDateTime, labels } from "@/components/student/format";
import StatusBadge from "@/components/student/StatusBadge";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { getInstructorProfile, isDirectoryId } from "@/lib/admin/directory";

export const metadata: Metadata = {
  title: "Instructor profile | Admin Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

/** Read-only record of one instructor: profile, this month's lesson workload and upcoming lessons. */
export default async function AdminInstructorProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  await requirePortalUser("ADMIN");
  const { userId } = await params;
  if (!isDirectoryId(userId)) notFound();
  const profile = await getInstructorProfile(userId);
  if (!profile) notFound();
  const { instructor, monthLabel, monthCounts, upcomingLessons, upcomingAvailabilityWindows, availabilityWindows, feedbackCount } = profile;
  const active = instructor.accountStatus === "ACTIVE" && instructor.profileStatus === "ACTIVE";

  return (
    <AdminFrame
      title={instructor.fullName}
      description={`Instructor ID ${instructor.instructorId}. Read-only. Status changes are not available yet.`}
      active="/portal/admin/instructors"
      crumbs={[{ label: "Instructors", href: "/portal/admin/instructors" }, { label: instructor.fullName }]}
    >
      <div className="grid gap-6">
        <section aria-labelledby="instructor-profile-heading" className="glass rounded-[22px] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="instructor-profile-heading" className="text-[1.125rem] font-bold text-ink">
              Profile
            </h2>
            <StatusBadge status={active ? "ACTIVE" : "INACTIVE"} label={active ? "Active" : "Inactive"} />
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Instructor ID" value={instructor.instructorId} />
            <Field label="Email" value={instructor.email ?? "No email"} />
            <Field label="Mobile" value={instructor.phoneNumber} />
            <Field label="Hire date" value={formatDate(instructor.hireDate)} />
            <Field label="Account status" value={instructor.accountStatus === "ACTIVE" ? "Active" : "Inactive"} />
            <Field label="Profile status" value={instructor.profileStatus === "ACTIVE" ? "Active" : "Inactive"} />
            <Field label="Account created" value={formatDateTime(new Date(instructor.createdAt))} />
          </dl>
        </section>

        <section aria-labelledby="workload-heading" className="glass rounded-[22px] p-5">
          <h2 id="workload-heading" className="text-[1.125rem] font-bold text-ink">
            Workload
          </h2>
          <p className="mt-2 text-[0.875rem] text-muted">Lessons dated from the first of {monthLabel} to today (school time).</p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <Field label="Completed" value={String(monthCounts.COMPLETED)} />
            <Field label="Still scheduled" value={String(monthCounts.SCHEDULED)} />
            <Field label="Cancelled" value={String(monthCounts.CANCELLED)} />
          </dl>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Availability windows from today" value={String(upcomingAvailabilityWindows)} />
            <Field label="Lesson feedback written" value={String(feedbackCount)} />
          </dl>
        </section>

        <section aria-labelledby="availability-heading" className="glass rounded-[22px] p-5">
          <h2 id="availability-heading" className="text-[1.125rem] font-bold text-ink">
            Availability
          </h2>
          <p className="mt-2 text-[0.875rem] text-muted">
            The hours students can book this instructor. The instructor sets them; they are shown here for oversight and cannot be changed from this page.
          </p>
          {availabilityWindows.length === 0 ? (
            <p className="mt-4 text-[0.9375rem] text-muted">No availability is set, so students cannot book this instructor.</p>
          ) : (
            <ul className="mt-4 grid gap-2">
              {availabilityWindows.map((window) => (
                <li key={`${window.date}-${window.startTime}`} className="text-[0.9375rem] text-ink">
                  {formatDate(window.date)} · {window.startTime}–{window.endTime}
                </li>
              ))}
            </ul>
          )}
          {upcomingAvailabilityWindows > availabilityWindows.length && (
            <p className="mt-2 text-[0.8125rem] text-muted">Showing the next {availabilityWindows.length} of {upcomingAvailabilityWindows} windows.</p>
          )}
        </section>

        <section aria-labelledby="upcoming-heading" className="glass rounded-[22px] p-5">
          <h2 id="upcoming-heading" className="text-[1.125rem] font-bold text-ink">
            Upcoming lessons
          </h2>
          {upcomingLessons.length === 0 ? (
            <p className="mt-4 text-[0.9375rem] text-muted">No upcoming scheduled lessons.</p>
          ) : (
            <ul className="mt-4 grid gap-2">
              {upcomingLessons.map((lesson) => (
                <li key={lesson.id} className="text-[0.9375rem] text-ink">
                  {formatDate(lesson.lessonDate)} · {lesson.startTime}–{lesson.endTime} · {labels.vehicleType[lesson.vehicleType]} ·{" "}
                  {labels.trainingType[lesson.trainingType]} · {lesson.studentName}
                </li>
              ))}
            </ul>
          )}
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
