import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminFrame from "@/components/admin/AdminFrame";
import { formatDate, formatDateTime, formatMoney, labels } from "@/components/student/format";
import StatusBadge from "@/components/student/StatusBadge";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { getStudentProfile, isDirectoryId } from "@/lib/admin/directory";

export const metadata: Metadata = {
  title: "Student profile | Admin Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

/** Read-only record of one student: profile, application, enrollments with progress, lessons and appointments. */
export default async function AdminStudentProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  await requirePortalUser("ADMIN");
  const { userId } = await params;
  if (!isDirectoryId(userId)) notFound();
  const profile = await getStudentProfile(userId);
  if (!profile) notFound();
  const { student, registration, enrollments, lessonCounts, upcomingLessons, upcomingMedical, upcomingExams } = profile;

  return (
    <AdminFrame
      title={student.fullName}
      description={`Student ID ${student.studentId}. Read-only: nothing on this page can be changed here.`}
      active="/portal/admin/students"
      crumbs={[{ label: "Students", href: "/portal/admin/students" }, { label: student.fullName }]}
    >
      <div className="grid gap-6">
        <section aria-labelledby="profile-heading" className="glass rounded-[22px] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="profile-heading" className="text-[1.125rem] font-bold text-ink">
              Profile
            </h2>
            <StatusBadge status={student.accountStatus} label={student.accountStatus === "ACTIVE" ? "Active" : "Inactive"} />
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Student ID" value={student.studentId} />
            <Field label="Email" value={student.email ?? "No email"} />
            <Field label="NIC" value={student.nicNumber} />
            <Field label="Mobile" value={student.phoneNumber} />
            <Field label="Date of birth" value={formatDate(student.birthday)} />
            <Field label="Address" value={student.address} />
            <Field label="Start date" value={student.startDate ? formatDate(student.startDate) : "Not set"} />
            <Field label="Account created" value={formatDateTime(new Date(student.createdAt))} />
          </dl>
        </section>

        <section aria-labelledby="registration-heading" className="glass rounded-[22px] p-5">
          <h2 id="registration-heading" className="text-[1.125rem] font-bold text-ink">
            Registration
          </h2>
          {registration ? (
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Reference" value={registration.referenceNumber} />
              <Field label="Application status" value={labels.registrationStatus[registration.status] ?? registration.status} />
              <Field label="Package" value={registration.packageName} />
              <Field label="Submitted" value={formatDateTime(new Date(registration.submittedAt))} />
              {registration.reviewedAt && <Field label="Reviewed" value={formatDateTime(new Date(registration.reviewedAt))} />}
            </dl>
          ) : (
            <p className="mt-4 text-[0.9375rem] text-muted">No registration application is linked to this student.</p>
          )}
        </section>

        <section aria-labelledby="enrollments-heading" className="glass rounded-[22px] p-5">
          <h2 id="enrollments-heading" className="text-[1.125rem] font-bold text-ink">
            Enrollments
          </h2>
          {enrollments.length === 0 ? (
            <p className="mt-4 text-[0.9375rem] text-muted">No enrollments yet.</p>
          ) : (
            <ul className="mt-4 grid gap-4">
              {enrollments.map((enrollment) => (
                <li key={enrollment.id} className="rounded-2xl bg-white p-4 ring-1 ring-line">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-ink">{enrollment.packageName}</p>
                    <StatusBadge status={enrollment.status} label={labels.enrollmentStatus[enrollment.status] ?? enrollment.status} />
                  </div>
                  <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                    <Field label="Enrolled" value={formatDate(enrollment.enrollmentDate.toISOString().slice(0, 10))} />
                    <Field label="Agreed price" value={formatMoney(enrollment.agreedPrice)} />
                    <Field label="Approved payments" value={formatMoney(enrollment.approvedPaid)} />
                  </dl>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[480px] border-collapse text-left text-[0.875rem]">
                      <caption className="sr-only">Training progress for {enrollment.packageName}</caption>
                      <thead>
                        <tr className="text-[0.75rem] uppercase tracking-[0.06em] text-muted">
                          <th scope="col" className="border-b border-line px-3 py-2 font-semibold">Vehicle</th>
                          <th scope="col" className="border-b border-line px-3 py-2 font-semibold">Training</th>
                          <th scope="col" className="border-b border-line px-3 py-2 font-semibold">Required</th>
                          <th scope="col" className="border-b border-line px-3 py-2 font-semibold">Completed</th>
                          <th scope="col" className="border-b border-line px-3 py-2 font-semibold">Scheduled</th>
                          <th scope="col" className="border-b border-line px-3 py-2 font-semibold">Remaining</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrollment.progress.map((row) => (
                          <tr key={row.id}>
                            <td className="border-b border-line px-3 py-2">{labels.vehicleType[row.vehicleType] ?? row.vehicleType}</td>
                            <td className="border-b border-line px-3 py-2">{labels.trainingType[row.trainingType] ?? row.trainingType}</td>
                            <td className="border-b border-line px-3 py-2">{row.requiredSessions}</td>
                            <td className="border-b border-line px-3 py-2">{row.completed}</td>
                            <td className="border-b border-line px-3 py-2">{row.scheduled}</td>
                            <td className="border-b border-line px-3 py-2">{row.remaining}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="lessons-heading" className="glass rounded-[22px] p-5">
          <h2 id="lessons-heading" className="text-[1.125rem] font-bold text-ink">
            Lessons
          </h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <Field label="Scheduled" value={String(lessonCounts.SCHEDULED)} />
            <Field label="Completed" value={String(lessonCounts.COMPLETED)} />
            <Field label="Cancelled" value={String(lessonCounts.CANCELLED)} />
          </dl>
          <h3 className="mt-6 text-[0.9375rem] font-bold text-ink">Upcoming lessons</h3>
          {upcomingLessons.length === 0 ? (
            <p className="mt-2 text-[0.9375rem] text-muted">No upcoming lessons.</p>
          ) : (
            <ul className="mt-2 grid gap-2">
              {upcomingLessons.map((lesson) => (
                <li key={lesson.id} className="text-[0.9375rem] text-ink">
                  {formatDate(lesson.lessonDate)} · {lesson.startTime}–{lesson.endTime} · {labels.vehicleType[lesson.vehicleType]} ·{" "}
                  {lesson.instructorName}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="appointments-heading" className="glass rounded-[22px] p-5">
          <h2 id="appointments-heading" className="text-[1.125rem] font-bold text-ink">
            Upcoming appointments
          </h2>
          <h3 className="mt-4 text-[0.9375rem] font-bold text-ink">Medical</h3>
          {upcomingMedical.length === 0 ? (
            <p className="mt-2 text-[0.9375rem] text-muted">No scheduled medical appointments.</p>
          ) : (
            <ul className="mt-2 grid gap-2">
              {upcomingMedical.map((item) => (
                <li key={item.appointmentDate} className="text-[0.9375rem] text-ink">
                  {formatDateTime(new Date(item.appointmentDate))} · {labels.medicalStatus[item.status] ?? item.status}
                </li>
              ))}
            </ul>
          )}
          <h3 className="mt-5 text-[0.9375rem] font-bold text-ink">Exams</h3>
          {upcomingExams.length === 0 ? (
            <p className="mt-2 text-[0.9375rem] text-muted">No scheduled exams.</p>
          ) : (
            <ul className="mt-2 grid gap-2">
              {upcomingExams.map((exam) => (
                <li key={`${exam.scheduledDate}-${exam.examType}`} className="text-[0.9375rem] text-ink">
                  {formatDateTime(new Date(exam.scheduledDate))} · {labels.examType[exam.examType] ?? exam.examType}
                  {exam.vehicleType ? ` · ${labels.vehicleType[exam.vehicleType]}` : ""}
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
