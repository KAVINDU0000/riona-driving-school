"use client";

import { useSyncExternalStore } from "react";
import { ROAD_SIGNS_LANGUAGES, ROAD_SIGNS_UI, type RoadSignsLang } from "@/data/road-signs-ui";

const LANGUAGE_KEY = "road-signs-language";
const LANGUAGE_EVENT = "road-signs-language-change";

function isLanguage(value: string | null): value is RoadSignsLang {
  return value === "en" || value === "si" || value === "ta";
}

function readSavedLanguage(): RoadSignsLang {
  try {
    const saved = window.localStorage.getItem(LANGUAGE_KEY);
    return isLanguage(saved) ? saved : "en";
  } catch {
    return "en";
  }
}

function saveLanguage(lang: RoadSignsLang) {
  try {
    window.localStorage.setItem(LANGUAGE_KEY, lang);
  } catch {
    // Storage can be blocked. The page still works, it just forgets the choice on reload.
  }
}

/** Re-renders when the language changes here or in another tab. */
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(LANGUAGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(LANGUAGE_EVENT, onChange);
  };
}

/**
 * The language of the road signs pages, shared by every component on them and remembered in the browser. The server
 * and the first browser render both use English; the saved choice applies right after loading.
 */
export function useRoadSignsLanguage(): [RoadSignsLang, (next: RoadSignsLang) => void] {
  const lang = useSyncExternalStore(subscribe, readSavedLanguage, () => "en" as RoadSignsLang);

  function choose(next: RoadSignsLang) {
    saveLanguage(next);
    window.dispatchEvent(new Event(LANGUAGE_EVENT));
  }

  return [lang, choose];
}

/** Three buttons: English, සිංහල and தமிழ். The text of the buttons is always in its own language. */
export default function RoadSignsLanguageSwitch({ lang, onChoose }: { lang: RoadSignsLang; onChoose: (next: RoadSignsLang) => void }) {
  return (
    <div className="flex justify-center md:justify-start" role="group" aria-label={ROAD_SIGNS_UI[lang].switchLabel}>
      <div className="inline-flex flex-wrap items-center gap-1 rounded-2xl bg-white/80 p-1.5 shadow-[0_12px_30px_-14px_rgb(40_60_90/0.25)] ring-1 ring-line backdrop-blur">
        {ROAD_SIGNS_LANGUAGES.map((option) => {
          const selected = lang === option.value;
          return (
            <button
              key={option.value}
              type="button"
              lang={option.value}
              aria-pressed={selected}
              onClick={() => onChoose(option.value)}
              className={`inline-flex min-w-[104px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-[1rem] font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark ${
                selected
                  ? "bg-gradient-to-b from-gold to-gold-dark text-ink shadow-[0_10px_22px_-10px_rgba(232,164,0,0.95)]"
                  : "text-muted hover:bg-page hover:text-ink"
              }`}
            >
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${selected ? "bg-ink" : "bg-line"}`} />
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
