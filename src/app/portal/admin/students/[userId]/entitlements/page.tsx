import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdminFrame from "@/components/admin/AdminFrame";
import EntitlementConfirmForm from "@/components/admin/EntitlementConfirmForm";
import { labels } from "@/components/student/format";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { getStudentProfile, isDirectoryId } from "@/lib/admin/directory";
import { listStudentRequirements } from "@/lib/admin/entitlement-listing";
import { pendingSummary } from "@/lib/admin/entitlement-input";

export const metadata: Metadata = {
  title: "Session counts | Admin Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

/**
 * Confirms the session count of each enrollment requirement. A requirement with no count is "allocation pending" and
 * cannot be booked until the count is confirmed. Every change is saved with its reason in the confirmation history.
 */
export default async function AdminStudentEntitlementsPage({ params }: { params: Promise<{ userId: string }> }) {
  await requirePortalUser("ADMIN");
  const { userId } = await params;
  if (!isDirectoryId(userId)) notFound();
  const profile = await getStudentProfile(userId);
  if (!profile) notFound();
  const enrollments = await listStudentRequirements(userId);
  const pending = enrollments.flatMap((e) => e.requirements).filter((r) => r.requiredSessions === null).length;

  return (
    <AdminFrame
      title={`Session counts: ${profile.student.fullName}`}
      description="Confirm the session count for each requirement. A pending count blocks booking until it is confirmed."
      active="/portal/admin/students"
      crumbs={[
        { label: "Students", href: "/portal/admin/students" },
        { label: profile.student.fullName, href: `/portal/admin/students/${userId}` },
        { label: "Session counts" },
      ]}
    >
      <div className="grid gap-6">
        <p role="status" className={pending > 0 ? "rounded-xl bg-gold/15 px-4 py-3 text-[0.9375rem] font-medium text-ink" : "text-[0.9375rem] text-muted"}>
          {pendingSummary(pending)}
        </p>
        {enrollments.length === 0 ? (
          <p className="text-[0.9375rem] text-muted">This student has no enrollments.</p>
        ) : (
          enrollments.map((enrollment) => (
            <section key={enrollment.id} aria-labelledby={`enrollment-${enrollment.id}`} className="glass rounded-[22px] p-5">
              <h2 id={`enrollment-${enrollment.id}`} className="text-[1.125rem] font-bold text-ink">
                {enrollment.packageName}
              </h2>
              <p className="mt-1 text-[0.8125rem] text-muted">Enrollment status: {labels.enrollmentStatus[enrollment.status] ?? enrollment.status}</p>
              {enrollment.requirements.length === 0 ? (
                <p className="mt-3 text-[0.9375rem] text-muted">This enrollment has no requirements.</p>
              ) : (
                enrollment.requirements.map((requirement) => (
                  <EntitlementConfirmForm
                    key={requirement.id}
                    requirementId={requirement.id}
                    requiredSessions={requirement.requiredSessions}
                    used={requirement.used}
                    updatedAt={requirement.updatedAt}
                    history={requirement.history}
                    label={`${labels.vehicleType[requirement.vehicleType] ?? requirement.vehicleType} · ${labels.trainingType[requirement.trainingType] ?? requirement.trainingType}`}
                  />
                ))
              )}
            </section>
          ))
        )}
        <Link href={`/portal/admin/students/${userId}`} className="text-[0.9375rem] font-semibold text-ink underline">
          Back to the student profile
        </Link>
      </div>
    </AdminFrame>
  );
}
