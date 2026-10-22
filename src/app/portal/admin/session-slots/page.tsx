import type { Metadata } from "next";
import AdminFrame from "@/components/admin/AdminFrame";
import SeatLimitsManager from "@/components/admin/SeatLimitsManager";
import SessionSlotsManager from "@/components/admin/SessionSlotsManager";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { listSeatLimits } from "@/lib/session-slots/seats";
import { listSessionSlotsForAdmin } from "@/lib/session-slots/store";

export const metadata: Metadata = {
  title: "Session times | Admin Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

/**
 * The four fixed session times that students book and instructors take, and how many students each vehicle type can
 * take in one session. Admins change a time, open or close it, or change a seat limit. The API checks every change again.
 */
export default async function AdminSessionSlotsPage() {
  await requirePortalUser("ADMIN");
  const [slots, limits] = await Promise.all([listSessionSlotsForAdmin(), listSeatLimits()]);

  return (
    <AdminFrame
      title="Session times"
      description="Students can only book these four session times. A session can hold several students in one vehicle, up to the seat limit for its type. A time cannot move while instructors or lessons are on it from today onward."
      active="/portal/admin/session-slots"
    >
      <section aria-labelledby="slots-heading" className="mb-10 grid gap-4">
        <h2 id="slots-heading" className="text-[1.125rem] font-bold text-ink">
          Session times
        </h2>
        <SessionSlotsManager slots={slots} />
      </section>
      <section aria-labelledby="seats-heading" className="grid gap-4">
        <h2 id="seats-heading" className="text-[1.125rem] font-bold text-ink">
          Students per session
        </h2>
        <p className="text-[0.875rem] text-muted">How many students one vehicle of each type can take in one session.</p>
        <SeatLimitsManager limits={limits} />
      </section>
    </AdminFrame>
  );
}
