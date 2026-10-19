import type { Metadata } from "next";
import PageHero from "@/components/public/PageHero";
import PracticeQuizzes from "@/components/public/PracticeQuizzes";
import PublicFrame from "@/components/public/PublicFrame";
import { Container } from "@/components/landing/primitives";
import DocumentCard, {
  CARD_BUTTON_OUTLINE,
  CARD_BUTTON_SOLID,
} from "@/components/public/DocumentCard";
import PaperViewer from "@/components/public/PaperViewer";
import Icon from "@/components/ui/Icon";

export const metadata: Metadata = {
  title: "Practice Papers | Riyona Driving School",
  description:
    "Practice quizzes and a past paper for the driving licence written test in Sri Lanka, from Riyona Driving School.",
};

// Watermarked copy with the school logo on every page. The original PDF is kept unchanged.
const PAPER_PATH = "/practice-papers/driving-licence-past-paper-watermarked.pdf";
// Page images rendered from the watermarked PDF, shown by PaperViewer.
const PAPER_PAGES_PATH = "/practice-papers/pages";
const PAPER_PAGE_COUNT = 27;

const SECTION_LABEL =
  "text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-gold-ink";

export default function PracticePapersPage() {
  return (
    <PublicFrame>
      <PageHero
        eyebrow="Practice papers"
        title="Practice the written test"
        description="Take a timed quiz, or read the past paper. Answer each question, then check your mark at the end."
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

          <div className="mt-8">
            <DocumentCard
              icon={<Icon name="book" className="h-5 w-5" />}
              title="Driving licence past paper"
              meta={`${PAPER_PAGE_COUNT} pages · Riyona Driving School`}
              actions={
                <>
                  <a
                    href={PAPER_PATH}
                    target="_blank"
                    rel="noopener"
                    className={CARD_BUTTON_OUTLINE}
                  >
                    Open full screen
                    <Icon name="external-link" className="h-3.5 w-3.5" />
                  </a>
                  <a
                    href={PAPER_PATH}
                    download="Riyona-driving-licence-past-paper.pdf"
                    className={CARD_BUTTON_SOLID}
                  >
                    Download PDF
                  </a>
                </>
              }
            >
              <PaperViewer
                basePath={PAPER_PAGES_PATH}
                pageCount={PAPER_PAGE_COUNT}
                title="Driving licence examination past paper"
              />
            </DocumentCard>
          </div>
        </section>
      </Container>
    </PublicFrame>
  );
}
