import type { Metadata } from "next";
import Link from "next/link";
import AdminFrame from "@/components/admin/AdminFrame";
import { DirectoryPager, DirectorySearch } from "@/components/admin/DirectoryControls";
import { ROW_LINK, initialsOf } from "@/components/admin/admin-ui";
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
          <ul className="mt-5 grid gap-2.5">
            {result.students.map((student) => (
              <li key={student.studentId}>
                <Link href={`/portal/admin/students/${encodeURIComponent(student.studentId)}`} className={ROW_LINK}>
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-page text-[0.8125rem] font-bold text-ink-soft ring-1 ring-line"
                  >
                    {initialsOf(student.fullName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="truncate font-semibold text-ink">{student.fullName}</span>
                      <StatusBadge
                        status={student.accountStatus}
                        label={student.accountStatus === "ACTIVE" ? "Active" : "Inactive"}
                      />
                    </span>
                    <span className="mt-0.5 block font-mono text-[0.75rem] text-muted">{student.studentId}</span>
                    <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-muted">
                      <span>{student.email ?? "No email"}</span>
                      <span aria-hidden="true">·</span>
                      <span>{student.phoneNumber}</span>
                      <span aria-hidden="true">·</span>
                      <span>NIC {student.nicMasked}</span>
                      <span aria-hidden="true">·</span>
                      <span className="rounded-md bg-page px-2 py-0.5 font-medium text-ink-soft ring-1 ring-line">
                        {student.activeEnrollments === 1 ? "1 active enrollment" : `${student.activeEnrollments} active enrollments`}
                      </span>
                    </span>
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
