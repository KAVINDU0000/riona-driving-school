"use client";

import { useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { PRACTICE_QUIZZES } from "@/data/practice-quizzes";

const TEXT = {
  en: {
    quiz: "Quiz",
    startEnglish: "Start in English",
    startSinhala: "සිංහලෙන් ආරම්භ කරන්න",
    cover: "Driving quiz",
    coverDetail: "20 road signs · 20 road rules",
    bookDetail: "40 questions · 1 hour",
    chooseLanguage: "Choose a language to start",
  },
};

/** Each book has one accent colour, used for its number, band, badge and page tab. */
const BOOK_ACCENTS = ["#ffc933", "#34d399", "#38bdf8"];

const t = TEXT.en;

/** Three books, one per quiz. Each start button opens that quiz on its own page. */
export default function PracticeQuizzes() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="grid justify-items-center gap-12 md:grid-cols-3">
      {PRACTICE_QUIZZES.map((_, index) => {
        const isOpen = openIndex === index;
        const accent = BOOK_ACCENTS[index];

        return (
          <div key={index} className="group/book relative h-[360px] w-full max-w-[270px] [perspective:1600px]">
            {/* The inside of the book: a clean page with the quiz details and the two start buttons. */}
            <div
              className="absolute inset-0 flex flex-col justify-between rounded-r-2xl rounded-l-md bg-white p-6 ring-1 ring-line"
              style={{ boxShadow: "6px 6px 0 -1px #f1f5f9, 12px 10px 0 -2px #e2e8f0, 0 30px 50px -28px rgba(16,27,48,0.45)" }}
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} aria-hidden="true" />
                  <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-ink-soft">{`${t.quiz} ${index + 1}`}</p>
                </div>
                <div>
                  <p className="text-[1.125rem] font-bold leading-snug text-ink">{t.cover}</p>
                  <p className="mt-1.5 text-[0.8125rem] leading-[1.6] text-muted">{t.coverDetail}</p>
                </div>
                <p className="inline-flex w-fit rounded-full bg-page px-3 py-1 text-[0.75rem] font-semibold text-muted ring-1 ring-line">
                  {t.bookDetail}
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                <p className="text-[0.75rem] font-semibold text-muted">{t.chooseLanguage}</p>
                <Link
                  href={`/practice-papers/quiz/${index + 1}?lang=en`}
                  className="inline-flex items-center justify-center rounded-xl bg-ink px-4 py-3 text-[0.875rem] font-semibold text-white transition-colors hover:bg-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
                >
                  {t.startEnglish}
                </Link>
                <Link
                  href={`/practice-papers/quiz/${index + 1}?lang=si`}
                  lang="si"
                  className="inline-flex items-center justify-center rounded-xl bg-gold px-4 py-3 text-[0.875rem] font-semibold text-ink transition-colors hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
                >
                  {t.startSinhala}
                </Link>
              </div>
            </div>

            {/* The cover. It swings open on hover, or when the book is tapped on a phone. */}
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              aria-pressed={isOpen}
              aria-label={`${t.quiz} ${index + 1}: ${t.cover}`}
              className={`absolute inset-0 flex origin-left flex-col justify-between overflow-hidden rounded-r-2xl rounded-l-md bg-gradient-to-br from-[#1d2c48] via-ink to-[#070d1a] p-6 text-left text-white transition-transform duration-700 [backface-visibility:hidden] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark ${
                isOpen
                  ? "pointer-events-none [transform:rotateY(-160deg)]"
                  : "group-hover/book:pointer-events-none group-hover/book:[transform:rotateY(-160deg)]"
              }`}
              style={{ boxShadow: "inset 10px 0 14px -10px rgba(0,0,0,0.6), 0 30px 50px -26px rgba(16,27,48,0.6)" }}
            >
              {/* Decorative shapes that give each cover its accent colour. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-20 blur-2xl"
                style={{ backgroundColor: accent }}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5"
                style={{ backgroundColor: accent }}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/40 to-transparent"
              />

              <div className="relative flex w-full items-start justify-between gap-3">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-white ring-1 ring-white/15 backdrop-blur"
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
                  {`${t.quiz} ${index + 1}`}
                </span>
                <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white shadow-[0_8px_18px_-8px_rgba(0,0,0,0.6)] ring-2 ring-white/30">
                  <span className="relative block h-9 w-9">
                    <Image
                      src="/images/logo-riyona-circle.png"
                      alt="Riyona Driving School logo"
                      fill
                      sizes="36px"
                      className="object-contain"
                    />
                  </span>
                </span>
              </div>

              <div className="relative flex flex-col gap-3">
                <span
                  aria-hidden="true"
                  className="text-[4.5rem] font-extrabold leading-none tracking-[-0.04em] text-transparent"
                  style={{ WebkitTextStroke: `1.5px ${accent}` } as CSSProperties}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-[1.5rem] font-bold uppercase leading-[1.1] tracking-[0.01em]">
                  Driving
                  <br />
                  Quiz
                </span>
                <div className="flex flex-wrap items-center gap-2 text-[0.75rem] font-semibold text-white/75">
                  <span className="rounded-md bg-white/10 px-2 py-1">40 Q</span>
                  <span className="rounded-md bg-white/10 px-2 py-1">1 HR</span>
                  <span className="rounded-md bg-white/10 px-2 py-1">EN · සිං</span>
                </div>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
