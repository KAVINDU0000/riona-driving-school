import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import PracticeQuizRunner from "@/components/public/PracticeQuizRunner";
import FloatingWhatsApp from "@/components/landing/FloatingWhatsApp";
import Icon from "@/components/ui/Icon";
import { PRACTICE_QUIZZES } from "@/data/practice-quizzes";

export const metadata: Metadata = {
  title: "Practice Quiz | Riyona Driving School",
  description:
    "A timed practice quiz for the driving licence written test in Sri Lanka, from Riyona Driving School.",
};

/*
 * The quiz is a focused screen: a slim top bar and the quiz, sized to fit one window on desktop. The site's main
 * navigation and footer are left out here. The page only scrolls when the results list is longer than the window.
 */
export default async function PracticeQuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ quiz: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { quiz } = await params;
  const { lang } = await searchParams;

  const index = Number(quiz) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= PRACTICE_QUIZZES.length) {
    notFound();
  }

  const medium = lang === "si" ? "si" : "en";

  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <div className="page-atmosphere" aria-hidden="true" />

      <header className="shrink-0 px-4 pt-5 md:px-8">
        <div className="glass flex h-[88px] items-center justify-between gap-4 rounded-[18px] px-5 shadow-[0_12px_40px_-16px_rgb(40_60_90/0.16)] backdrop-blur-2xl">
        <Link
          href="/practice-papers#quizzes"
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.875rem] font-semibold text-ink-soft ring-1 ring-line transition-colors hover:bg-page hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
        >
          <Icon name="arrow-left" className="h-3.5 w-3.5" strokeWidth={2} />
          Back to quizzes
        </Link>

        <div className="flex min-w-0 items-center gap-3">
          <span className="relative hidden h-9 w-9 shrink-0 sm:block">
            <Image src="/images/logo-riyona.jpg" alt="Riyona Driving School logo" fill sizes="36px" className="rounded-full object-cover" />
          </span>
          <div className="min-w-0 text-right">
            <p className="truncate text-[0.875rem] font-bold text-ink">Driving licence written test</p>
            <p className="truncate text-[0.75rem] text-muted">{`Quiz ${index + 1} · 40 questions · 1 hour`}</p>
          </div>
        </div>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center p-3 md:p-5">
        <div className="w-full max-w-4xl">
          <PracticeQuizRunner quizIndex={index} medium={medium} />
        </div>
      </main>

      <FloatingWhatsApp />
    </div>
  );
}
