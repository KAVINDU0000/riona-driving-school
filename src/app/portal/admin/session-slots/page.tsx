import type { Metadata } from "next";
import AdminFrame from "@/components/admin/AdminFrame";
import SessionSlotsManager from "@/components/admin/SessionSlotsManager";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { listSessionSlotsForAdmin } from "@/lib/session-slots/store";

export const metadata: Metadata = {
  title: "Session times | Admin Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

/**
 * The four fixed session times that students book and instructors take. Admins change a time or open and close it. The API
 * checks every change again.
 */
export default async function AdminSessionSlotsPage() {
  await requirePortalUser("ADMIN");
  const slots = await listSessionSlotsForAdmin();

  return (
    <AdminFrame
      title="Session times"
      description="Students can only book these four session times, and instructors take them. A closed session cannot be booked. A time cannot move while instructors or lessons are on it from today onward."
      active="/portal/admin/session-slots"
    >
      <SessionSlotsManager slots={slots} />
    </AdminFrame>
  );
}
