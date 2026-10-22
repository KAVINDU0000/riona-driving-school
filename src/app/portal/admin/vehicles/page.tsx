import type { Metadata } from "next";
import Link from "next/link";
import AdminFrame from "@/components/admin/AdminFrame";
import AutoSubmitSelect from "@/components/admin/AutoSubmitSelect";
import { NEEDS_ATTENTION, listVehicles, vehicleListQuery } from "@/lib/admin/vehicles";
import { VEHICLE_STATUS_LABELS, VEHICLE_STATUS_STYLES, VEHICLE_TYPE_LABELS } from "@/lib/admin/vehicle-labels";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import Icon from "@/components/ui/Icon";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, FIELD, LABEL, ROW_LINK } from "@/components/admin/admin-ui";

export const metadata: Metadata = {
  title: "Vehicles | Admin Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

/** The icon that matches each vehicle type, so the list shows what kind of vehicle each row is. */
const VEHICLE_TYPE_ICONS: Record<string, string> = {
  CAR: "car",
  VAN: "van",
  MOTORCYCLE: "motorcycle",
  THREE_WHEELER: "three-wheeler",
};

function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 7.5 5 5 5-5" />
    </svg>
  );
}

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
          <Link href="/portal/admin/vehicles/new" className={BUTTON_PRIMARY}>
            Add vehicle
          </Link>
        </div>

        <form
          method="get"
          action="/portal/admin/vehicles"
          role="search"
          className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,11rem)_minmax(0,11rem)_auto] md:items-end"
        >
          <div className="grid gap-1.5">
            <label htmlFor="vehicle-q" className={LABEL}>
              Search
            </label>
            <div className="relative">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                id="vehicle-q"
                name="q"
                type="search"
                defaultValue={query.q}
                maxLength={100}
                placeholder="Registration, make or model"
                className={`${FIELD} h-11 pl-10`}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="vehicle-type" className={LABEL}>
              Type
            </label>
            <div className="relative">
              <AutoSubmitSelect
                id="vehicle-type"
                name="type"
                defaultValue={query.type ?? ""}
                options={[{ value: "", label: "All types" }, ...Object.entries(VEHICLE_TYPE_LABELS).map(([value, label]) => ({ value, label }))]}
              />
              <ChevronIcon />
            </div>
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="vehicle-status" className={LABEL}>
              Status
            </label>
            <div className="relative">
              <AutoSubmitSelect
                id="vehicle-status"
                name="status"
                defaultValue={query.status ?? ""}
                options={[
                  { value: "", label: "All statuses" },
                  { value: NEEDS_ATTENTION, label: "Needs attention (maintenance or inactive)" },
                  ...Object.entries(VEHICLE_STATUS_LABELS).map(([value, label]) => ({ value, label })),
                ]}
              />
              <ChevronIcon />
            </div>
          </div>
          <button type="submit" className={`${BUTTON_SECONDARY} h-11 px-6`}>
            Apply
          </button>
        </form>

        {result.vehicles.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-line bg-white/60 px-5 py-10 text-center">
            <p className="text-[0.9375rem] font-semibold text-ink">No vehicles match these filters.</p>
          </div>
        ) : (
          <ul className="mt-5 grid gap-2.5">
            {result.vehicles.map((vehicle) => (
              <li key={vehicle.id} className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2.5">
                <Link href={`/portal/admin/vehicles/${vehicle.id}`} className={`${ROW_LINK} min-w-0 flex-1 items-center`}>
                  <span
                    aria-hidden="true"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-page text-ink-soft ring-1 ring-line"
                  >
                    <Icon name={VEHICLE_TYPE_ICONS[vehicle.vehicleType] ?? "car"} className="h-[18px] w-[18px]" />
                  </span>
                  <span className="grid min-w-0 flex-1 gap-1 md:grid-cols-[1.2fr_1fr_auto] md:items-center md:gap-4">
                    <span className="min-w-0">
                      <span className="block truncate font-mono font-semibold text-ink">{vehicle.registrationNumber}</span>
                      <span className="block truncate text-[0.8125rem] text-muted">
                        {VEHICLE_TYPE_LABELS[vehicle.vehicleType]}
                        {vehicle.make || vehicle.model ? ` · ${[vehicle.make, vehicle.model].filter(Boolean).join(" ")}` : ""}
                      </span>
                    </span>
                    <span className="text-[0.8125rem] text-muted">{vehicle.scheduledLessons} scheduled lesson(s)</span>
                    <span className={`justify-self-start rounded-full px-3 py-1 text-[0.75rem] font-semibold md:justify-self-end ${VEHICLE_STATUS_STYLES[vehicle.status]}`}>
                      {VEHICLE_STATUS_LABELS[vehicle.status]}
                    </span>
                  </span>
                </Link>
                <Link
                  href={`/portal/admin/vehicles/${vehicle.id}/maintenance`}
                  aria-label={`Maintenance for ${vehicle.registrationNumber}`}
                  className={`${BUTTON_SECONDARY} h-auto w-full shrink-0 whitespace-nowrap px-4 py-2.5 sm:w-auto sm:self-center`}
                >
                  Maintenance
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
