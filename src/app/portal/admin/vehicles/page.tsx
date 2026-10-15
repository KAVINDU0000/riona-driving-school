import type { Metadata } from "next";
import Link from "next/link";
import AdminFrame from "@/components/admin/AdminFrame";
import { listVehicles, vehicleListQuery } from "@/lib/admin/vehicles";
import { VEHICLE_STATUS_LABELS, VEHICLE_STATUS_STYLES, VEHICLE_TYPE_LABELS } from "@/lib/admin/vehicle-labels";
import { requirePortalUser } from "@/lib/auth/portal-guard";

export const metadata: Metadata = {
  title: "Vehicles | Admin Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

/** Fleet list with search and filters. Each row links to the vehicle's own page. The API checks the admin role again. */
export default async function AdminVehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; status?: string; page?: string }>;
}) {
  await requirePortalUser("ADMIN");
  const query = vehicleListQuery(await searchParams);
  const result = await listVehicles(query);

  const filterParams = new URLSearchParams();
  if (query.q) filterParams.set("q", query.q);
  if (query.type) filterParams.set("type", query.type);
  if (query.status) filterParams.set("status", query.status);

  return (
    <AdminFrame
      title="Vehicles"
      description="The school's fleet. A vehicle must be active to take lessons. Retiring a vehicle keeps its lesson and audit history."
      active="/portal/admin/vehicles"
    >
      <section aria-labelledby="fleet-heading" className="glass rounded-[22px] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="fleet-heading" className="text-[1.125rem] font-bold text-ink">
            Fleet ({result.total})
          </h2>
          <Link
            href="/portal/admin/vehicles/new"
            className="rounded-xl bg-gold px-5 py-2.5 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] hover:bg-gold-dark"
          >
            Add vehicle
          </Link>
        </div>

        <form method="get" action="/portal/admin/vehicles" className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
          <label className="grid gap-2 text-[0.8125rem] font-semibold text-ink">
            Search
            <input
              name="q"
              defaultValue={query.q}
              placeholder="Registration, make or model"
              className="rounded-xl border border-line bg-white px-3 py-2.5 text-[0.9375rem] font-normal text-ink"
            />
          </label>
          <label className="grid gap-2 text-[0.8125rem] font-semibold text-ink">
            Type
            <select name="type" defaultValue={query.type ?? ""} className="rounded-xl border border-line bg-white px-3 py-2.5 text-[0.9375rem] font-normal text-ink">
              <option value="">All types</option>
              {Object.entries(VEHICLE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-[0.8125rem] font-semibold text-ink">
            Status
            <select name="status" defaultValue={query.status ?? ""} className="rounded-xl border border-line bg-white px-3 py-2.5 text-[0.9375rem] font-normal text-ink">
              <option value="">All statuses</option>
              {Object.entries(VEHICLE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-xl px-5 py-2.5 text-[0.9375rem] font-semibold text-ink ring-1 ring-line hover:bg-page">
            Apply
          </button>
        </form>

        {result.vehicles.length === 0 ? (
          <p className="mt-6 text-[0.9375rem] text-muted">No vehicles match these filters.</p>
        ) : (
          <ul className="mt-5 grid gap-2">
            {result.vehicles.map((vehicle) => (
              <li key={vehicle.id}>
                <Link
                  href={`/portal/admin/vehicles/${vehicle.id}`}
                  className="grid gap-2 rounded-2xl bg-white p-4 ring-1 ring-line transition-colors hover:bg-page md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-center"
                >
                  <span className="font-semibold text-ink">{vehicle.registrationNumber}</span>
                  <span className="text-[0.875rem] text-muted">
                    {VEHICLE_TYPE_LABELS[vehicle.vehicleType]}
                    {vehicle.make || vehicle.model ? ` · ${[vehicle.make, vehicle.model].filter(Boolean).join(" ")}` : ""}
                  </span>
                  <span className="text-[0.8125rem] text-muted">{vehicle.scheduledLessons} scheduled lesson(s)</span>
                  <span className={`justify-self-start rounded-full px-3 py-1 text-[0.75rem] font-semibold ${VEHICLE_STATUS_STYLES[vehicle.status]}`}>
                    {VEHICLE_STATUS_LABELS[vehicle.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {result.pageCount > 1 && (
          <nav aria-label="Vehicle pages" className="mt-5 flex items-center justify-between text-[0.875rem]">
            {result.page > 1 ? (
              <Link
                href={`/portal/admin/vehicles?${new URLSearchParams({ ...Object.fromEntries(filterParams), page: String(result.page - 1) })}`}
                className="font-semibold text-gold-ink"
              >
                ← Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="text-muted">
              Page {result.page} of {result.pageCount}
            </span>
            {result.page < result.pageCount ? (
              <Link
                href={`/portal/admin/vehicles?${new URLSearchParams({ ...Object.fromEntries(filterParams), page: String(result.page + 1) })}`}
                className="font-semibold text-gold-ink"
              >
                Next →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </section>
    </AdminFrame>
  );
}
