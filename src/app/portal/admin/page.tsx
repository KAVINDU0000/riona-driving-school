import type { Metadata } from "next";
import PortalFrame from "@/components/portal/PortalFrame";
import { requirePortalUser } from "@/lib/auth/portal-guard";

export const metadata: Metadata = {
  title: "Admin Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

export default async function AdminPortalPage() {
  await requirePortalUser("ADMIN");

  return (
    <PortalFrame eyebrow="Admin Portal" title="Welcome">
      <p>Your admin tools are being built. This page confirms your sign-in works and that only admins see it.</p>
    </PortalFrame>
  );
}
