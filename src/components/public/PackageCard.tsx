import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { formatLkr, isPerSession, type CatalogPackage } from "@/lib/packages/format";
import { IconTile, Surface } from "@/components/landing/primitives";
import PackageArt from "@/components/public/PackageArt";

type VehicleInfo = { key: string; label: string; tag: string; points: string[]; image: string };

const PRIMARY =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-[0.875rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] transition-colors hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark";

const SECONDARY =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[0.875rem] font-semibold text-ink ring-1 ring-line transition-colors hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark";

/**
 * One package or daily rate. The vehicle category (label, tag and feature points) comes from src/data/landing.ts.
 * Fixed-fee packages show their total with a link to apply. Per-session rates show the rate and its unit, and link to
 * the school, because the online application does not accept them.
 */
export default function PackageCard({
  option,
  vehicle,
  group,
}: {
  option: CatalogPackage;
  vehicle: VehicleInfo | null;
  group: string;
}) {
  const perSession = isPerSession(option);

  return (
    <Surface lift className="flex h-full flex-col gap-4 p-3">
      <PackageArt slug={group} label={option.name} />

      <div className="flex flex-1 flex-col gap-4 px-2 pb-2">
        <div className="flex items-start justify-between gap-3">
          <IconTile>
            <Icon name={vehicle ? "car" : "badge-check"} className="h-5 w-5" />
          </IconTile>
          {vehicle && (
            <span className="rounded-full bg-page px-3 py-1 text-[0.75rem] font-semibold text-muted ring-1 ring-line">
              {vehicle.tag}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {vehicle && (
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-gold-ink">{vehicle.label}</p>
          )}
          <h3 className="text-[1.0625rem] font-bold leading-[1.3] tracking-[-0.01em] text-ink">{option.name}</h3>
          {option.detail && <p className="text-[0.875rem] leading-[1.6] text-muted">{option.detail}</p>}
        </div>

        {vehicle && (
          <ul className="grid gap-2.5">
            {vehicle.points.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-[0.875rem] text-ink">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success-soft text-success">
                  <Icon name="check" className="h-3 w-3" strokeWidth={2.6} />
                </span>
                {point}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex items-end justify-between gap-4 rounded-2xl bg-page p-4 ring-1 ring-line">
          <div>
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
              {perSession ? "Rate" : "Package fee"}
            </p>
            <p className="mt-1 flex items-baseline gap-1.5 text-ink">
              <span className="text-[0.8125rem] font-bold text-muted">LKR</span>
              <span className="text-[1.5rem] font-bold leading-none tracking-[-0.03em]">
                {formatLkr(option.price).replace(/^LKR /, "")}
              </span>
            </p>
          </div>
          <span className="text-right text-[0.8125rem] font-semibold text-muted">
            {perSession ? "per session" : "total"}
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {perSession ? (
            <Link href="/contact" className={SECONDARY}>
              Contact the school about this rate
            </Link>
          ) : (
            <>
              <Link
                href={`/signup?package=${encodeURIComponent(option.id)}${vehicle ? `&vehicle=${encodeURIComponent(vehicle.key)}` : ""}`}
                className={PRIMARY}
              >
                Register &amp; apply online
                <Icon name="arrow-right" className="h-4 w-4" strokeWidth={2} />
              </Link>
              <Link href="/cash-discount" className="text-center text-[0.875rem] font-semibold text-gold-ink hover:text-ink">
                Cash discount terms
              </Link>
            </>
          )}
          {vehicle && (
            <Link
              href={`/vehicles#${vehicle.key}`}
              className="inline-flex items-center justify-center gap-1.5 text-center text-[0.875rem] font-semibold text-gold-ink hover:text-ink"
            >
              View {vehicle.label.toLowerCase()} training
              <Icon name="arrow-up-right" className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
          )}
        </div>
      </div>
    </Surface>
  );
}
