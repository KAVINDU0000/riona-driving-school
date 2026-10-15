import Link from "next/link";
import { formatPackagePrice, isPerSession, type CatalogPackage } from "@/lib/packages/format";
import { Surface } from "@/components/landing/primitives";

/**
 * One package or daily rate. Fixed-fee packages show their total with a link to apply. Per-session rates show the
 * rate and its unit, and link to the school, because the online application does not accept them.
 */
export default function PackageCard({ option }: { option: CatalogPackage }) {
  const perSession = isPerSession(option);
  return (
    <Surface className="flex h-full flex-col gap-4 p-6">
      <div>
        <h3 className="text-[1.0625rem] font-bold leading-snug text-ink">{option.name}</h3>
        {option.detail && <p className="mt-1 text-[0.875rem] text-muted">{option.detail}</p>}
      </div>

      <p className="text-[1.5rem] font-bold tracking-[-0.02em] text-ink">
        {formatPackagePrice(option)}
        {!perSession && <span className="ml-2 text-[0.8125rem] font-semibold text-muted">total package fee</span>}
      </p>

      <div className="mt-auto flex flex-col gap-3">
        {perSession ? (
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-[0.9375rem] font-semibold text-ink ring-1 ring-line hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
          >
            Contact the school about this rate
          </Link>
        ) : (
          <>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl bg-gold px-5 py-3 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
            >
              Apply for this package
            </Link>
            <Link href="/cash-discount" className="text-center text-[0.8125rem] font-semibold text-gold-ink hover:underline">
              Cash discount terms
            </Link>
          </>
        )}
      </div>
    </Surface>
  );
}
