import type { Metadata } from "next";
import AdminFrame from "@/components/admin/AdminFrame";
import VehicleForm from "@/components/admin/VehicleForm";
import { requirePortalUser } from "@/lib/auth/portal-guard";

export const metadata: Metadata = {
  title: "Add vehicle | Admin Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

export default async function AdminNewVehiclePage() {
  await requirePortalUser("ADMIN");
  return (
    <AdminFrame
      title="Add vehicle"
      description="Enter the vehicle's registration and details. The registration number must not already be in the fleet."
      active="/portal/admin/vehicles"
      crumbs={[{ label: "Vehicles", href: "/portal/admin/vehicles" }, { label: "Add vehicle" }]}
    >
      <section aria-labelledby="new-vehicle-heading" className="glass rounded-[22px] p-5">
        <h2 id="new-vehicle-heading" className="text-[1.125rem] font-bold text-ink">
          Vehicle details
        </h2>
        <div className="mt-5">
          <VehicleForm mode="create" />
        </div>
      </section>
    </AdminFrame>
  );
}
