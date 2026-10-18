import type { Metadata } from "next";
import Link from "next/link";
import AdminFrame from "@/components/admin/AdminFrame";
import InstructorForm from "@/components/admin/InstructorForm";
import { DirectoryPager, DirectorySearch } from "@/components/admin/DirectoryControls";
import { ROW_LINK, initialsOf } from "@/components/admin/admin-ui";
import StatusBadge from "@/components/student/StatusBadge";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { directoryQuery, listInstructors, type DirectoryStatus } from "@/lib/admin/directory";

export const metadata: Metadata = {
  title: "Instructors | Admin Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

const STATUS_LABELS: Record<DirectoryStatus, string> = { ALL: "All instructors", ACTIVE: "Active", INACTIVE: "Inactive" };

/**
 * Add Instructor form, then a read-only directory. The form creates an account and sends the invitation; the API
 * checks the admin role and every field again. The directory only reads.
 */
export default async function AdminInstructorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requirePortalUser("ADMIN");
  const query = directoryQuery(await searchParams);
  const result = await listInstructors(query);

  return (
    <AdminFrame
      title="Instructors"
      description="Add an instructor. The instructor sets their own password from the invitation link. The link is valid for a limited time."
      active="/portal/admin/instructors"
    >
      <section aria-labelledby="add-instructor-heading" className="glass rounded-[22px] p-5">
        <h2 id="add-instructor-heading" className="text-[1.125rem] font-bold text-ink">
          Add instructor
        </h2>
        <div className="mt-5">
          <InstructorForm />
        </div>
      </section>

      <section aria-labelledby="instructor-directory-heading" className="glass mt-6 rounded-[22px] p-5">
        <h2 id="instructor-directory-heading" className="text-[1.125rem] font-bold text-ink">
          Instructor directory
        </h2>
        <p className="mt-2 text-[0.875rem] text-muted">Upcoming scheduled lessons count lessons from today onward.</p>
        <div className="mt-4">
          <DirectorySearch
            id="instructors"
            label="Search instructors"
            placeholder="Name, instructor ID, email or phone"
            q={query.q}
            status={query.status}
            statusLabels={STATUS_LABELS}
          />
        </div>

        <DirectoryPager
          basePath="/portal/admin/instructors"
          q={query.q}
          status={query.status}
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          label="Instructor pages"
        />

        {result.instructors.length === 0 ? (
          <p className="mt-6 text-[0.9375rem] text-muted">No instructors match these filters.</p>
        ) : (
          <ul className="mt-5 grid gap-2.5">
            {result.instructors.map((instructor) => {
              const active = instructor.accountStatus === "ACTIVE" && instructor.profileStatus === "ACTIVE";
              return (
                <li key={instructor.instructorId}>
                  <Link href={`/portal/admin/instructors/${encodeURIComponent(instructor.instructorId)}`} className={ROW_LINK}>
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-page text-[0.8125rem] font-bold text-ink-soft ring-1 ring-line"
                    >
                      {initialsOf(instructor.fullName)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center justify-between gap-2">
                        <span className="truncate font-semibold text-ink">{instructor.fullName}</span>
                        <StatusBadge status={active ? "ACTIVE" : "INACTIVE"} label={active ? "Active" : "Inactive"} />
                      </span>
                      <span className="mt-0.5 block font-mono text-[0.75rem] text-muted">{instructor.instructorId}</span>
                      <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-muted">
                        <span>{instructor.email ?? "No email"}</span>
                        <span aria-hidden="true">·</span>
                        <span>{instructor.phoneNumber}</span>
                        <span aria-hidden="true">·</span>
                        <span className="rounded-md bg-page px-2 py-0.5 font-medium text-ink-soft ring-1 ring-line">
                          {instructor.upcomingScheduledLessons === 1
                            ? "1 upcoming lesson"
                            : `${instructor.upcomingScheduledLessons} upcoming lessons`}
                        </span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AdminFrame>
  );
}
