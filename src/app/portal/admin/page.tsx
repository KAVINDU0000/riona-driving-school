import type { Metadata } from "next";
import RegistrationReview from "@/components/admin/RegistrationReview";
import PortalFrame from "@/components/portal/PortalFrame";
import { requirePortalUser } from "@/lib/auth/portal-guard";

export const metadata: Metadata = {
  title: "Admin Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

export default async function AdminPortalPage() {
  await requirePortalUser("ADMIN");

  return (
    <PortalFrame eyebrow="Admin Portal" title="Registrations">
      <p className="mb-6">Review student applications. Approving creates the student account and enrollment. Rejecting requires a reason.</p>
      <RegistrationReview />
    </PortalFrame>
  );
}
