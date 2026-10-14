import type { Metadata } from "next";
import PortalFrame from "@/components/portal/PortalFrame";
import { requirePortalUser } from "@/lib/auth/portal-guard";

export const metadata: Metadata = {
  title: "Instructor Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

export default async function InstructorPortalPage() {
  await requirePortalUser("INSTRUCTOR");

  return (
    <PortalFrame eyebrow="Instructor Portal" title="Welcome">
      <p>Your instructor tools are being built. This page confirms your sign-in works and that only instructors see it.</p>
    </PortalFrame>
  );
}
