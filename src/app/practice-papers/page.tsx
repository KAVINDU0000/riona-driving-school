import type { Metadata } from "next";
import PageHero from "@/components/public/PageHero";
import PracticeQuizzes from "@/components/public/PracticeQuizzes";
import PublicFrame from "@/components/public/PublicFrame";
import { Container, Surface } from "@/components/landing/primitives";
import Icon from "@/components/ui/Icon";

export const metadata: Metadata = {
  title: "Practice Papers | Riyona Driving School",
  description:
    "Practice quizzes and a past paper for the driving licence written test in Sri Lanka, from Riyona Driving School.",
};

const PAPER_PATH = "/practice-papers/driving-licence-past-paper.pdf";

const GOLD_BUTTON =
  "inline-flex items-center justify-center rounded-xl bg-gold px-5 py-3 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark";

const WHITE_BUTTON =
  "inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-[0.9375rem] font-semibold text-ink ring-1 ring-line hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark";

const SECTION_LABEL =
  "text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-gold-ink";

export default function PracticePapersPage() {
  return (
    <PublicFrame>
      <PageHero
        eyebrow="Practice papers"
        title="Practice the written test"
        description="Take a timed quiz, or read the past paper. Answer each question, then check your mark at the end."
        actions={
          <>
            <a href={PAPER_PATH} download className={GOLD_BUTTON}>
              Download paper
            </a>
            <a
              href={PAPER_PATH}
              target="_blank"
              rel="noopener noreferrer"
              className={WHITE_BUTTON}
            >
              Open in new tab
            </a>
          </>
        }
      />

      <Container>
        <section
          id="quizzes"
          aria-labelledby="quiz-heading"
          className="mt-12 scroll-mt-28"
        >
          <div className="flex flex-col gap-3">
            <p className={SECTION_LABEL}>Practice quizzes</p>
            <h2
              id="quiz-heading"
              className="text-[1.75rem] font-bold tracking-[-0.02em] text-ink md:text-[2.25rem]"
            >
              Three timed quizzes of 40 questions
            </h2>
          </div>
          <div className="mt-10">
            <PracticeQuizzes />
          </div>
        </section>

        <section aria-labelledby="paper-heading" className="mt-20 pb-8">
          <div className="flex flex-col gap-3">
            <p className={SECTION_LABEL}>Past paper</p>
            <h2
              id="paper-heading"
              className="text-[1.75rem] font-bold tracking-[-0.02em] text-ink md:text-[2.25rem]"
            >
              Driving licence examination past paper
            </h2>
          </div>
          <div className="mt-6 flex items-start gap-3">
            <Icon
              name="info"
              className="mt-0.5 h-5 w-5 shrink-0 text-gold-ink"
            />
            <p className="text-[0.9375rem] leading-[1.7] text-muted">
              Each question has four options. This paper does not include an
              answer key. Check your answers against the Road Signs and Road
              Rules pages, and against the current rules from the Department of
              Motor Traffic (DMT).
            </p>
          </div>

          <Surface
            lift
            className="mx-auto mt-8 max-w-3xl overflow-hidden p-2 md:p-3"
          >
            <iframe
              src={PAPER_PATH}
              title="Driving licence examination past paper"
              className="h-[min(58vh,560px)] min-h-[380px] w-full rounded-xl border border-line bg-white"
            />
          </Surface>
          <p className="mx-auto mt-4 max-w-3xl text-center text-[0.8125rem] text-muted">
            If the paper does not show here, use the download button above.
          </p>
        </section>
      </Container>
    </PublicFrame>
  );
}
