import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/public/PageHero";
import PublicFrame from "@/components/public/PublicFrame";
import { Container, IconTile, Surface } from "@/components/landing/primitives";
import { CategoryIcon, SignShape } from "@/components/public/RoadSignParts";
import Icon from "@/components/ui/Icon";
import { ROAD_RULES, SIGN_CATEGORIES, SIGN_SHAPES, SPEED_LIMITS } from "@/data/road-rules";

export const metadata: Metadata = {
  title: "Driving Signs & Road Rules in Sri Lanka | Riyona Driving School",
  description: "Road sign categories, speed limits and key road rules in Sri Lanka, explained for learner drivers.",
};

const SECTION_LABEL = "text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-gold-ink";

const GOLD_BUTTON =
  "inline-flex items-center justify-center rounded-xl bg-gold px-5 py-3 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark";

const WHITE_BUTTON =
  "inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-[0.9375rem] font-semibold text-ink ring-1 ring-line hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark";

export default function RoadSignsPage() {
  return (
    <PublicFrame>
      <PageHero
        eyebrow="Driving Signs & Road Rules"
        title="Road signs and road rules in Sri Lanka"
        description="Choose a category to see every sign, marking or signal in it. The rules that apply when you drive are below."
        actions={
          <>
            <Link href="/signup" className={GOLD_BUTTON}>
              Apply now
            </Link>
            <Link href="/contact" className={WHITE_BUTTON}>
              Ask the school
            </Link>
          </>
        }
      />

      <Container>
        <section aria-labelledby="categories-heading" className="mt-12">
          <div className="flex flex-col gap-3">
            <p className={SECTION_LABEL}>Categories</p>
            <h2 id="categories-heading" className="text-[1.75rem] font-bold tracking-[-0.02em] text-ink md:text-[2.25rem]">
              Road sign categories
            </h2>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {SIGN_CATEGORIES.map((category) => (
              <li key={category.id}>
                <Link href={`/road-signs/${category.id}`} className="group block h-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark">
                  <Surface lift className="flex h-full items-center gap-5 p-5">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <span className="flex w-10 shrink-0 flex-col items-start gap-1">
                        <span className="text-[0.75rem] font-bold text-muted">{category.number}</span>
                      </span>
                      <CategoryIcon category={category} />
                      <div className="min-w-0">
                        <h3 className="text-[1rem] font-bold leading-snug text-ink">{category.title}</h3>
                        <p className="mt-1 text-[0.8125rem] text-muted">{category.signs.length} entries</p>
                      </div>
                    </div>
                    <Icon name="external-link" className="h-4 w-4 shrink-0 text-gold-ink transition-transform group-hover:translate-x-0.5" />
                  </Surface>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="shapes-heading" className="mt-20">
          <div className="flex flex-col gap-3">
            <p className={SECTION_LABEL}>Reading a sign</p>
            <h2 id="shapes-heading" className="text-[1.75rem] font-bold tracking-[-0.02em] text-ink md:text-[2.25rem]">
              The shape and colour tell you what a sign means
            </h2>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {SIGN_SHAPES.map((item) => (
              <li key={item.glyph}>
                <Surface lift className="flex h-full flex-col gap-4 p-5">
                  <SignShape glyph={item.glyph} className="h-12 w-12" />
                  <div>
                    <h3 className="text-[1rem] font-bold text-ink">{item.title}</h3>
                    <p className="mt-1.5 text-[0.875rem] leading-[1.6] text-muted">{item.body}</p>
                  </div>
                </Surface>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="speed-heading" className="mt-20">
          <div className="flex flex-col gap-3">
            <p className={SECTION_LABEL}>Speed</p>
            <h2 id="speed-heading" className="text-[1.75rem] font-bold tracking-[-0.02em] text-ink md:text-[2.25rem]">
              Speed limits
            </h2>
          </div>
          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            {SPEED_LIMITS.map((item) => (
              <li key={item.place}>
                <Surface lift className="flex h-full flex-col gap-3 p-6">
                  <span className="text-[0.8125rem] font-semibold text-muted">{item.place}</span>
                  <span className="text-[2rem] font-bold tracking-[-0.03em] text-ink">{item.limit}</span>
                  <p className="text-[0.875rem] leading-[1.6] text-muted">{item.note}</p>
                </Surface>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-start gap-2 text-[0.8125rem] leading-[1.6] text-muted">
            <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-gold-ink" />
            Speed limits can change, and signs on the road always apply. Check the current rules with the Department of Motor
            Traffic (DMT) before you drive.
          </p>
        </section>

        <section aria-labelledby="rules-heading" className="mt-20">
          <div className="flex flex-col gap-3">
            <p className={SECTION_LABEL}>Road rules</p>
            <h2 id="rules-heading" className="text-[1.75rem] font-bold tracking-[-0.02em] text-ink md:text-[2.25rem]">
              Key rules for drivers in Sri Lanka
            </h2>
          </div>
          <ul className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ROAD_RULES.map((rule) => (
              <li key={rule.title}>
                <Surface lift className="flex h-full items-start gap-4 p-5">
                  <IconTile>
                    <Icon name="check-circle" className="h-5 w-5" />
                  </IconTile>
                  <div>
                    <h3 className="text-[1rem] font-bold text-ink">{rule.title}</h3>
                    <p className="mt-1.5 text-[0.875rem] leading-[1.6] text-muted">{rule.body}</p>
                  </div>
                </Surface>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="disclaimer-heading" className="mt-20">
          <Surface className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div className="max-w-[680px]">
              <h2 id="disclaimer-heading" className="text-[1.25rem] font-bold text-ink">
                This is a general guide
              </h2>
              <p className="mt-2 text-[0.9375rem] leading-[1.7] text-muted">
                It does not replace the Motor Traffic Act or the rules set by the Department of Motor Traffic. Check the official
                rules before you sit your test, and follow the signs on the road.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link href="/packages" className={WHITE_BUTTON}>
                View packages
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
