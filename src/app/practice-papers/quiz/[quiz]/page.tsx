import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PracticeQuizRunner from "@/components/public/PracticeQuizRunner";
import PublicFrame from "@/components/public/PublicFrame";
import { Container } from "@/components/landing/primitives";
import DocumentCard from "@/components/public/DocumentCard";
import { PRACTICE_QUIZZES } from "@/data/practice-quizzes";

export const metadata: Metadata = {
  title: "Practice Quiz | Riyona Driving School",
  description:
    "A timed practice quiz for the driving licence written test in Sri Lanka, from Riyona Driving School.",
};

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

          <DocumentCard
            icon={<span className="text-[0.9375rem] font-extrabold">{index + 1}</span>}
            title="Driving licence written test"
            meta={`Practice quiz ${index + 1} · 40 questions · 1 hour`}
          />

          <PracticeQuizRunner quizIndex={index} medium={medium} />
        </div>
      </Container>
    </PublicFrame>
  );
}
