"use client";

import Link from "next/link";
import PageHero from "@/components/public/PageHero";
import RoadSignsLanguageSwitch, { useRoadSignsLanguage } from "@/components/public/RoadSignsLanguage";
import { Container } from "@/components/landing/primitives";
import { CategorySignGrid } from "@/components/public/RoadSignParts";
import type { SignCategory } from "@/data/road-rules";
import { CATEGORY_INTROS_SI, CATEGORY_TITLES_SI } from "@/data/road-signs-categories-si";
import { ROAD_SIGNS_UI } from "@/data/road-signs-ui";
import { CATEGORY_INTROS_TA, CATEGORY_TITLES_TA } from "@/data/road-signs-tamil";

const WHITE_BUTTON =
  "inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-[0.9375rem] font-semibold text-ink ring-1 ring-line hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark";

/** One category of road signs, in the language the reader chose on the road signs page. */
export default function RoadSignCategoryContent({ category }: { category: SignCategory }) {
  const [lang, chooseLanguage] = useRoadSignsLanguage();
  const ui = ROAD_SIGNS_UI[lang];
  const title = lang === "si" ? CATEGORY_TITLES_SI[category.id] : lang === "ta" ? CATEGORY_TITLES_TA[category.id] : undefined;
  const intro = lang === "si" ? CATEGORY_INTROS_SI[category.id] : lang === "ta" ? CATEGORY_INTROS_TA[category.id] : undefined;

  return (
    <div lang={lang}>
      <PageHero
        eyebrow={ui.categoryEyebrow(Number(category.number).toString())}
        title={title ?? category.title}
        description={intro ?? category.intro}
        actions={
          <Link href="/road-signs" className={WHITE_BUTTON}>
            {ui.allCategories}
          </Link>
        }
      />

      <Container>
        <div className="mt-10">
          <RoadSignsLanguageSwitch lang={lang} onChoose={chooseLanguage} />
        </div>
        <p className="mt-10 text-[0.875rem] font-semibold text-muted">{ui.categoryEntries(category.signs.length)}</p>
        <CategorySignGrid category={category} lang={lang} />
      </Container>
    </div>
  );
}
