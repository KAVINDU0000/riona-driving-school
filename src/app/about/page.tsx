import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/public/PageHero";
import PublicFrame from "@/components/public/PublicFrame";
import { Container, IconTile, Surface } from "@/components/landing/primitives";
import Icon from "@/components/ui/Icon";
import { learningStages, safetyPrinciples, vehicles, whyCards } from "@/data/landing";

export const metadata: Metadata = {
  title: "About Riyona Driving School",
  description: "About Riyona Driving School: how training is structured, safety, the vehicle categories we teach, and how to apply.",
};

/*
 * Only copy that already exists in the project is used here. The school's history, years of operation, instructor
 * names and credentials, and statistics are not in the project, so they are not shown. See the public-site report.
 */

/** The cards that describe the school itself. The instalment-payment card is left out: no instalment scheme is in the price list. */
const WHY_CARD_TITLES = [
  "Government Approved & Certified",
  "Modern Dual-Control Fleet",
  "Dedicated Practical Training Yard",
  "Full Support on DMT Exam Day",
];

export default function AboutPage() {
  const whyChoose = whyCards.filter((card) => WHY_CARD_TITLES.includes(card.title));

  return (
    <PublicFrame>
      <PageHero
        eyebrow="About the school"
        title="About Riyona Driving School"
        description="Riyona Driving School trains drivers for car, van, motorbike and three-wheeler licence classes in Sri Lanka. Lessons are taught on dual-control vehicles, with safety as the first priority."
        actions={
          <>
            <Link
              href="/packages"
              className="inline-flex items-center rounded-xl bg-white px-5 py-3 text-[0.9375rem] font-semibold text-ink ring-1 ring-line hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
            >
              View packages
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center rounded-xl bg-gold px-5 py-3 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
            >
              Apply now
            </Link>
          </>
        }
      />

      <Container>
        <section aria-labelledby="approach-heading" className="mt-16">
          <h2 id="approach-heading" className="text-[1.5rem] font-bold tracking-[-0.02em] text-ink">
            How training is structured
          </h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {learningStages.map((stage, index) => (
              <li key={stage.title}>
                <Surface className="flex h-full flex-col gap-3 p-6">
                  <span className="text-[0.8125rem] font-bold text-gold-ink">Stage {index + 1}</span>
                  <h3 className="text-[1.0625rem] font-bold leading-snug text-ink">{stage.title}</h3>
                  <p className="text-[0.9375rem] leading-[1.7] text-muted">{stage.body}</p>
                </Surface>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="safety-heading" className="mt-16">
          <h2 id="safety-heading" className="text-[1.5rem] font-bold tracking-[-0.02em] text-ink">
            Safety and responsible driving
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {safetyPrinciples.map((principle) => (
              <li key={principle.title}>
                <Surface className="flex h-full items-start gap-4 p-5">
                  <IconTile>
                    <Icon name={principle.icon} className="h-5 w-5" />
                  </IconTile>
                  <div>
                    <h3 className="text-[1rem] font-bold text-ink">{principle.title}</h3>
                    <p className="mt-1 text-[0.875rem] text-muted">{principle.sub}</p>
                  </div>
                </Surface>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="categories-heading" className="mt-16">
          <h2 id="categories-heading" className="text-[1.5rem] font-bold tracking-[-0.02em] text-ink">
            Training categories
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {vehicles.map((vehicle) => (
              <li key={vehicle.key}>
                <Link
                  href={`/vehicles#${vehicle.key}`}
                  className="glass flex h-full flex-col gap-2 rounded-2xl p-5 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
                >
                  <span className="text-[0.75rem] font-bold uppercase tracking-[0.12em] text-gold-ink">{vehicle.tag}</span>
                  <span className="text-[1.0625rem] font-bold text-ink">{vehicle.label}</span>
                  <span className="mt-auto text-[0.875rem] font-semibold text-gold-ink">See this category →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="instructors-heading" className="mt-16">
          <h2 id="instructors-heading" className="text-[1.5rem] font-bold tracking-[-0.02em] text-ink">
            Instructors and staff
          </h2>
          <Surface className="mt-6 p-6 md:p-8">
            <p className="max-w-[720px] text-[0.9375rem] leading-[1.7] text-muted">
              Lessons are taught by the school&apos;s instructors, who work with you on dual-control vehicles. Details
              of individual instructors will be published here once the school has confirmed them.
            </p>
          </Surface>
        </section>

        <section aria-labelledby="why-heading" className="mt-16">
          <h2 id="why-heading" className="text-[1.5rem] font-bold tracking-[-0.02em] text-ink">
            Why students choose us
          </h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {whyChoose.map((card) => (
              <li key={card.title}>
                <Surface className="flex h-full items-start gap-4 p-6">
                  <IconTile>
                    <Icon name={card.icon} className="h-5 w-5" />
                  </IconTile>
                  <div>
                    <h3 className="text-[1.0625rem] font-bold text-ink">{card.title}</h3>
                    <p className="mt-2 text-[0.9375rem] leading-[1.7] text-muted">{card.body}</p>
                  </div>
                </Surface>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="next-heading" className="mt-16">
          <Surface className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div>
              <h2 id="next-heading" className="text-[1.25rem] font-bold text-ink">
                Ready to start?
              </h2>
              <p className="mt-2 text-[0.9375rem] text-muted">See the packages, ask the school a question, or apply.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/packages"
                className="inline-flex items-center rounded-xl px-5 py-3 text-[0.9375rem] font-semibold text-ink ring-1 ring-line hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
              >
                View packages
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center rounded-xl px-5 py-3 text-[0.9375rem] font-semibold text-ink ring-1 ring-line hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
              >
                Contact the school
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center rounded-xl bg-gold px-5 py-3 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
              >
                Apply now
              </Link>
            </div>
          </Surface>
        </section>
      </Container>
    </PublicFrame>
  );
}
