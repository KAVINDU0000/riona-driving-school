"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  PRACTICE_QUIZZES,
  type PracticeQuestion,
} from "@/data/practice-quizzes";
import { Surface } from "@/components/landing/primitives";

type Medium = "si" | "en";

type QuizState = {
  finished: boolean;
  timedOut: boolean;
  deadline: number | null;
  current: number;
  chosen: (number | null)[];
  flagged: boolean[];
};

const QUESTION_COUNT = 40;
const TIME_LIMIT_MS = 60 * 60 * 1000;
const LETTERS = ["A", "B", "C", "D"];

const TEXT = {
  en: {
    next: "Next",
    finish: "Finish quiz",
    flag: "Flag for review",
    unflag: "Remove flag",
    flagged: "Flagged for review",
    signTag: "Road sign",
    ruleTag: "Road rules",
    progress: "Question",
    answerOrFlag: "Choose an answer or flag this question to continue.",
    timeLeft: "Time left",
    timeUp:
      "Time is up. The quiz has stopped, and questions you did not answer are counted as wrong.",
    mark: "Your mark",
    outOf: "out of 40",
    retry: "Try again",
    review: "Review your answers",
    yourAnswer: "Your answer",
    correctAnswer: "Correct answer",
    notAnswered: "Not answered",
    flaggedNote: "flagged for review",
  },
  si: {
    next: "ඊළඟ",
    finish: "නිම කරන්න",
    flag: "සමාලෝචනය සඳහා සලකුණු කරන්න",
    unflag: "සලකුණ ඉවත් කරන්න",
    flagged: "සමාලෝචනය සඳහා සලකුණු කර ඇත",
    signTag: "මාර්ග සංඥාව",
    ruleTag: "මාර්ග නීති",
    progress: "ප්‍රශ්නය",
    answerOrFlag: "ඉදිරියට යාමට පිළිතුරක් තෝරන්න හෝ මෙම ප්‍රශ්නය සලකුණු කරන්න.",
    timeLeft: "ඉතිරි කාලය",
    timeUp:
      "කාලය අවසන්. ප්‍රශ්නාවලිය නවතා ඇත, පිළිතුරු නොදුන් ප්‍රශ්න වැරදි ලෙස ගණන් ගෙන ඇත.",
    mark: "ඔබේ ලකුණු",
    outOf: "40 න්",
    retry: "නැවත උත්සාහ කරන්න",
    review: "ඔබේ පිළිතුරු සමාලෝචනය",
    yourAnswer: "ඔබේ පිළිතුර",
    correctAnswer: "නිවැරදි පිළිතුර",
    notAnswered: "පිළිතුරු නොදුන්",
    flaggedNote: "සමාලෝචනය සඳහා සලකුණු කළ ප්‍රශ්න",
  },
} as const;

function freshState(): QuizState {
  return {
    finished: false,
    timedOut: false,
    deadline: null,
    current: 0,
    chosen: Array(QUESTION_COUNT).fill(null),
    flagged: Array(QUESTION_COUNT).fill(false),
  };
}

