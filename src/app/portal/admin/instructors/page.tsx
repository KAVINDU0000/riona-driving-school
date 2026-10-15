import type { Metadata } from "next";
import Link from "next/link";
import AdminFrame from "@/components/admin/AdminFrame";
import InstructorForm from "@/components/admin/InstructorForm";
import { DirectoryPager, DirectorySearch } from "@/components/admin/DirectoryControls";
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
          <ul className="mt-4 grid gap-2">
            {result.instructors.map((instructor) => {
              const active = instructor.accountStatus === "ACTIVE" && instructor.profileStatus === "ACTIVE";
              return (
                <li key={instructor.instructorId}>
                  <Link
                    href={`/portal/admin/instructors/${encodeURIComponent(instructor.instructorId)}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3.5 ring-1 ring-line transition-colors hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
                  >
                    <span className="grid gap-0.5">
                      <span className="font-semibold text-ink">{instructor.fullName}</span>
                      <span className="text-[0.8125rem] text-muted">
                        {instructor.instructorId} · {instructor.email ?? "No email"} · {instructor.phoneNumber}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-[0.8125rem] text-muted">
                        {instructor.upcomingScheduledLessons === 1
                          ? "1 upcoming lesson"
                          : `${instructor.upcomingScheduledLessons} upcoming lessons`}
                      </span>
                      <StatusBadge status={active ? "ACTIVE" : "INACTIVE"} label={active ? "Active" : "Inactive"} />
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
