import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PracticeQuizRunner from "@/components/public/PracticeQuizRunner";
import PublicFrame from "@/components/public/PublicFrame";
import { Container } from "@/components/landing/primitives";
import { PRACTICE_QUIZZES } from "@/data/practice-quizzes";

export const metadata: Metadata = {
  title: "Practice Quiz | Riyona Driving School",
  description:
    "A timed practice quiz for the driving licence written test in Sri Lanka, from Riyona Driving School.",
};

const SECTION_LABEL =
  "text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-gold-ink";

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
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= PRACTICE_QUIZZES.length
  ) {
    notFound();
  }

  const medium = lang === "si" ? "si" : "en";

  return (
    <PublicFrame>
      <Container>
        <div className="flex flex-col gap-8 pb-20 pt-12">
          <Link
            href="/practice-papers#quizzes"
            className="inline-flex w-fit items-center gap-2 text-[0.875rem] font-semibold text-gold-ink hover:text-ink"
          >
            ← Back to quizzes
          </Link>

          <div className="flex flex-col gap-3">
            <p className={SECTION_LABEL}>{`Practice quiz ${index + 1}`}</p>
            <h1 className="text-[1.75rem] font-bold tracking-[-0.02em] text-ink md:text-[2.25rem]">
              Driving licence written test
            </h1>
          </div>

          <PracticeQuizRunner quizIndex={index} medium={medium} />
        </div>
      </Container>
    </PublicFrame>
  );
}
