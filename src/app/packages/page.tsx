import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import PackageInclusions from "@/components/public/PackageInclusions";
import PageHero from "@/components/public/PageHero";
import PublicFrame from "@/components/public/PublicFrame";
import TrustStrip from "@/components/landing/TrustStrip";
import { Container, IconTile, Surface } from "@/components/landing/primitives";
import Icon from "@/components/ui/Icon";
import { site } from "@/data/landing";
import { packageDiscountNote } from "@/data/public";
import { getPublicPackageCatalog } from "@/lib/packages/catalog";
import { formatLkr } from "@/lib/packages/format";
import { PACKAGE_GROUPS } from "@/lib/packages/group-routes";

export const metadata: Metadata = {
  title: "Training Packages and Prices | Riyona Driving School",
  description:
    "Regular training packages, trial preparation packages and daily individual training rates from Riyona Driving School.",
};

const GOLD_BUTTON =
  "inline-flex items-center rounded-xl bg-gold px-5 py-3 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark";

const WHITE_BUTTON =
  "inline-flex items-center rounded-xl bg-white px-5 py-3 text-[0.9375rem] font-semibold text-ink ring-1 ring-line hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark";

/** The main packages. Each card opens the sub-packages of that group on its own page. */
export default async function PackagesPage() {
  // Rendered per request, so the prices shown are always the ones in the database right now.
  await connection();
  const groups = await getPublicPackageCatalog();
  const byLabel = new Map(groups.map((group) => [group.label, group]));
  const shown = PACKAGE_GROUPS.filter((main) => byLabel.has(main.label));

  return (
    <PublicFrame>
      <PageHero
        eyebrow="Training packages"
        title="Packages and prices"
        description="Choose a main package to see the options in it. Applying does not reserve a lesson or confirm availability."
        actions={
          <>
            <Link href="/signup" className={GOLD_BUTTON}>
              Apply now
            </Link>
            <a href={site.whatsapp} target="_blank" rel="noopener noreferrer" className={WHITE_BUTTON}>
              WhatsApp a question
            </a>
          </>
        }
      />

      <Container>
        <div className="mt-10">
          <TrustStrip />
        </div>

        {shown.length === 0 && (
          <p className="mt-12 text-[0.9375rem] text-muted">
            No packages are offered online right now. Contact the school for the current packages and fees.
          </p>
        )}

        <ul className="mt-12 grid gap-6 md:grid-cols-2">
          {shown.map((main) => {
            const group = byLabel.get(main.label)!;
            const from = Math.min(...group.options.map((option) => option.price));
            const perSession = group.options.every((option) => option.pricing === "per-session");
            const count = group.options.length;
            return (
              <li key={main.slug}>
                <Link href={`/packages/${main.slug}`} className="group block h-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark">
                  <Surface lift className="flex h-full flex-col gap-5 p-6 md:p-8">
                    <div className="flex items-start justify-between gap-4">
                      <IconTile>
                        <Icon name="book" className="h-5 w-5" />
                      </IconTile>
                      <span className="rounded-full bg-page px-3 py-1 text-[0.8125rem] font-semibold text-muted ring-1 ring-line">
                        {count} {count === 1 ? "option" : "options"}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-[1.375rem] font-bold leading-snug text-ink">{main.label}</h2>
                      <p className="mt-2 text-[0.9375rem] leading-[1.7] text-muted">{main.note}</p>
                    </div>
                    <p className="mt-auto flex flex-wrap items-baseline gap-x-2 text-ink">
                      <span className="text-[0.8125rem] font-semibold text-muted">From</span>
                      <span className="text-[1.5rem] font-bold tracking-[-0.02em]">{formatLkr(from)}</span>
                      <span className="text-[0.8125rem] font-semibold text-muted">
                        {perSession ? "per session" : "total package fee"}
                      </span>
                    </p>
                    <span className="text-[0.9375rem] font-semibold text-gold-ink group-hover:underline">View packages →</span>
                  </Surface>
                </Link>
              </li>
            );
          })}
        </ul>

        <PackageInclusions />

        <section aria-labelledby="discount-heading" className="mt-16">
          <Surface className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div>
              <h2 id="discount-heading" className="text-[1.25rem] font-bold text-ink">
                Pay in cash and save
              </h2>
              <p className="mt-2 max-w-[640px] text-[0.9375rem] leading-[1.7] text-muted">{packageDiscountNote}</p>
            </div>
            <Link href="/cash-discount" className={`${WHITE_BUTTON} shrink-0`}>
              Cash discount terms
            </Link>
          </Surface>
        </section>
      </Container>
    </PublicFrame>
  );
}
