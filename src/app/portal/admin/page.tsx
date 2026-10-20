import type { Metadata } from "next";
import Link from "next/link";
import AdminFrame from "@/components/admin/AdminFrame";
import AdminStatCard from "@/components/admin/AdminStatCard";
import { formatDate } from "@/components/student/format";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { getAdminDashboardStats } from "@/lib/admin/dashboard";

export const metadata: Metadata = {
  title: "Admin Dashboard | Riyona Driving School",
  robots: { index: false, follow: false },
};

/**
 * Overview of the school. Each number is counted from the database when the page loads. A card links to its
 * management page only when that page exists. The others say so, rather than linking to nothing.
 */
export default async function AdminDashboardPage() {
  await requirePortalUser("ADMIN");
  const stats = await getAdminDashboardStats();

  const cards: {
    label: string;
    value: number;
    caption: string;
    icon: string;
    href?: string;
  }[] = [
    { label: "Pending applications", value: stats.pendingApplications, caption: "Waiting for review", icon: "file-check", href: "/portal/admin/registrations" },
    { label: "Active students", value: stats.activeStudents, caption: "Active accounts with a student profile", icon: "users", href: "/portal/admin/students" },
    { label: "Active instructors", value: stats.activeInstructors, caption: "Active accounts and profiles", icon: "user", href: "/portal/admin/instructors" },
    { label: "Today's scheduled lessons", value: stats.todaysScheduledLessons, caption: `School date ${formatDate(stats.today)}`, icon: "calendar" },
    { label: "Lessons needing action", value: stats.lessonsNeedingAction, caption: "Ended, still scheduled", icon: "clock" },
    {
      label: "Upcoming medical appointments",
      value: stats.upcomingMedicalAppointments,
      caption: "Scheduled, from now on",
      icon: "heart-pulse",
      href: "/portal/admin/medical-appointments",
    },
    {
      label: "Upcoming exams",
      value: stats.upcomingExams,
      caption: "Scheduled, from now on",
      icon: "badge-check",
      href: "/portal/admin/exams",
    },
    {
      label: "Pending payment reviews",
      value: stats.pendingPaymentReviews,
      caption: "Bank slips waiting for review",
      icon: "wallet",
      href: "/portal/admin/registrations?status=ALL&payment=PENDING",
    },
    {
      label: "Vehicles needing attention",
      value: stats.vehiclesNeedingAttention,
      caption: "In maintenance or inactive",
      icon: "car",
      href: "/portal/admin/vehicles?status=NEEDS_ATTENTION",
    },
  ];

  return (
    <AdminFrame title="Dashboard" description="Current figures from the school's records." active="/portal/admin">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const body = (
            <AdminStatCard label={card.label} value={card.value} caption={card.caption} icon={card.icon} linked={Boolean(card.href)}>
              {!card.href && <p className="text-[0.75rem] font-medium text-muted">Management page not yet available</p>}
            </AdminStatCard>
          );
          return card.href ? (
            <Link
              key={card.label}
              href={card.href}
              className="block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
            >
              {body}
            </Link>
          ) : (
            <div key={card.label} className="h-full">
              {body}
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-[0.8125rem] text-muted">
        Outstanding balances are not shown. The school has not defined how amounts owed are calculated.
      </p>
    </AdminFrame>
  );
}
