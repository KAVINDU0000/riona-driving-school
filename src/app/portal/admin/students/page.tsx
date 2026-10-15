import type { Metadata } from "next";
import Link from "next/link";
import AdminFrame from "@/components/admin/AdminFrame";
import { DirectoryPager, DirectorySearch } from "@/components/admin/DirectoryControls";
import StatusBadge from "@/components/student/StatusBadge";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { directoryQuery, listStudents, type DirectoryStatus } from "@/lib/admin/directory";

export const metadata: Metadata = {
  title: "Students | Admin Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

const STATUS_LABELS: Record<DirectoryStatus, string> = { ALL: "All students", ACTIVE: "Active", INACTIVE: "Inactive" };

/** Read-only list of student accounts. Search and status are kept in the address, so a result can be shared. */
export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requirePortalUser("ADMIN");
  const query = directoryQuery(await searchParams);
  const result = await listStudents(query);

  return (
    <AdminFrame
      title="Students"
      description="Find a student and see their registration, enrollments and lessons. This directory is read-only."
      active="/portal/admin/students"
    >
      <section aria-labelledby="student-directory-heading" className="glass rounded-[22px] p-5">
        <h2 id="student-directory-heading" className="text-[1.125rem] font-bold text-ink">
          Student directory
        </h2>
        <div className="mt-4">
          <DirectorySearch
            id="students"
            label="Search students"
            placeholder="Name, student ID, email, NIC or phone"
            q={query.q}
            status={query.status}
            statusLabels={STATUS_LABELS}
          />
        </div>

        <DirectoryPager
          basePath="/portal/admin/students"
          q={query.q}
          status={query.status}
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          label="Student pages"
        />

        {result.students.length === 0 ? (
          <p className="mt-6 text-[0.9375rem] text-muted">No students match these filters.</p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {result.students.map((student) => (
              <li key={student.studentId}>
                <Link
                  href={`/portal/admin/students/${encodeURIComponent(student.studentId)}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3.5 ring-1 ring-line transition-colors hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
                >
                  <span className="grid gap-0.5">
                    <span className="font-semibold text-ink">{student.fullName}</span>
                    <span className="text-[0.8125rem] text-muted">
                      {student.studentId} · {student.email ?? "No email"} · {student.phoneNumber} · NIC {student.nicMasked}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-[0.8125rem] text-muted">
                      {student.activeEnrollments === 1 ? "1 active enrollment" : `${student.activeEnrollments} active enrollments`}
                    </span>
                    <StatusBadge
                      status={student.accountStatus}
                      label={student.accountStatus === "ACTIVE" ? "Active" : "Inactive"}
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminFrame>
  );
}
