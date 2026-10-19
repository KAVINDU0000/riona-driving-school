"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import PageHero from "@/components/public/PageHero";
import { Container, IconTile, Surface } from "@/components/landing/primitives";
import { CategoryIcon, SignShape } from "@/components/public/RoadSignParts";
import Icon from "@/components/ui/Icon";
import { ROAD_RULES, SIGN_CATEGORIES, SIGN_SHAPES, SPEED_LIMITS, type SignGlyph } from "@/data/road-rules";
import { CATEGORY_TITLES_SI } from "@/data/road-signs-categories-si";
import { ROAD_RULES_SI } from "@/data/road-rules-si";
import { ROAD_SIGNS_PAGE_SI } from "@/data/road-signs-page-si";
import { SIGN_SHAPES_SI } from "@/data/road-signs-shapes-si";

type Lang = "en" | "si";

const LANGUAGE_KEY = "road-signs-language";

const SECTION_LABEL = "text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-gold-ink";

const SECTION_HEADING = "text-[1.75rem] font-bold tracking-[-0.02em] text-ink md:text-[2.25rem]";

/** Background for the shape name pill, matching the sign's colour. */
const SHAPE_PILL: Record<SignGlyph, string> = {
  diamond: "bg-yellow-100",
  circle: "bg-red-50 ring-1 ring-red-200",
  triangle: "bg-red-50 ring-1 ring-red-200",
  octagon: "bg-red-50 ring-1 ring-red-200",
  square: "bg-sky-100",
  none: "bg-page",
};

const LANGUAGE_EVENT = "road-signs-language-change";

function readSavedLanguage(): Lang {
  try {
    return window.localStorage.getItem(LANGUAGE_KEY) === "si" ? "si" : "en";
  } catch {
    return "en";
  }
}

function saveLanguage(lang: Lang) {
  try {
    window.localStorage.setItem(LANGUAGE_KEY, lang);
  } catch {
    // Storage can be blocked. The page still works, it just forgets the choice on reload.
  }
}

/** Re-renders when the language changes here or in another tab. */
function subscribeToLanguage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(LANGUAGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(LANGUAGE_EVENT, onChange);
  };
}

/**
 * The road signs page body. Everything here follows the English / සිංහල switch except the categories list,
 * which already shows both languages for each topic.
 */
