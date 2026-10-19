"use client";

import { useState } from "react";
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

// Each book has its own cover colours, so the three quizzes are easy to tell apart.
const BOOK_COVERS = [
  "bg-gradient-to-br from-yellow-100 via-gold to-gold-dark",
  "bg-gradient-to-br from-emerald-100 via-emerald-400 to-emerald-700",
  "bg-gradient-to-br from-sky-100 via-sky-400 to-sky-700",
];

const t = TEXT.en;

/** Three books, one per quiz. Each start button opens that quiz on its own page. */
export default function PracticeQuizzes() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-10">
      <div className="grid justify-items-center gap-10 md:grid-cols-3">
        {PRACTICE_QUIZZES.map((_, index) => {
          const isOpen = openIndex === index;

          return (
            <div
              key={index}
              className="group/book relative h-[340px] w-full max-w-[260px] [perspective:1400px]"
            >
              {/* The inside of the book, shown once the cover opens. */}
              <div className="absolute inset-0 flex flex-col justify-between rounded-r-2xl rounded-l-md bg-white p-6 shadow-card ring-1 ring-line">
                <div className="flex flex-col gap-3">
                  <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-gold-ink">
                    {`${t.quiz} ${index + 1}`}
                  </p>
                  <p className="text-[1.0625rem] font-bold text-ink">
                    {t.cover}
                  </p>
                  <p className="text-[0.8125rem] leading-[1.6] text-muted">
                    {t.coverDetail}
                  </p>
                  <p className="text-[0.8125rem] font-semibold text-muted">
                    {t.bookDetail}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-[0.75rem] font-semibold text-muted">
                    {t.chooseLanguage}
                  </p>
                  <Link
                    href={`/practice-papers/quiz/${index + 1}?lang=en`}
                    className="inline-flex items-center justify-center rounded-xl bg-gold px-4 py-2.5 text-[0.875rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
                  >
                    {t.startEnglish}
                  </Link>
                  <Link
                    href={`/practice-papers/quiz/${index + 1}?lang=si`}
                    lang="si"
                    className="inline-flex items-center justify-center rounded-xl bg-ink px-4 py-2.5 text-[0.875rem] font-semibold text-white hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
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
                className={`absolute inset-0 flex origin-left flex-col justify-between overflow-hidden rounded-r-2xl rounded-l-md p-6 text-left text-ink shadow-card transition-transform duration-700 [backface-visibility:hidden] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark ${BOOK_COVERS[index]} ${
                  isOpen
                    ? "pointer-events-none [transform:rotateY(-160deg)]"
                    : "group-hover/book:pointer-events-none group-hover/book:[transform:rotateY(-160deg)]"
                }`}
              >
                <div className="flex w-full items-start justify-between gap-3">
                  <span className="rounded-full bg-red-500 px-3 py-1 text-[0.75rem] font-bold text-white shadow-sm">
                    {`${t.quiz} ${index + 1}`}
                  </span>
                  <span className="relative block h-14 w-14 shrink-0">
                    <Image
                      src="/images/logo-riyona-circle.png"
                      alt="Riyona Driving School logo"
                      fill
                      sizes="56px"
                      className="object-contain"
                    />
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[1.75rem] font-extrabold uppercase leading-[1.05] tracking-[-0.01em]">
                    Driving
                    <br />
                    Quiz
                  </span>
                  <span className="text-[0.8125rem] font-semibold text-ink/75">
                    {t.coverDetail}
                  </span>
                  <span className="mt-2 text-[0.75rem] font-bold text-ink/75">
                    English · සිංහල
                  </span>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
