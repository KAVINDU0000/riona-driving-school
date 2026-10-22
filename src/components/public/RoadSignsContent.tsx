"use client";

import Link from "next/link";
import PageHero from "@/components/public/PageHero";
import RoadSignsLanguageSwitch, { useRoadSignsLanguage } from "@/components/public/RoadSignsLanguage";
import { Container, IconTile, Surface } from "@/components/landing/primitives";
import { CategoryIcon, SignShape } from "@/components/public/RoadSignParts";
import Icon from "@/components/ui/Icon";
import { ROAD_RULES, SIGN_CATEGORIES, SIGN_SHAPES, SPEED_LIMITS } from "@/data/road-rules";
import { CATEGORY_TITLES_SI } from "@/data/road-signs-categories-si";
import { ROAD_RULES_SI } from "@/data/road-rules-si";
import { SIGN_SHAPES_SI } from "@/data/road-signs-shapes-si";
import { ROAD_SIGNS_UI } from "@/data/road-signs-ui";
import { CATEGORY_TITLES_TA, ROAD_RULES_TA, SIGN_SHAPES_TA } from "@/data/road-signs-tamil";

const SECTION_LABEL = "text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-gold-ink";

const SECTION_HEADING = "text-[1.75rem] font-bold tracking-[-0.02em] text-ink md:text-[2.25rem]";

/** Background for the shape name pill, matching the sign's colour. */
const SHAPE_PILL: Record<string, string> = {
  diamond: "bg-yellow-100",
  circle: "bg-red-50 ring-1 ring-red-200",
  triangle: "bg-red-50 ring-1 ring-red-200",
  octagon: "bg-red-50 ring-1 ring-red-200",
  square: "bg-sky-100",
  none: "bg-page",
};

/**
 * The road signs page body. Every piece of text follows the English / සිංහල / தமிழ் switch, and the switch sits under the
 * heading so it is the first thing a reader sees.
 */