export default function RoadSignsContent() {
  // The server and the first browser render both use English. The saved choice applies right after loading.
  const lang = useSyncExternalStore(subscribeToLanguage, readSavedLanguage, () => "en" as Lang);
  const si = lang === "si";
  const t = ROAD_SIGNS_PAGE_SI;

  function choose(next: Lang) {
    saveLanguage(next);
    window.dispatchEvent(new Event(LANGUAGE_EVENT));
  }

  return (
    <>
      <PageHero
        eyebrow="Driving Signs & Road Rules"
        title="Road signs and road rules in Sri Lanka"
        description="Choose a category to see every sign, marking or signal in it. The rules that apply when you drive are below."
      />

      <Container>
        <section aria-labelledby="categories-heading" className="mt-12">
          <div className="flex flex-col gap-3">
            <p className={SECTION_LABEL}>Categories</p>
            <h2 id="categories-heading" className={SECTION_HEADING}>
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
                        <span className="text-[0.75rem] font-bold text-muted">{Number(category.number)}</span>
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
                        <p className="mt-1 text-[0.8125rem] text-muted">{category.signs.length} entries</p>
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

        <div className="mt-16 flex justify-center md:justify-start" role="group" aria-label="Language">
          <div className="inline-flex items-center gap-1 rounded-2xl bg-white/80 p-1.5 shadow-[0_12px_30px_-14px_rgb(40_60_90/0.25)] ring-1 ring-line backdrop-blur">
            <button
              type="button"
              aria-pressed={!si}
              onClick={() => choose("en")}
              className={`inline-flex min-w-[120px] items-center justify-center gap-2 rounded-xl px-6 py-3 text-[1rem] font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark ${
                !si
                  ? "bg-gradient-to-b from-gold to-gold-dark text-ink shadow-[0_10px_22px_-10px_rgba(232,164,0,0.95)]"
                  : "text-muted hover:bg-page hover:text-ink"
              }`}
            >
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${!si ? "bg-ink" : "bg-line"}`} />
              English
            </button>
            <button
              type="button"
              lang="si"
              aria-pressed={si}
              onClick={() => choose("si")}
              className={`inline-flex min-w-[120px] items-center justify-center gap-2 rounded-xl px-6 py-3 text-[1rem] font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark ${
                si
                  ? "bg-gradient-to-b from-gold to-gold-dark text-ink shadow-[0_10px_22px_-10px_rgba(232,164,0,0.95)]"
                  : "text-muted hover:bg-page hover:text-ink"
              }`}
            >
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${si ? "bg-ink" : "bg-line"}`} />
              සිංහල
            </button>
          </div>
        </div>

        <section aria-labelledby="shapes-heading" className="mt-20">
          <div className="flex flex-col gap-3">
            <p className={SECTION_LABEL}>{si ? t.shapes.label : "Reading a sign"}</p>
            <h2 id="shapes-heading" lang={si ? "si" : undefined} className={SECTION_HEADING}>
              {si ? t.shapes.heading : "The shape and colour tell you what a sign means"}
            </h2>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {SIGN_SHAPES.map((item) => {
              const shapeSi = SIGN_SHAPES_SI[item.glyph];
              return (
                <li key={item.glyph}>
                  <Surface lift className="flex h-full flex-col gap-5 p-5">
                    <div className="flex h-24 items-center justify-center">
                      <SignShape glyph={item.glyph} className="h-20 w-20" />
                    </div>
                    <span
                      lang={si ? "si" : undefined}
                      className={`inline-flex w-full items-center justify-center rounded-full px-3 py-1.5 text-center text-[0.8125rem] font-bold text-ink ${SHAPE_PILL[item.glyph]}`}
                    >
                      {si ? (shapeSi?.shape ?? item.shape) : item.shape}
                    </span>
                    <div className="flex flex-col gap-2">
                      <h3 lang={si ? "si" : undefined} className="text-[1rem] font-bold leading-snug text-ink">
                        {si ? (shapeSi?.type ?? item.type) : item.type}
                      </h3>
                      <p lang={si ? "si" : undefined} className="text-[0.875rem] leading-[1.6] text-muted">
                        {si ? (shapeSi?.body ?? item.body) : item.body}
                      </p>
                    </div>
                  </Surface>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="speed-heading" className="mt-20">
          <div className="flex flex-col gap-3">
            <p className={SECTION_LABEL}>{si ? t.speed.label : "Speed"}</p>
            <h2 id="speed-heading" lang={si ? "si" : undefined} className={SECTION_HEADING}>
              {si ? t.speed.heading : "Speed limits"}
            </h2>
          </div>
          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            {SPEED_LIMITS.map((item) => {
              const itemSi = t.speedLimits[item.place];
              return (
                <li key={item.place}>
                  <Surface lift className="flex h-full flex-col gap-3 p-6">
                    <span lang={si ? "si" : undefined} className="text-[0.8125rem] font-semibold text-muted">
                      {si ? (itemSi?.place ?? item.place) : item.place}
                    </span>
                    <span className="text-[2rem] font-bold tracking-[-0.03em] text-ink">{item.limit}</span>
                    <p lang={si ? "si" : undefined} className="text-[0.875rem] leading-[1.6] text-muted">
                      {si ? (itemSi?.note ?? item.note) : item.note}
                    </p>
                  </Surface>
                </li>
              );
            })}
          </ul>
          <p lang={si ? "si" : undefined} className="mt-4 flex items-start gap-2 text-[0.8125rem] leading-[1.6] text-muted">
            <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-gold-ink" />
            {si
              ? t.speed.note
              : "Speed limits can change, and signs on the road always apply. Check the current rules with the Department of Motor Traffic (DMT) before you drive."}
          </p>
        </section>

        <section aria-labelledby="rules-heading" className="mt-20">
          <div className="flex flex-col gap-3">
            <p className={SECTION_LABEL}>{si ? t.rules.label : "Road rules"}</p>
            <h2 id="rules-heading" lang={si ? "si" : undefined} className={SECTION_HEADING}>
              {si ? t.rules.heading : "Key rules for drivers in Sri Lanka"}
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
                  <h3
                    lang={si ? "si" : undefined}
                    className="text-[1.0625rem] font-bold leading-[1.3] text-ink"
                  >
                    {si ? (ROAD_RULES_SI[rule.title]?.title ?? rule.title) : rule.title}
                  </h3>
                  <p lang={si ? "si" : undefined} className="text-[0.875rem] leading-[1.65] text-muted">
                    {si ? (ROAD_RULES_SI[rule.title]?.body ?? rule.body) : rule.body}
                  </p>
                </Surface>
              </li>
            ))}
          </ul>
        </section>
      </Container>
    </>
  );
}
