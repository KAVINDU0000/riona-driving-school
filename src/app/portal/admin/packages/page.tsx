import type { Metadata } from "next";
import AdminFrame from "@/components/admin/AdminFrame";
import PackageManager from "@/components/admin/PackageManager";
import { listPackagesForAdmin, listPriceChanges } from "@/lib/admin/packages";
import { listRecentRequirementChanges, requirementStatus } from "@/lib/admin/requirements";
import { requirePortalUser } from "@/lib/auth/portal-guard";

export const metadata: Metadata = {
  title: "Packages and prices | Admin Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

/**
 * Package prices, display order, availability, session requirements and their confirmation, with the change histories.
 * The API checks every change again.
 */
export default async function AdminPackagesPage() {
  await requirePortalUser("ADMIN");
  const [packages, changes, requirementChanges] = await Promise.all([
    listPackagesForAdmin(),
    listPriceChanges(),
    listRecentRequirementChanges(),
  ]);

  const rows = packages.map((item) => ({
    ...item,
    requirementStatus: requirementStatus({
      packageType: item.packageType,
      rows: item.requirements,
      confirmedAt: item.requirementsConfirmedAt,
    }),
  }));

  return (
    <AdminFrame
      title="Packages and prices"
      description="Prices here are used for new applications. Session requirements here apply only to applications without their own chosen counts, and online approval uses them only after the school confirms them. Applications and enrollments keep what they were given."
      active="/portal/admin/packages"
    >
      <PackageManager packages={rows} changes={changes} requirementChanges={requirementChanges} />
    </AdminFrame>
  );
}
