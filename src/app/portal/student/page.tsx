import type { Metadata } from "next";
import PortalFrame from "@/components/portal/PortalFrame";
import { requirePortalUser } from "@/lib/auth/portal-guard";

export const metadata: Metadata = {
  title: "Student Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

export default async function StudentPortalPage() {
  await requirePortalUser("STUDENT");

  return (
    <PortalFrame eyebrow="Student Portal" title="Welcome">
      <p>Your student tools are being built. This page confirms your sign-in works and that only students see it.</p>
    </PortalFrame>
  );
}
