import type { Metadata } from "next";
import InstructorForm from "@/components/admin/InstructorForm";
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

      <section aria-labelledby="instructor-heading" className="glass mt-6 rounded-[22px] p-5">
        <h2 id="instructor-heading" className="text-[1.125rem] font-bold text-ink">
          Add instructor
        </h2>
        <p className="mt-2 text-[0.9375rem] text-muted">
          The instructor sets their own password from the invitation link. The link is valid for a limited time.
        </p>
        <div className="mt-5">
          <InstructorForm />
        </div>
      </section>
    </PortalFrame>
  );
}
