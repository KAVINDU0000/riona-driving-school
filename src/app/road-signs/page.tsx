import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/public/PageHero";
import PublicFrame from "@/components/public/PublicFrame";
import { Container, IconTile, Surface } from "@/components/landing/primitives";
import { CategoryIcon, SignShape } from "@/components/public/RoadSignParts";
import Icon from "@/components/ui/Icon";
import {
  ROAD_RULES,
  SIGN_CATEGORIES,
  SIGN_SHAPES,
  SPEED_LIMITS,
  type SignGlyph,
} from "@/data/road-rules";
import { CATEGORY_TITLES_SI } from "@/data/road-signs-categories-si";

export const metadata: Metadata = {
  title: "Driving Signs & Road Rules in Sri Lanka | Riyona Driving School",
  description:
    "Road sign categories, speed limits and key road rules in Sri Lanka, explained for learner drivers.",
};

const SECTION_LABEL =
  "text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-gold-ink";

const GOLD_BUTTON =
  "inline-flex items-center justify-center rounded-xl bg-gold px-5 py-3 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark";

/** Background for the shape name pill, matching the sign's colour. */
const SHAPE_PILL: Record<SignGlyph, string> = {
  diamond: "bg-yellow-100",
  circle: "bg-red-50 ring-1 ring-red-200",
  triangle: "bg-red-50 ring-1 ring-red-200",
  octagon: "bg-red-50 ring-1 ring-red-200",
  square: "bg-sky-100",
  none: "bg-page",
};

const WHITE_BUTTON =
  "inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-[0.9375rem] font-semibold text-ink ring-1 ring-line hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark";

export default function RoadSignsPage() {
  return (
    <PublicFrame>
      <PageHero
        eyebrow="Driving Signs & Road Rules"
        title="Road signs and road rules in Sri Lanka"
        description="Choose a category to see every sign, marking or signal in it. The rules that apply when you drive are below."
      />

      <Container>
        <section aria-labelledby="categories-heading" className="mt-12">
          <div className="flex flex-col gap-3">
            <p className={SECTION_LABEL}>Categories</p>
            <h2
              id="categories-heading"
              className="text-[1.75rem] font-bold tracking-[-0.02em] text-ink md:text-[2.25rem]"
            >
              Road sign categories
            </h2>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {SIGN_CATEGORIES.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/road-signs/${category.id}`}
                  className="group block h-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
                >
                  <Surface lift className="flex h-full items-center gap-6 p-6">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <span className="flex w-10 shrink-0 flex-col items-start gap-1">
                        <span className="text-[0.75rem] font-bold text-muted">
                          {Number(category.number)}
                        </span>
                      </span>
                      <CategoryIcon category={category} className="h-20 w-20" />
                      <div className="min-w-0">
                        <h3 className="text-[1.0625rem] font-bold leading-snug text-ink">
                          {CATEGORY_TITLES_SI[category.id] && (
                            <span lang="si" className="mr-1">
                              {CATEGORY_TITLES_SI[category.id]}
                            </span>
                          )}
                          <span>({category.title})</span>
                        </h3>
                        <p className="mt-1 text-[0.8125rem] text-muted">
                          {category.signs.length} entries
                        </p>
                      </div>
                    </div>
                    <Icon
                      name="external-link"
                      className="h-4 w-4 shrink-0 text-gold-ink transition-transform group-hover:translate-x-0.5"
                    />
                  </Surface>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="shapes-heading" className="mt-20">
          <div className="flex flex-col gap-3">
            <p className={SECTION_LABEL}>Reading a sign</p>
            <h2
              id="shapes-heading"
              className="text-[1.75rem] font-bold tracking-[-0.02em] text-ink md:text-[2.25rem]"
            >
              The shape and colour tell you what a sign means
            </h2>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {SIGN_SHAPES.map((item) => (
              <li key={item.glyph}>
                <Surface lift className="flex h-full flex-col gap-5 p-5">
                  <div className="flex h-24 items-center justify-center">
                    <SignShape glyph={item.glyph} className="h-20 w-20" />
                  </div>
                  <span
                    className={`inline-flex w-full items-center justify-center rounded-full px-3 py-1.5 text-center text-[0.8125rem] font-bold text-ink ${SHAPE_PILL[item.glyph]}`}
                  >
                    {item.shape}
                  </span>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-[1rem] font-bold leading-snug text-ink">
                      {item.type}
                    </h3>
                    <p className="text-[0.875rem] leading-[1.6] text-muted">
                      {item.body}
                    </p>
                  </div>
                </Surface>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="speed-heading" className="mt-20">
          <div className="flex flex-col gap-3">
            <p className={SECTION_LABEL}>Speed</p>
            <h2
              id="speed-heading"
              className="text-[1.75rem] font-bold tracking-[-0.02em] text-ink md:text-[2.25rem]"
            >
              Speed limits
            </h2>
          </div>
          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            {SPEED_LIMITS.map((item) => (
              <li key={item.place}>
                <Surface lift className="flex h-full flex-col gap-3 p-6">
                  <span className="text-[0.8125rem] font-semibold text-muted">
                    {item.place}
                  </span>
                  <span className="text-[2rem] font-bold tracking-[-0.03em] text-ink">
                    {item.limit}
                  </span>
                  <p className="text-[0.875rem] leading-[1.6] text-muted">
                    {item.note}
                  </p>
                </Surface>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-start gap-2 text-[0.8125rem] leading-[1.6] text-muted">
            <Icon
              name="info"
              className="mt-0.5 h-4 w-4 shrink-0 text-gold-ink"
            />
            Speed limits can change, and signs on the road always apply. Check
            the current rules with the Department of Motor Traffic (DMT) before
            you drive.
          </p>
        </section>

        <section aria-labelledby="rules-heading" className="mt-20">
          <div className="flex flex-col gap-3">
            <p className={SECTION_LABEL}>Road rules</p>
            <h2
              id="rules-heading"
              className="text-[1.75rem] font-bold tracking-[-0.02em] text-ink md:text-[2.25rem]"
            >
              Key rules for drivers in Sri Lanka
            </h2>
          </div>
          <ul className="mt-10 grid gap-[clamp(16px,1.5vw,28px)] md:grid-cols-2 xl:grid-cols-3">
            {ROAD_RULES.map((rule, index) => (
              <li key={rule.title}>
                <Surface lift className="flex h-full flex-col gap-4 p-6">
                  <div className="flex items-start justify-between">
                    <IconTile>
                      <Icon name={rule.icon} className="h-5 w-5" />
                    </IconTile>
                    <span className="text-[0.75rem] font-semibold text-muted">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="text-[1.0625rem] font-bold leading-[1.3] text-ink">
                    {rule.title}
                  </h3>
                  <p className="text-[0.875rem] leading-[1.65] text-muted">
                    {rule.body}
                  </p>
                </Surface>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="disclaimer-heading" className="mt-20">
          <Surface className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div className="max-w-[680px]">
              <h2
                id="disclaimer-heading"
                className="text-[1.25rem] font-bold text-ink"
              >
                This is a general guide
              </h2>
              <p className="mt-2 text-[0.9375rem] leading-[1.7] text-muted">
                It does not replace the Motor Traffic Act or the rules set by
                the Department of Motor Traffic. Check the official rules before
                you sit your test, and follow the signs on the road.
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