function formatTime(milliseconds: number) {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function scoreOf(questions: PracticeQuestion[], chosen: (number | null)[]) {
  return questions.reduce(
    (total, question, index) =>
      total + (chosen[index] === question.answer ? 1 : 0),
    0,
  );
}

/** One quiz. The timer starts as soon as the quiz page opens. */
export default function PracticeQuizRunner({
  quizIndex,
  medium,
}: {
  quizIndex: number;
  medium: Medium;
}) {
  const [state, setState] = useState<QuizState>(freshState);
  const [now, setNow] = useState(0);

  const t = TEXT[medium];
  const lang = medium;
  const quiz = PRACTICE_QUIZZES[quizIndex];
  const timeLeft =
    state.deadline === null ? TIME_LIMIT_MS : Math.max(0, state.deadline - now);

  // The first tick sets the deadline, so the hour starts when the page opens.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      setState((previous) => {
        if (previous.finished) return previous;
        if (previous.deadline === null) {
          return { ...previous, deadline: current + TIME_LIMIT_MS };
        }
        if (current >= previous.deadline) {
          return { ...previous, finished: true, timedOut: true };
        }
        return previous;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  function pick(option: number) {
    setState((previous) => {
      if (previous.finished) return previous;
      const chosen = [...previous.chosen];
      chosen[previous.current] = option;
      return { ...previous, chosen };
    });
  }

  function toggleFlag() {
    setState((previous) => {
      const flagged = [...previous.flagged];
      flagged[previous.current] = !flagged[previous.current];
      return { ...previous, flagged };
    });
  }

  function next() {
    setState((previous) => {
      if (previous.current >= QUESTION_COUNT - 1) {
        return { ...previous, finished: true };
      }
      return { ...previous, current: previous.current + 1 };
    });
  }

  function retry() {
    setState(freshState());
  }

  if (state.finished) {
    return (
      <div className="flex flex-col gap-6">
        <Surface className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p
              lang={lang}
              className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-gold-ink"
            >
              {t.mark}
            </p>
            <p className="mt-1 text-[2rem] font-bold tracking-[-0.02em] text-ink">
              {scoreOf(quiz.questions, state.chosen)}
              <span className="text-[1.125rem] font-semibold text-muted">
                {" "}
                / 40
              </span>
            </p>
            <p lang={lang} className="text-[0.875rem] text-muted">
              {t.outOf}
            </p>
          </div>
          <button
            type="button"
            onClick={retry}
            lang={lang}
            className="inline-flex w-fit items-center rounded-xl bg-white px-5 py-3 text-[0.9375rem] font-semibold text-ink ring-1 ring-line hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
          >
            {t.retry}
          </button>
        </Surface>

        {state.timedOut && (
          <p
            lang={lang}
            className="rounded-xl bg-gold-soft px-4 py-3 text-[0.9375rem] font-semibold text-gold-ink"
          >
            {t.timeUp}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <h2 lang={lang} className="text-[1.125rem] font-bold text-ink">
            {t.review}
          </h2>
          <ol className="flex flex-col gap-3">
            {quiz.questions.map((question, index) => {
              const chosen = state.chosen[index];
              const correct = chosen === question.answer;
              return (
                <li key={question.id}>
                  <Surface className="flex flex-col gap-2 p-4">
                    <p
                      lang={lang}
                      className="text-[0.9375rem] font-semibold leading-[1.6] text-ink"
                    >
                      {`${index + 1}. ${question[medium].question}`}
                    </p>
                    <p lang={lang} className="text-[0.875rem] text-muted">
                      {`${t.yourAnswer}: ${
                        chosen === null ? t.notAnswered : `${LETTERS[chosen]}`
                      }`}
                      {" · "}
                      {`${t.correctAnswer}: ${LETTERS[question.answer]}`}
                      {" · "}
                      <span
                        className={correct ? "text-success" : "text-red-600"}
                      >
                        {correct ? "✓" : "✗"}
                      </span>
                      {state.flagged[index] && (
                        <span className="ml-2 text-gold-ink">
                          {`⚑ ${t.flaggedNote}`}
                        </span>
                      )}
                    </p>
                  </Surface>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    );
  }

  const question = quiz.questions[state.current];
  const content = question[medium];
  const selectedOption = state.chosen[state.current];
  const flagged = state.flagged[state.current];
  const canContinue = selectedOption !== null || flagged;
  const isLast = state.current === QUESTION_COUNT - 1;

  return (
    <Surface className="flex flex-col gap-6 p-5 md:p-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-[0.875rem] font-semibold text-muted">
          <span lang={lang}>
            {`${t.progress} ${state.current + 1} / ${QUESTION_COUNT}`}
          </span>
          <span
            lang={lang}
            className={`tabular-nums ${
              timeLeft <= 5 * 60 * 1000 ? "text-red-600" : "text-ink"
            }`}
          >
            {`${t.timeLeft}: ${formatTime(timeLeft)}`}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-page">
          <div
            className="h-full rounded-full bg-gold transition-all"
            style={{
              width: `${((state.current + 1) / QUESTION_COUNT) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <p
          lang={lang}
          className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-gold-ink"
        >
          {question.kind === "sign" ? t.signTag : t.ruleTag}
        </p>
        {question.image && (
          <Image
            src={question.image}
            alt=""
            width={260}
            height={260}
            className="h-48 w-48 object-contain"
          />
        )}
        <p
          lang={lang}
          className="text-[1.0625rem] font-semibold leading-[1.6] text-ink"
        >
          {content.question}
        </p>
        <ul className="grid gap-2">
          {content.options.map((option, optionIndex) => {
            const isChosen = selectedOption === optionIndex;
            return (
              <li key={optionIndex}>
                <button
                  type="button"
                  onClick={() => pick(optionIndex)}
                  aria-pressed={isChosen}
                  lang={lang}
                  className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-[0.9375rem] leading-[1.5] text-ink transition-colors ${
                    isChosen
                      ? "border-gold-dark bg-gold-soft"
                      : "border-line bg-white hover:border-gold-dark"
                  }`}
                >
                  <span className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-page text-[0.75rem] font-bold">
                    {LETTERS[optionIndex]}
                  </span>
                  <span className="min-w-0">{option}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-col gap-4 border-t border-line pt-5 md:flex-row md:items-center md:justify-between">
        <button
          type="button"
          onClick={toggleFlag}
          aria-pressed={flagged}
          lang={lang}
          className={`inline-flex w-fit items-center rounded-xl px-4 py-2.5 text-[0.875rem] font-semibold ring-1 transition-colors ${
            flagged
              ? "bg-gold-soft text-gold-ink ring-gold-dark"
              : "bg-white text-ink ring-line hover:bg-page"
          }`}
        >
          {flagged ? t.unflag : t.flag}
        </button>
        <div className="flex flex-col gap-2 md:items-end">
          {!canContinue && (
            <p lang={lang} className="text-[0.8125rem] text-muted">
              {t.answerOrFlag}
            </p>
          )}
          <button
            type="button"
            onClick={next}
            disabled={!canContinue}
            lang={lang}
            className="inline-flex w-fit items-center rounded-xl bg-gold px-6 py-3 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] transition-colors hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark disabled:cursor-not-allowed disabled:bg-page disabled:text-muted disabled:shadow-none"
          >
            {isLast ? t.finish : t.next}
          </button>
        </div>
      </div>
    </Surface>
  );
}
