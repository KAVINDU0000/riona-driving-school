import type { Metadata } from "next";
import Link from "next/link";
import AdminFrame from "@/components/admin/AdminFrame";
import { DirectoryPager } from "@/components/admin/DirectoryControls";
import { ROW_LINK, initialsOf } from "@/components/admin/admin-ui";
import { formatDateTime, labels } from "@/components/student/format";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { listUpcomingExams } from "@/lib/admin/upcoming-appointments";

export const metadata: Metadata = {
  title: "Upcoming exams | Admin Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

/** Read-only list of scheduled exams from now on, soonest first. Results are not shown here. */
export default async function AdminExamsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requirePortalUser("ADMIN");
  const { page: pageParam } = await searchParams;
  const page = /^[1-9][0-9]{0,5}$/.test(pageParam ?? "") ? Number(pageParam) : 1;
  const result = await listUpcomingExams(page);

  return (
    <AdminFrame
      title="Upcoming exams"
      description="Scheduled exams from now on, soonest first. Read-only: exams are managed through the student's record."
      active="/portal/admin"
      crumbs={[{ label: "Dashboard", href: "/portal/admin" }, { label: "Upcoming exams" }]}
    >
      <section aria-labelledby="exams-heading" className="glass rounded-[22px] p-5">
        <h2 id="exams-heading" className="text-[1.125rem] font-bold text-ink">
          Scheduled exams
        </h2>
        <DirectoryPager
          basePath="/portal/admin/exams"
          q=""
          status="ALL"
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          label="Exam pages"
        />

        {result.items.length === 0 ? (
          <p className="mt-6 text-[0.9375rem] text-muted">No exams are scheduled from now on.</p>
        ) : (
          <ul className="mt-5 grid gap-2.5">
            {result.items.map((item) => (
              <li key={item.id}>
                <Link href={`/portal/admin/students/${encodeURIComponent(item.studentId)}`} className={ROW_LINK}>
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-page text-[0.8125rem] font-bold text-ink-soft ring-1 ring-line"
                  >
                    {initialsOf(item.studentName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-bold text-ink">{item.studentName}</span>
                    <span className="block text-[0.8125rem] text-muted">
                      {item.studentId} · {labels.examType[item.examType] ?? item.examType}
                      {item.vehicleType ? ` · ${labels.vehicleType[item.vehicleType] ?? item.vehicleType}` : ""}
                    </span>
                  </span>
                  <span className="text-right text-[0.875rem] font-semibold text-ink">{formatDateTime(new Date(item.scheduledDate))}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminFrame>
  );
}
