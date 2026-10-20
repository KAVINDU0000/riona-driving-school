import type { Metadata } from "next";
import Link from "next/link";
import InstructorFrame from "@/components/instructor/InstructorFrame";
import EmptyState from "@/components/student/EmptyState";
import { formatDate } from "@/components/student/format";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { listAssignedStudents } from "@/lib/instructor/lessons";

export const metadata: Metadata = {
  title: "Students | Instructor Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

/** Students this instructor has lessons with. Only the name, mobile number and this instructor's own lesson counts are shown. */
export default async function InstructorStudentsPage() {
  const user = await requirePortalUser("INSTRUCTOR");
  const students = await listAssignedStudents(user.userId);

  return (
    <InstructorFrame title="Students" description="Students assigned to you through booked lessons." active="/portal/instructor/students">
      {students.length === 0 ? (
        <EmptyState
          title="No students yet"
          body="Students appear here once they book a lesson with you. Set your availability so they can."
          action={{ label: "Set availability", href: "/portal/instructor/availability" }}
        />
      ) : (
        <ul className="grid gap-3">
          {students.map((student) => (
            <li key={student.userId}>
              <Link
                href={`/portal/instructor/students/${student.userId}`}
                className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(16,27,48,0.04)] transition-all hover:border-gold/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-[0.9375rem] font-bold text-ink">{student.fullName}</p>
                  <p className="mt-0.5 text-[0.8125rem] text-muted">
                    {student.userId} · {student.phoneNumber}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-[0.8125rem] sm:grid-cols-4">
                  <div>
                    <dt className="text-muted">Lessons with you</dt>
                    <dd className="font-semibold text-ink">{student.lessonCount}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Completed</dt>
                    <dd className="font-semibold text-ink">{student.completedCount}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Last lesson</dt>
                    <dd className="font-semibold text-ink">{student.lastLessonDate ? formatDate(student.lastLessonDate) : "None yet"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Next lesson</dt>
                    <dd className="font-semibold text-ink">{student.nextLessonDate ? formatDate(student.nextLessonDate) : "Not booked"}</dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </InstructorFrame>
  );
}
