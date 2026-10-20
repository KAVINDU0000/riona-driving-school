import type { Metadata } from "next";
import AdminFrame from "@/components/admin/AdminFrame";
import RegistrationReview from "@/components/admin/RegistrationReview";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Registrations | Admin Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

/**
 * Review queue for student applications. Packages are listed by name for the filter, including inactive ones,
 * because older applications may still refer to them. The component checks every action again on the server.
 */
export default async function AdminRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; payment?: string }>;
}) {
  await requirePortalUser("ADMIN");
  const { status, payment } = await searchParams;
  const packages = await prisma.trainingPackage.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  const initialStatus = status === "PENDING" || status === "APPROVED" || status === "REJECTED" || status === "ALL" ? status : "PENDING";

  return (
    <AdminFrame
      title="Registrations"
      description="Review student applications. Approving creates the student account and enrollment. Rejecting requires a reason."
      active="/portal/admin/registrations"
    >
      <RegistrationReview packages={packages} initialStatus={initialStatus} initialPaymentPending={payment === "PENDING"} />
    </AdminFrame>
  );
}
