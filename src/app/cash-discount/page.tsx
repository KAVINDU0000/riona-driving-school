import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/public/PageHero";
import PublicFrame from "@/components/public/PublicFrame";
import { Container, IconTile, Surface } from "@/components/landing/primitives";
import Icon from "@/components/ui/Icon";
import { cashDiscountNote } from "@/data/public";

export const metadata: Metadata = {
  title: "Cash Discount | Riyona Driving School",
  description: "The cash discount policy for Riyona Driving School training packages, and how to ask about it.",
};

const SECTION_LABEL = "text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-gold-ink";

const WHITE_BUTTON =
  "inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-[0.9375rem] font-semibold text-ink ring-1 ring-line hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark";

const GOLD_BUTTON =
  "inline-flex items-center justify-center rounded-xl bg-gold px-5 py-3 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark";

/**
 * The discount is shown as the school wrote it. No discounted price is calculated here, because the school has not
 * supplied the eligible packages, the validity period or the restrictions. Those are flagged in the report.
 */
export default function CashDiscountPage() {
  return (
    <PublicFrame>
      <PageHero
        eyebrow="Cash discount"
        title="Pay in cash, save on your package"
        description="How the cash discount works. Ask the school for the full terms before you pay."
      />

      <Container>
        <section aria-labelledby="discount-heading" className="mt-12 overflow-hidden rounded-3xl bg-ink px-6 py-10 text-white md:px-12 md:py-14">
          <div className="grid gap-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
            <div className="flex items-baseline gap-2">
              <span className="text-[5rem] font-bold leading-none tracking-[-0.04em] text-gold md:text-[7rem]">5%</span>
              <span className="text-[1.125rem] font-semibold text-white/70">off</span>
            </div>
            <div>
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-gold">The discount</p>
              <h2 id="discount-heading" className="mt-3 text-[1.5rem] font-bold leading-snug md:text-[1.75rem]">
                {cashDiscountNote}
              </h2>
            </div>
          </div>
        </section>

        <section aria-labelledby="where-heading" className="mt-16">
          <div className="flex flex-col gap-3">
            <p className={SECTION_LABEL}>Where it applies</p>
            <h2 id="where-heading" className="text-[1.75rem] font-bold tracking-[-0.02em] text-ink md:text-[2.25rem]">
              What the discount covers
            </h2>
          </div>
          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            <li>
              <Surface lift className="flex h-full flex-col gap-4 p-6">
                <IconTile>
                  <Icon name="wallet" className="h-5 w-5" />
                </IconTile>
                <h3 className="text-[1.0625rem] font-bold text-ink">Package fees, paid in full</h3>
                <p className="text-[0.9375rem] leading-[1.7] text-muted">The discount is described for package fees paid in full, in cash, at once.</p>
              </Surface>
            </li>
            <li>
              <Surface lift className="flex h-full flex-col gap-4 p-6">
                <IconTile>
                  <Icon name="clock" className="h-5 w-5" />
                </IconTile>
                <h3 className="text-[1.0625rem] font-bold text-ink">Daily training excluded</h3>
                <p className="text-[0.9375rem] leading-[1.7] text-muted">Daily individual training is priced per session, not as a package fee.</p>
              </Surface>
            </li>
            <li>
              <Surface lift className="flex h-full flex-col gap-4 p-6">
                <IconTile>
                  <Icon name="file-check" className="h-5 w-5" />
                </IconTile>
                <h3 className="text-[1.0625rem] font-bold text-ink">No discount on the site</h3>
                <p className="text-[0.9375rem] leading-[1.7] text-muted">
                  Package prices on the packages page are the fees before any discount. No discount is applied on the site.
                </p>
              </Surface>
            </li>
          </ul>
        </section>

        <section aria-labelledby="before-heading" className="mt-16">
          <Surface className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div className="max-w-[640px]">
              <h2 id="before-heading" className="text-[1.25rem] font-bold text-ink">
                Before you pay
              </h2>
              <p className="mt-2 text-[0.9375rem] leading-[1.7] text-muted">
                The full terms, including which packages are eligible, how long the offer is valid, and any restrictions,
                are confirmed by the school. Ask the school to confirm the final amount in writing before you make a cash
                payment.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link href="/packages" className={WHITE_BUTTON}>
                View packages and prices
              </Link>
              <Link href="/contact" className={GOLD_BUTTON}>
                Contact the school
              </Link>
            </div>
          </Surface>
        </section>
      </Container>
    </PublicFrame>
  );
}
