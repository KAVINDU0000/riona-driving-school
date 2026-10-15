import type { Metadata } from "next";
import Link from "next/link";
import PackageCard from "@/components/public/PackageCard";
import PageHero from "@/components/public/PageHero";
import PublicFrame from "@/components/public/PublicFrame";
import { Container } from "@/components/landing/primitives";
import { packageGroups } from "@/data/packages";

export const metadata: Metadata = {
  title: "Training Packages and Prices | Riyona Driving School",
  description:
    "Regular training packages, trial preparation packages and daily individual training rates from Riyona Driving School.",
};

/** Each price-list group has a section with a stable id, so the site can link straight to it. */
const SECTION_IDS: Record<string, string> = {
  "Regular training package": "regular",
  "Official driving trial preparation": "trial-preparation",
  "Additional vehicle training": "additional-vehicle",
  "Daily individual training": "daily-rates",
};

const SECTION_NOTES: Record<string, string> = {
  "Regular training package": "A fixed total fee for the full regular training package.",
  "Official driving trial preparation":
    "Preparation for the official driving trial. Preparation does not guarantee a pass, a test date or a licence.",
  "Additional vehicle training": "Fixed total fees for combined car, van, motorcycle and three-wheeler training.",
  "Daily individual training":
    "Charged per session, not as a package total. Each rate shows the length of one session. Per-session rates are arranged with the school.",
};

export default function PackagesPage() {
  return (
    <PublicFrame>
      <PageHero
        eyebrow="Training packages"
        title="Packages and prices"
        description="Fixed-fee packages show the total fee. Daily individual rates show the price for one session. Applying does not reserve a lesson or confirm availability."
        actions={
          <Link
            href="/signup"
            className="inline-flex items-center rounded-xl bg-gold px-5 py-3 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
          >
            Apply now
          </Link>
        }
      />

      <Container>
        <nav aria-label="On this page" className="mt-10 flex flex-wrap gap-2">
          {packageGroups.map((group) => (
            <a
              key={group.label}
              href={`#${SECTION_IDS[group.label]}`}
              className="rounded-full bg-white px-4 py-2 text-[0.8125rem] font-semibold text-muted ring-1 ring-line hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
            >
              {group.label}
            </a>
          ))}
        </nav>

        <div className="mt-12 grid gap-14">
          {packageGroups.map((group) => (
            <section key={group.label} id={SECTION_IDS[group.label]} aria-labelledby={`${SECTION_IDS[group.label]}-heading`} className="scroll-mt-32">
              <h2 id={`${SECTION_IDS[group.label]}-heading`} className="text-[1.5rem] font-bold tracking-[-0.02em] text-ink">
                {group.label}
              </h2>
              <p className="mt-2 max-w-[680px] text-[0.9375rem] leading-[1.7] text-muted">{SECTION_NOTES[group.label]}</p>
              <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {group.options.map((option) => (
                  <li key={option.id}>
                    <PackageCard option={{ ...option, groupLabel: group.label }} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Container>
    </PublicFrame>
  );
}
