import Image from "next/image";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { formatLkr, isPerSession, type CatalogPackage } from "@/lib/packages/format";
import { Surface } from "@/components/landing/primitives";

type VehicleInfo = { key: string; label: string; tag: string; points: string[]; image: string };

const PRIMARY =
  "inline-flex w-full items-center justify-center rounded-xl bg-gold px-5 py-3 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark";

const SECONDARY =
  "inline-flex w-full items-center justify-center rounded-xl bg-white px-5 py-3 text-[0.9375rem] font-semibold text-ink ring-1 ring-line hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark";

/**
 * One package or daily rate. The picture, tag and feature points come from the vehicle category the package belongs
 * to (src/data/landing.ts). Fixed-fee packages show their total with a link to apply. Per-session rates show the rate
 * and its unit, and link to the school, because the online application does not accept them.
 */
export default function PackageCard({ option, vehicle }: { option: CatalogPackage; vehicle: VehicleInfo | null }) {
  const perSession = isPerSession(option);
  return (
    <Surface lift className="flex h-full flex-col overflow-hidden p-0">
      <div className="relative aspect-[16/10] bg-page">
        {vehicle && (
          <>
            <Image src={vehicle.image} alt={`${vehicle.label} training`} fill sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw" className="object-cover" />
            <span className="absolute bottom-3 left-3 rounded-full bg-ink/80 px-3 py-1 text-[0.75rem] font-semibold text-white">{vehicle.tag}</span>
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-5 p-6">
        <div>
          {vehicle && <p className="text-[0.75rem] font-bold uppercase tracking-[0.12em] text-gold-ink">{vehicle.label}</p>}
          <h3 className="mt-1 text-[1.125rem] font-bold leading-snug text-ink">{option.name}</h3>
          {option.detail && <p className="mt-1 text-[0.875rem] text-muted">{option.detail}</p>}
        </div>

        {vehicle && (
          <ul className="grid gap-2">
            {vehicle.points.map((point) => (
              <li key={point} className="flex items-start gap-2 text-[0.875rem] text-ink">
                <Icon name="check-circle" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                {point}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-auto flex flex-wrap items-baseline gap-x-2 border-t border-line pt-5 text-ink">
          <span className="text-[0.8125rem] font-bold uppercase tracking-[0.08em] text-muted">LKR</span>
          <span className="text-[2rem] font-bold leading-none tracking-[-0.03em]">{formatLkr(option.price).replace(/^LKR /, "")}</span>
          <span className="text-[0.8125rem] font-semibold text-muted">{perSession ? "per session" : "total package fee"}</span>
        </p>

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
              </Link>
              <Link href="/cash-discount" className="text-center text-[0.8125rem] font-semibold text-gold-ink hover:underline">
                Cash discount terms
              </Link>
            </>
          )}
          {vehicle && (
            <Link href={`/vehicles#${vehicle.key}`} className="text-center text-[0.8125rem] font-semibold text-gold-ink hover:underline">
              View {vehicle.label.toLowerCase()} training
            </Link>
          )}
        </div>
      </div>
    </Surface>
  );
}
