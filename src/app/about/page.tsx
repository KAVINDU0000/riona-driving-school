import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import TrustStrip from "@/components/landing/TrustStrip";
import PublicFrame from "@/components/public/PublicFrame";
import { Container, Surface } from "@/components/landing/primitives";
import Icon from "@/components/ui/Icon";
import { learningStages, safetyPrinciples, vehicles, whyCards } from "@/data/landing";

export const metadata: Metadata = {
  title: "About Riyona Driving School",
  description: "About Riyona Driving School: how training is structured, safety, the vehicle categories we teach, and how to apply.",
};

/*
 * Only copy that already exists in the project is used here. The school's history, years of operation, instructor
 * names and credentials, mission statements and statistics are not in the project, so they are not shown.
 */

/** The cards that describe the school itself. The instalment-payment card is left out: no instalment scheme is in the price list. */
const WHY_CARD_TITLES = [
  "Government Approved & Certified",
  "Modern Dual-Control Fleet",
  "Dedicated Practical Training Yard",
  "Full Support on DMT Exam Day",
];

const GOLD_BUTTON =
  "inline-flex items-center justify-center rounded-xl bg-gold px-5 py-3 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark";

const GHOST_BUTTON =
  "inline-flex items-center justify-center rounded-xl px-5 py-3 text-[0.9375rem] font-semibold text-white ring-1 ring-white/25 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark";

const SECTION_LABEL = "text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-gold-ink";

