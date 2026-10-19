"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  PRACTICE_QUIZZES,
  type PracticeQuestion,
} from "@/data/practice-quizzes";

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
/** A mark above this passes the practice exam. */
const PASS_MARK = 30;
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
    legendAnswered: "Answered",
    legendFlagged: "Flagged",
    legendOpen: "Not answered",
    timeOver: "Time is over",
    quizComplete: "Quiz complete",
    passed: "Pass",
    passedMessage: "Well done. Your mark is above 30, so you passed this practice exam.",
    studyMessage: "Your mark is 30 or lower. Study the road signs and rules again, review the questions you got wrong, and practise before the exam.",
    reviewAnswers: "Review answers",
    questionNumber: "Question",
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
    legendAnswered: "පිළිතුරු දුන්",
    legendFlagged: "සලකුණු කළ",
    legendOpen: "පිළිතුරු නැත",
    timeOver: "කාලය අවසන්",
    quizComplete: "ප්‍රශ්නාවලිය අවසන්",
    passed: "සමත්",
    passedMessage: "සුබ පැතුම්. ඔබේ ලකුණු 30 ට වැඩි බැවින් මෙම පුහුණු පරීක්ෂණය ඔබ සමත් වී ඇත.",
    studyMessage: "ඔබේ ලකුණු 30 හෝ ඊට අඩුයි. මාර්ග සලකුණු සහ නීති නැවත ඉගෙන ගෙන, වැරදි ගිය ප්‍රශ්න සමාලෝචනය කර, පරීක්ෂණයට පෙර තවත් පුහුණු වන්න.",
    reviewAnswers: "පිළිතුරු සමාලෝචනය",
    questionNumber: "ප්‍රශ්නය",
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
  const [resultDismissed, setResultDismissed] = useState(false);

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

  function goTo(index: number) {
    setState((previous) => ({ ...previous, current: index }));
  }

  function retry() {
    setState(freshState());
    setResultDismissed(false);
  }

  if (state.finished) {
    const mark = scoreOf(quiz.questions, state.chosen);
    const passed = mark > PASS_MARK;
    const percent = Math.round((mark / QUESTION_COUNT) * 100);
    const flaggedCount = state.flagged.filter(Boolean).length;
    const unansweredCount = state.chosen.filter((answer) => answer === null).length;

    return (
      <div className="flex flex-col gap-8">
        {!resultDismissed && (
          <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/60 p-4 backdrop-blur-sm">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="result-title"
              lang={lang}
              className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 text-center shadow-[0_40px_80px_-30px_rgba(16,27,48,0.6)] md:p-8"
            >
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-gold via-gold-dark to-gold-deep" />
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-gold-ink">{t.quizComplete}</p>
              <h2 id="result-title" className="mt-3 text-[1.5rem] font-bold tracking-[-0.02em] text-ink">
                {state.timedOut ? t.timeOver : t.quizComplete}
              </h2>

              <div className="mt-6 flex flex-col items-center gap-1">
                <p className="flex items-baseline gap-2">
                  <span className="text-[4.5rem] font-extrabold leading-none tracking-[-0.04em] text-ink">{mark}</span>
                  <span className="text-[1.25rem] font-semibold text-muted">/ {QUESTION_COUNT}</span>
                </p>
                <p className="text-[0.875rem] text-muted">{t.outOf}</p>
              </div>

              <div
                className={`mt-6 rounded-2xl px-5 py-4 text-[0.9375rem] leading-[1.6] ${
                  passed ? "bg-success-soft text-success" : "bg-gold-soft text-gold-ink"
                }`}
              >
                <p className="text-[1rem] font-bold">{passed ? t.passed : ""}</p>
                <p className="mt-1">{passed ? t.passedMessage : t.studyMessage}</p>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setResultDismissed(true)}
                  autoFocus
                  className="inline-flex flex-1 items-center justify-center rounded-xl bg-ink px-5 py-3 text-[0.9375rem] font-semibold text-white transition-colors hover:bg-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
                >
                  {t.reviewAnswers}
                </button>
                <button
                  type="button"
                  onClick={retry}
                  className="inline-flex flex-1 items-center justify-center rounded-xl bg-gold px-5 py-3 text-[0.9375rem] font-bold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] transition-colors hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
                >
                  {t.retry}
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="relative overflow-hidden rounded-3xl bg-ink p-6 text-white shadow-[0_30px_60px_-30px_rgba(16,27,48,0.6)] md:p-8">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold/25 blur-3xl"
          />
          <div className="relative grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="flex flex-col gap-4">
              <p lang={lang} className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-gold">
                {t.mark}
              </p>
              <p className="flex items-baseline gap-3">
                <span className="text-[4rem] font-extrabold leading-none tracking-[-0.04em]">{mark}</span>
                <span className="text-[1.25rem] font-semibold text-white/60">/ {QUESTION_COUNT}</span>
              </p>
              <p lang={lang} className="text-[0.9375rem] text-white/70">
                {t.outOf}
              </p>
              <div className="h-2.5 w-full max-w-md overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gold to-gold-deep transition-all duration-700"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-2 text-[0.8125rem] font-semibold">
                <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15">{percent}%</span>
                {flaggedCount > 0 && (
                  <span lang={lang} className="rounded-full bg-gold/20 px-3 py-1.5 text-gold ring-1 ring-gold/30">
                    {`${flaggedCount} ${t.flaggedNote}`}
                  </span>
                )}
                {unansweredCount > 0 && (
                  <span lang={lang} className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15">
                    {`${unansweredCount} ${t.notAnswered}`}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={retry}
              lang={lang}
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-gold px-6 py-3 text-[0.9375rem] font-bold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] transition-colors hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
            >
              {t.retry}
            </button>
          </div>
        </section>

        {state.timedOut && (
          <p
            lang={lang}
            className="flex items-center gap-3 rounded-2xl bg-gold-soft px-5 py-4 text-[0.9375rem] font-semibold text-gold-ink"
          >
            <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-gold-ink">
              !
            </span>
            {t.timeUp}
          </p>
        )}

        <div className="flex flex-col gap-4">
          <h2 lang={lang} className="text-[1.25rem] font-bold tracking-[-0.01em] text-ink">
            {t.review}
          </h2>
          <ol className="grid gap-3">
            {quiz.questions.map((question, index) => {
              const chosen = state.chosen[index];
              const correct = chosen === question.answer;
              const unanswered = chosen === null;
              const flagged = state.flagged[index];

              return (
                <li key={question.id}>
                  <article
                    className={`flex gap-4 rounded-2xl bg-white p-4 shadow-card ring-1 md:p-5 ${
                      correct ? "ring-success/25" : "ring-line"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[0.8125rem] font-bold ${
                        correct
                          ? "bg-success-soft text-success"
                          : unanswered
                            ? "bg-page text-muted"
                            : "bg-red-50 text-red-600"
                      }`}
                    >
                      {correct ? "✓" : unanswered ? "–" : "✗"}
                    </span>

                    <div className="flex min-w-0 flex-1 flex-col gap-3">
                      <p lang={lang} className="text-[0.9375rem] font-semibold leading-[1.6] text-ink">
                        <span className="mr-1.5 text-muted">{`${index + 1}.`}</span>
                        {question[medium].question}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 text-[0.8125rem] font-semibold">
                        <span
                          lang={lang}
                          className={`rounded-lg px-2.5 py-1 ${
                            correct
                              ? "bg-success-soft text-success"
                              : unanswered
                                ? "bg-page text-muted"
                                : "bg-red-50 text-red-700"
                          }`}
                        >
                          {`${t.yourAnswer}: ${unanswered ? t.notAnswered : LETTERS[chosen]}`}
                        </span>
                        {!correct && (
                          <span lang={lang} className="rounded-lg bg-success-soft px-2.5 py-1 text-success">
                            {`${t.correctAnswer}: ${LETTERS[question.answer]}`}
                          </span>
                        )}
                        {flagged && (
                          <span lang={lang} className="rounded-lg bg-gold-soft px-2.5 py-1 text-gold-ink">
                            {`⚑ ${t.flaggedNote}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
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

  const lowTime = timeLeft <= 5 * 60 * 1000;

  return (
    <section className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-[0_30px_60px_-36px_rgba(16,27,48,0.35)] ring-1 ring-line md:p-6">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-gold via-gold-dark to-gold-deep"
      />

      <div className="flex flex-col gap-4 border-b border-line pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p lang={lang} className="flex items-baseline gap-2 text-ink">
            <span className="text-[0.75rem] font-bold uppercase tracking-[0.14em] text-muted">{t.progress}</span>
            <span className="text-[1.5rem] font-extrabold tabular-nums tracking-[-0.02em]">{state.current + 1}</span>
            <span className="text-[0.9375rem] font-semibold text-muted">/ {QUESTION_COUNT}</span>
          </p>
          <span
            lang={lang}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.875rem] font-bold tabular-nums ring-1 ${
              lowTime ? "bg-red-50 text-red-600 ring-red-200" : "bg-ink text-white ring-ink"
            }`}
          >
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${lowTime ? "bg-red-500" : "bg-gold"}`} />
            {`${t.timeLeft}: ${formatTime(timeLeft)}`}
          </span>
        </div>

        {/* One button per question. Answered, flagged and open questions look different, and a click jumps to a question. */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t.progress}>
            {Array.from({ length: QUESTION_COUNT }, (_, index) => {
              const answered = state.chosen[index] !== null;
              const flaggedHere = state.flagged[index];
              const isCurrent = index === state.current;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label={`${t.questionNumber} ${index + 1}${flaggedHere ? `, ${t.legendFlagged}` : ""}${answered ? `, ${t.legendAnswered}` : ""}`}
                  aria-current={isCurrent ? "step" : undefined}
                  className={`relative grid h-8 w-8 place-items-center rounded-lg text-[0.75rem] font-bold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark ${
                    flaggedHere
                      ? "bg-gold text-ink shadow-[0_6px_14px_-8px_rgba(232,164,0,0.9)]"
                      : answered
                        ? "bg-ink text-white"
                        : "bg-page text-muted ring-1 ring-line hover:bg-gold-soft hover:text-ink"
                  } ${isCurrent ? "ring-2 ring-gold-dark ring-offset-2 ring-offset-white" : ""}`}
                >
                  {index + 1}
                  {flaggedHere && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-1 -top-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-red-500 text-[0.5rem] text-white ring-2 ring-white"
                    >
                      ⚑
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div lang={lang} className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[0.75rem] font-semibold text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-ink" aria-hidden="true" />
              {t.legendAnswered}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-gold" aria-hidden="true" />
              {t.legendFlagged}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-page ring-1 ring-line" aria-hidden="true" />
              {t.legendOpen}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            lang={lang}
            className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-gold-ink ring-1 ring-gold/30"
          >
            {question.kind === "sign" ? t.signTag : t.ruleTag}
          </span>
          {flagged && (
            <span lang={lang} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-white">
              ⚑ {t.flaggedNote}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <p lang={lang} className="text-[1.125rem] font-semibold leading-[1.65] text-ink md:text-[1.25rem]">
            {content.question}
          </p>
          {question.image && (
            <div className="flex shrink-0 items-center justify-center self-center rounded-2xl bg-gradient-to-br from-page to-white p-3 ring-1 ring-line md:self-start">
              <Image src={question.image} alt="" width={260} height={260} className="h-28 w-28 object-contain md:h-32 md:w-32" />
            </div>
          )}
        </div>

        <ul className="grid gap-2.5">
          {content.options.map((option, optionIndex) => {
            const isChosen = selectedOption === optionIndex;
            return (
              <li key={optionIndex}>
                <button
                  type="button"
                  onClick={() => pick(optionIndex)}
                  aria-pressed={isChosen}
                  lang={lang}
                  className={`group flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left text-[0.9375rem] leading-[1.5] text-ink ring-1 transition-all duration-200 hover:-translate-y-px hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark ${
                    isChosen
                      ? "bg-gold-soft ring-2 ring-gold-dark shadow-[0_12px_26px_-16px_rgba(232,164,0,0.9)]"
                      : "bg-white ring-line hover:ring-gold-dark"
                  }`}
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[0.875rem] font-bold transition-colors ${
                      isChosen ? "bg-ink text-gold" : "bg-page text-ink group-hover:bg-gold-soft"
                    }`}
                  >
                    {LETTERS[optionIndex]}
                  </span>
                  <span className="min-w-0 flex-1">{option}</span>
                  {isChosen && (
                    <span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-[0.75rem] text-gold">
                      ✓
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 md:flex-row md:items-center md:justify-between">
        <button
          type="button"
          onClick={toggleFlag}
          aria-pressed={flagged}
          lang={lang}
          className={`inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-[0.875rem] font-semibold ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark ${
            flagged ? "bg-gold-soft text-gold-ink ring-gold-dark" : "bg-white text-ink ring-line hover:bg-page"
          }`}
        >
          <span aria-hidden="true">⚑</span>
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
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-7 py-3.5 text-[0.9375rem] font-bold text-white shadow-[0_14px_28px_-14px_rgba(16,27,48,0.7)] transition-all hover:-translate-y-px hover:bg-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark disabled:cursor-not-allowed disabled:bg-page disabled:text-muted disabled:shadow-none disabled:hover:translate-y-0 md:w-auto"
          >
            {isLast ? t.finish : t.next}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </section>
  );
}
