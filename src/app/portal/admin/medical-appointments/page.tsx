import type { Metadata } from "next";
import Link from "next/link";
import AdminFrame from "@/components/admin/AdminFrame";
import { DirectoryPager } from "@/components/admin/DirectoryControls";
import { ROW_LINK, initialsOf } from "@/components/admin/admin-ui";
import { formatDateTime } from "@/components/student/format";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { listUpcomingMedical } from "@/lib/admin/upcoming-appointments";

export const metadata: Metadata = {
  title: "Upcoming medical appointments | Admin Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

/** Read-only list of scheduled medical appointments from now on, soonest first. Notes are not shown. */
export default async function AdminMedicalAppointmentsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requirePortalUser("ADMIN");
  const { page: pageParam } = await searchParams;
  const page = /^[1-9][0-9]{0,5}$/.test(pageParam ?? "") ? Number(pageParam) : 1;
  const result = await listUpcomingMedical(page);

  return (
    <AdminFrame
      title="Upcoming medical appointments"
      description="Scheduled medical appointments from now on, soonest first. Read-only: appointments are managed through the student's record."
      active="/portal/admin"
      crumbs={[{ label: "Dashboard", href: "/portal/admin" }, { label: "Upcoming medical appointments" }]}
    >
      <section aria-labelledby="medical-heading" className="glass rounded-[22px] p-5">
        <h2 id="medical-heading" className="text-[1.125rem] font-bold text-ink">
          Scheduled appointments
        </h2>
        <DirectoryPager
          basePath="/portal/admin/medical-appointments"
          q=""
          status="ALL"
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          label="Appointment pages"
        />

        {result.items.length === 0 ? (
          <p className="mt-6 text-[0.9375rem] text-muted">No medical appointments are scheduled from now on.</p>
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
                    <span className="block text-[0.8125rem] text-muted">{item.studentId}</span>
                  </span>
                  <span className="text-right text-[0.875rem] font-semibold text-ink">{formatDateTime(new Date(item.appointmentDate))}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminFrame>
  );
}