export default function AboutPage() {
  const whyChoose = whyCards.filter((card) => WHY_CARD_TITLES.includes(card.title));

  return (
    <PublicFrame>
      <Container>
        <section aria-labelledby="about-heading" className="relative overflow-hidden rounded-3xl bg-ink px-6 py-12 text-white md:px-12 md:py-16">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[0.75rem] font-semibold text-gold ring-1 ring-white/15">
                <Icon name="shield-check" className="h-3.5 w-3.5" />
                Government approved driving training
              </span>
              <h1 id="about-heading" className="mt-5 text-[2rem] font-bold leading-[1.1] tracking-[-0.03em] md:text-[clamp(2.25rem,3.5vw,3.25rem)]">
                About <span className="text-gold">Riyona</span> Driving School
              </h1>
              <p className="mt-5 max-w-[620px] text-[0.9375rem] leading-[1.7] text-white/75 md:text-[1rem]">
                Riyona Driving School trains drivers for car, van, motorbike and three-wheeler licence classes in Sri Lanka.
                Lessons are taught on dual-control vehicles, with safety as the first priority.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/signup" className={GOLD_BUTTON}>
                  Apply now
                </Link>
                <Link href="/packages" className={GHOST_BUTTON}>
                  View packages
                </Link>
              </div>
            </div>

            <div className="justify-self-center rounded-2xl bg-white/[0.06] p-6 ring-1 ring-white/10 backdrop-blur">
              <div className="grid place-items-center gap-4 text-center">
                <div className="relative h-24 w-24">
                  <Image src="/images/logo-riyona-circle.png" alt="Riyona Driving School logo" fill sizes="96px" className="object-contain" />
                </div>
                <div>
                  <p className="text-[1.125rem] font-bold">Riyona Driving School</p>
                  <p className="mt-1 text-[0.8125rem] text-gold">Registered with DMT Sri Lanka</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-10">
          <TrustStrip />
        </div>

        <section aria-labelledby="approach-heading" className="mt-20">
          <div className="flex flex-col gap-3">
            <p className={SECTION_LABEL}>Our approach</p>
            <h2 id="approach-heading" className="text-[1.75rem] font-bold tracking-[-0.02em] text-ink md:text-[2.25rem]">
              How training is structured
            </h2>
          </div>
          <ol className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {learningStages.map((stage, index) => (
              <li key={stage.title}>
                <Surface lift className="flex h-full flex-col gap-4 p-6">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-[0.875rem] font-bold text-gold">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-[1.0625rem] font-bold leading-snug text-ink">{stage.title}</h3>
                  <p className="text-[0.9375rem] leading-[1.7] text-muted">{stage.body}</p>
                </Surface>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="safety-heading" className="mt-20">
          <div className="flex flex-col gap-3">
            <p className={SECTION_LABEL}>Safety</p>
            <h2 id="safety-heading" className="text-[1.75rem] font-bold tracking-[-0.02em] text-ink md:text-[2.25rem]">
              Safety and responsible driving
            </h2>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {safetyPrinciples.map((principle) => (
              <li key={principle.title}>
                <Surface lift className="flex h-full items-start gap-4 p-5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-ink">
                    <Icon name={principle.icon} className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-[1rem] font-bold text-ink">{principle.title}</h3>
                    <p className="mt-1 text-[0.875rem] text-muted">{principle.sub}</p>
                  </div>
                </Surface>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="categories-heading" className="mt-20">
          <div className="flex flex-col gap-3">
            <p className={SECTION_LABEL}>Vehicles</p>
            <h2 id="categories-heading" className="text-[1.75rem] font-bold tracking-[-0.02em] text-ink md:text-[2.25rem]">
              Training categories
            </h2>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {vehicles.map((vehicle) => (
              <li key={vehicle.key}>
                <Link href={`/vehicles#${vehicle.key}`} className="group block h-full">
                  <Surface lift className="flex h-full flex-col overflow-hidden p-0">
                    <div className="relative aspect-[2/1] overflow-hidden bg-page">
                      {vehicle.image && (
                        <Image
                          src={vehicle.image}
                          alt={`${vehicle.label} training`}
                          fill
                          sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                        />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-1.5 p-5">
                      <span className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-gold-ink">{vehicle.tag}</span>
                      <span className="text-[1.0625rem] font-bold text-ink">{vehicle.label}</span>
                      <span className="mt-auto pt-2 text-[0.875rem] font-semibold text-gold-ink group-hover:underline">
                        See this category →
                      </span>
                    </div>
                  </Surface>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="instructors-heading" className="mt-20">
          <div className="flex flex-col gap-3">
            <p className={SECTION_LABEL}>Instructors</p>
            <h2 id="instructors-heading" className="text-[1.75rem] font-bold tracking-[-0.02em] text-ink md:text-[2.25rem]">
              Instructors and staff
            </h2>
          </div>
          <Surface className="mt-10 p-6 md:p-8">
            <p className="max-w-[720px] text-[0.9375rem] leading-[1.7] text-muted">
              Lessons are taught by the school&apos;s instructors, who work with you on dual-control vehicles. Details of
              individual instructors will be published here once the school has confirmed them.
            </p>
          </Surface>
        </section>

        <section aria-labelledby="why-heading" className="mt-20">
          <div className="flex flex-col gap-3">
            <p className={SECTION_LABEL}>Why choose us</p>
            <h2 id="why-heading" className="text-[1.75rem] font-bold tracking-[-0.02em] text-ink md:text-[2.25rem]">
              Four reasons to train with Riyona
            </h2>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {whyChoose.map((card) => (
              <li key={card.title}>
                <Surface lift className="flex h-full flex-col gap-4 p-6">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-gold">
                    <Icon name={card.icon} className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <h3 className="text-[1.0625rem] font-bold leading-snug text-ink">{card.title}</h3>
                    <p className="mt-2 text-[0.9375rem] leading-[1.7] text-muted">{card.body}</p>
                  </div>
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-[0.75rem] font-semibold text-success">
                    <Icon name="check-circle" className="h-3.5 w-3.5" />
                    {card.tag}
                  </span>
                </Surface>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="next-heading" className="mt-20">
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
                className="inline-flex items-center rounded-xl bg-white px-5 py-3 text-[0.9375rem] font-semibold text-ink ring-1 ring-line hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
              >
                View packages
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center rounded-xl bg-white px-5 py-3 text-[0.9375rem] font-semibold text-ink ring-1 ring-line hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
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