export default function RoadSignsContent() {
  const [lang, chooseLanguage] = useRoadSignsLanguage();
  const ui = ROAD_SIGNS_UI[lang];

  return (
    <div lang={lang}>
      <PageHero eyebrow={ui.eyebrow} title={ui.title} description={ui.description} />

      <Container>
        <div className="mt-10">
          <RoadSignsLanguageSwitch lang={lang} onChoose={chooseLanguage} />
        </div>

        <section aria-labelledby="categories-heading" className="mt-12">
          <div className="flex flex-col gap-3">
            <p className={SECTION_LABEL}>{ui.categoriesLabel}</p>
            <h2 id="categories-heading" className={SECTION_HEADING}>
              {ui.categoriesHeading}
            </h2>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {SIGN_CATEGORIES.map((category) => {
              const title = lang === "si" ? CATEGORY_TITLES_SI[category.id] : lang === "ta" ? CATEGORY_TITLES_TA[category.id] : undefined;
              return (
                <li key={category.id}>
                  <Link
                    href={`/road-signs/${category.id}`}
                    className="group block h-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
                  >
                    <Surface lift className="flex h-full items-center gap-6 p-6">
                      <div className="flex min-w-0 flex-1 items-center gap-4">
                        <span className="flex w-10 shrink-0 flex-col items-start gap-1">
                          <span className="text-[0.75rem] font-bold text-muted">{Number(category.number)}</span>
                        </span>
                        <CategoryIcon category={category} className="h-20 w-20" />
                        <div className="min-w-0">
                          <h3 className="text-[1.0625rem] font-bold leading-snug text-ink" lang={title ? lang : undefined}>
                            {title ?? category.title}
                          </h3>
                          <p className="mt-1 text-[0.8125rem] text-muted">{ui.entries(category.signs.length)}</p>
                        </div>
                      </div>
                      <Icon
                        name="external-link"
                        className="h-4 w-4 shrink-0 text-gold-ink transition-transform group-hover:translate-x-0.5"
                      />
                    </Surface>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="shapes-heading" className="mt-20">
          <div className="flex flex-col gap-3">
            <p className={SECTION_LABEL}>{ui.shapesLabel}</p>
            <h2 id="shapes-heading" className={SECTION_HEADING}>
              {ui.shapesHeading}
            </h2>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {SIGN_SHAPES.map((item) => {
              const translated = lang === "si" ? SIGN_SHAPES_SI[item.glyph] : lang === "ta" ? SIGN_SHAPES_TA[item.glyph] : undefined;
              return (
                <li key={item.glyph}>
                  <Surface lift className="flex h-full flex-col gap-5 p-5">
                    <div className="flex h-24 items-center justify-center">
                      <SignShape glyph={item.glyph} className="h-20 w-20" />
                    </div>
                    <span
                      className={`inline-flex w-full items-center justify-center rounded-full px-3 py-1.5 text-center text-[0.8125rem] font-bold text-ink ${SHAPE_PILL[item.glyph] ?? SHAPE_PILL.none}`}
                    >
                      {translated?.shape ?? item.shape}
                    </span>
                    <div className="flex flex-col gap-2">
                      <h3 className="text-[1rem] font-bold leading-snug text-ink">{translated?.type ?? item.type}</h3>
                      <p className="text-[0.875rem] leading-[1.6] text-muted">{translated?.body ?? item.body}</p>
                    </div>
                  </Surface>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="speed-heading" className="mt-20">
          <div className="flex flex-col gap-3">
            <p className={SECTION_LABEL}>{ui.speedLabel}</p>
            <h2 id="speed-heading" className={SECTION_HEADING}>
              {ui.speedHeading}
            </h2>
          </div>
          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            {SPEED_LIMITS.map((item) => {
              const place = ui.speedPlaces[item.place];
              return (
                <li key={item.place}>
                  <Surface lift className="flex h-full flex-col gap-3 p-6">
                    <span className="text-[0.8125rem] font-semibold text-muted">{place?.place ?? item.place}</span>
                    <span className="text-[2rem] font-bold tracking-[-0.03em] text-ink">{item.limit}</span>
                    <p className="text-[0.875rem] leading-[1.6] text-muted">{place?.note ?? item.note}</p>
                  </Surface>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 flex items-start gap-2 text-[0.8125rem] leading-[1.6] text-muted">
            <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-gold-ink" />
            {ui.speedNote}
          </p>
        </section>

        <section aria-labelledby="rules-heading" className="mt-20">
          <div className="flex flex-col gap-3">
            <p className={SECTION_LABEL}>{ui.rulesLabel}</p>
            <h2 id="rules-heading" className={SECTION_HEADING}>
              {ui.rulesHeading}
            </h2>
          </div>
          <ul className="mt-10 grid gap-[clamp(16px,1.5vw,28px)] md:grid-cols-2 xl:grid-cols-3">
            {ROAD_RULES.map((rule, index) => {
              const translated = lang === "si" ? ROAD_RULES_SI[rule.title] : lang === "ta" ? ROAD_RULES_TA[rule.title] : undefined;
              return (
                <li key={rule.title}>
                  <Surface lift className="flex h-full flex-col gap-4 p-6">
                    <div className="flex items-start justify-between">
                      <IconTile>
                        <Icon name={rule.icon} className="h-5 w-5" />
                      </IconTile>
                      <span className="text-[0.75rem] font-semibold text-muted">{String(index + 1).padStart(2, "0")}</span>
                    </div>
                    <h3 className="text-[1.0625rem] font-bold leading-[1.3] text-ink">{translated?.title ?? rule.title}</h3>
                    <p className="text-[0.875rem] leading-[1.65] text-muted">{translated?.body ?? rule.body}</p>
                  </Surface>
                </li>
              );
            })}
          </ul>
        </section>
      </Container>
    </div>
  );
}
