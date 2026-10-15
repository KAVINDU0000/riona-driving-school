import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/public/PageHero";
import PublicFrame from "@/components/public/PublicFrame";
import { Container, Surface } from "@/components/landing/primitives";
import { cashDiscountNote } from "@/data/public";

export const metadata: Metadata = {
  title: "Cash Discount | Riyona Driving School",
  description: "The cash discount policy for Riyona Driving School training packages, and how to ask about it.",
};

/**
 * The discount is shown as the school wrote it. No discounted price is calculated here, because the school has not
 * supplied the eligible packages, the validity period or the restrictions. Those are flagged in the report.
 */
export default function CashDiscountPage() {
  return (
    <PublicFrame>
      <PageHero
        eyebrow="Cash discount"
        title="Cash discount information"
        description="How the cash discount is described. Ask the school for the full terms before you pay."
        actions={
          <Link
            href="/contact"
            className="inline-flex items-center rounded-xl bg-gold px-5 py-3 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
          >
            Ask the school
          </Link>
        }
      />

      <Container>
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <Surface className="p-6 md:p-8">
            <h2 className="text-[1.25rem] font-bold text-ink">The discount</h2>
            <p className="mt-4 text-[1.0625rem] leading-[1.7] text-ink">{cashDiscountNote}</p>
          </Surface>

          <Surface className="p-6 md:p-8">
            <h2 className="text-[1.25rem] font-bold text-ink">Where it applies</h2>
            <ul className="mt-4 grid list-disc gap-3 pl-5 text-[0.9375rem] leading-[1.7] text-muted">
              <li>It is described for package fees paid in full, in cash, at once.</li>
              <li>Daily individual training is priced per session, not as a package fee.</li>
              <li>Package prices on the packages page are the fees before any discount. No discount is applied on the site.</li>
            </ul>
          </Surface>

          <Surface className="p-6 md:p-8 lg:col-span-2">
            <h2 className="text-[1.25rem] font-bold text-ink">Before you pay</h2>
            <p className="mt-4 max-w-[720px] text-[0.9375rem] leading-[1.7] text-muted">
              The full terms, including which packages are eligible, how long the offer is valid, and any restrictions,
              are confirmed by the school. Ask the school to confirm the final amount in writing before you make a cash
              payment.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/packages"
                className="inline-flex items-center rounded-xl px-5 py-3 text-[0.9375rem] font-semibold text-ink ring-1 ring-line hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
              >
                View packages and prices
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center rounded-xl px-5 py-3 text-[0.9375rem] font-semibold text-ink ring-1 ring-line hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
              >
                Contact the school
              </Link>
            </div>
          </Surface>
        </div>
      </Container>
    </PublicFrame>
  );
}
