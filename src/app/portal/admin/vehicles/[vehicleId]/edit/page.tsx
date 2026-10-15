import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminFrame from "@/components/admin/AdminFrame";
import VehicleForm from "@/components/admin/VehicleForm";
import { getVehicleDetail } from "@/lib/admin/vehicles";
import { AuthError } from "@/lib/auth/http";
import { requirePortalUser } from "@/lib/auth/portal-guard";

export const metadata: Metadata = {
  title: "Edit vehicle | Admin Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

/** Edits a vehicle's details. Status is changed from the vehicle page, where future lessons are checked. */
export default async function AdminEditVehiclePage({ params }: { params: Promise<{ vehicleId: string }> }) {
  await requirePortalUser("ADMIN");
  const { vehicleId } = await params;
  const vehicle = await getVehicleDetail(vehicleId).catch((error: unknown) => {
    if (error instanceof AuthError && error.status === 404) return null;
    throw error;
  });
  if (!vehicle) notFound();

  return (
    <AdminFrame
      title="Edit vehicle"
      description="Change the vehicle's details. To change its status, use the status section on the vehicle page."
      active="/portal/admin/vehicles"
      crumbs={[{ label: "Vehicles", href: "/portal/admin/vehicles" }, { label: vehicle.registrationNumber, href: `/portal/admin/vehicles/${vehicle.id}` }, { label: "Edit" }]}
    >
      <section aria-labelledby="edit-vehicle-heading" className="glass rounded-[22px] p-5">
        <h2 id="edit-vehicle-heading" className="text-[1.125rem] font-bold text-ink">
          Vehicle details
        </h2>
        <div className="mt-5">
          <VehicleForm
            mode="edit"
            vehicleId={vehicle.id}
            expectedUpdatedAt={vehicle.updatedAt}
            initial={{
              registrationNumber: vehicle.registrationNumber,
              vehicleType: vehicle.vehicleType,
              make: vehicle.make ?? "",
              model: vehicle.model ?? "",
              manufacturingYear: vehicle.manufacturingYear ? String(vehicle.manufacturingYear) : "",
              colour: vehicle.colour ?? "",
              transmissionType: vehicle.transmissionType,
              description: vehicle.description ?? "",
              status: vehicle.status,
            }}
          />
        </div>
      </section>
    </AdminFrame>
  );
}
