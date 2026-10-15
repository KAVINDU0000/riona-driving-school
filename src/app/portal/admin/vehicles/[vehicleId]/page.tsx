import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdminFrame from "@/components/admin/AdminFrame";
import VehicleStatusPanel from "@/components/admin/VehicleStatusPanel";
import { getVehicleDetail } from "@/lib/admin/vehicles";
import {
  AUDIT_ACTION_LABELS,
  TRANSMISSION_LABELS,
  VEHICLE_STATUS_LABELS,
  VEHICLE_STATUS_STYLES,
  VEHICLE_TYPE_LABELS,
} from "@/lib/admin/vehicle-labels";
import { AuthError } from "@/lib/auth/http";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Vehicle | Admin Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

const LESSON_STATUS_LABELS: Record<string, string> = { SCHEDULED: "Scheduled", COMPLETED: "Completed", CANCELLED: "Cancelled" };

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid gap-1">
      <dt className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-muted">{label}</dt>
      <dd className="text-[0.9375rem] text-ink">{value || "—"}</dd>
    </div>
  );
}

/** One vehicle: its details, the status workflow, lesson history and audit history. */
export default async function AdminVehicleDetailPage({ params }: { params: Promise<{ vehicleId: string }> }) {
  await requirePortalUser("ADMIN");
  const { vehicleId } = await params;
  const vehicle = await getVehicleDetail(vehicleId).catch((error: unknown) => {
    if (error instanceof AuthError && error.status === 404) return null;
    throw error;
  });
  if (!vehicle) notFound();

  // Names for the audit trail: only the acting admin's ID is kept there, so look up nothing more than that.
  const actorIds = [...new Set(vehicle.auditLogs.map((entry) => entry.actorUserId))];
  const actorRows = actorIds.length ? await prisma.user.findMany({ where: { userId: { in: actorIds } }, select: { userId: true } }) : [];
  const knownActors = new Set(actorRows.map((row) => row.userId));

  const vehicleTitle = `${vehicle.registrationNumber}${vehicle.make || vehicle.model ? ` · ${[vehicle.make, vehicle.model].filter(Boolean).join(" ")}` : ""}`;

  return (
    <AdminFrame
      title={vehicle.registrationNumber}
      description="Details, the status workflow, and the lesson and change history for this vehicle."
      active="/portal/admin/vehicles"
      crumbs={[{ label: "Vehicles", href: "/portal/admin/vehicles" }, { label: vehicleTitle }]}
    >
      <section aria-labelledby="details-heading" className="glass rounded-[22px] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="details-heading" className="text-[1.125rem] font-bold text-ink">
            Details
          </h2>
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-[0.75rem] font-semibold ${VEHICLE_STATUS_STYLES[vehicle.status]}`}>
              {VEHICLE_STATUS_LABELS[vehicle.status]}
            </span>
            <Link href={`/portal/admin/vehicles/${vehicle.id}/edit`} className="text-[0.875rem] font-semibold text-gold-ink underline underline-offset-2">
              Edit details
            </Link>
          </div>
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Registration number" value={vehicle.registrationNumber} />
          <Detail label="Vehicle type" value={VEHICLE_TYPE_LABELS[vehicle.vehicleType]} />
          <Detail label="Transmission" value={TRANSMISSION_LABELS[vehicle.transmissionType]} />
          <Detail label="Make" value={vehicle.make} />
          <Detail label="Model" value={vehicle.model} />
          <Detail label="Manufacturing year" value={vehicle.manufacturingYear ? String(vehicle.manufacturingYear) : null} />
          <Detail label="Colour" value={vehicle.colour} />
          <Detail label="Notes" value={vehicle.description} />
        </dl>
      </section>

      <section aria-labelledby="status-heading" className="glass mt-6 rounded-[22px] p-5">
        <h2 id="status-heading" className="text-[1.125rem] font-bold text-ink">
          Status
        </h2>
        <p className="mt-2 text-[0.875rem] text-muted">
          Only active vehicles take new lessons. Check the scheduled lessons before changing the status, because each one must be
          moved or cancelled as part of the change.
        </p>
        <div className="mt-5">
          <VehicleStatusPanel vehicleId={vehicle.id} currentStatus={vehicle.status} expectedUpdatedAt={vehicle.updatedAt} />
        </div>
      </section>

      <section aria-labelledby="lessons-heading" className="glass mt-6 rounded-[22px] p-5">
        <h2 id="lessons-heading" className="text-[1.125rem] font-bold text-ink">
          Recent lessons
        </h2>
        {vehicle.lessonSchedules.length === 0 ? (
          <p className="mt-3 text-[0.9375rem] text-muted">No lessons have used this vehicle yet.</p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {vehicle.lessonSchedules.map((lesson) => (
              <li key={lesson.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-white p-3 text-[0.875rem] text-ink ring-1 ring-line">
                <span>
                  {lesson.lessonDate}, {lesson.startTime}
                </span>
                <span className="text-muted">{LESSON_STATUS_LABELS[lesson.status] ?? lesson.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="history-heading" className="glass mt-6 rounded-[22px] p-5">
        <h2 id="history-heading" className="text-[1.125rem] font-bold text-ink">
          Change history
        </h2>
        {vehicle.auditLogs.length === 0 ? (
          <p className="mt-3 text-[0.9375rem] text-muted">No changes recorded yet.</p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {vehicle.auditLogs.map((entry) => (
              <li key={entry.id} className="grid gap-1 rounded-xl bg-white p-3 text-[0.875rem] text-ink ring-1 ring-line">
                <span className="font-semibold">
                  {AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
                  {entry.action === "STATUS_CHANGED" && entry.previousStatus && entry.newStatus
                    ? `: ${VEHICLE_STATUS_LABELS[entry.previousStatus]} → ${VEHICLE_STATUS_LABELS[entry.newStatus]}`
                    : ""}
                </span>
                <span className="text-[0.8125rem] text-muted">
                  {new Date(entry.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Colombo" })} · by{" "}
                  {knownActors.has(entry.actorUserId) ? entry.actorUserId : "a removed account"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminFrame>
  );
}
