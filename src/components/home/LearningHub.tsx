import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import SectionHeader from "@/components/ui/SectionHeader";
import { examPractice, learningResources } from "@/data/home";

export default function LearningHub() {
  return (
    <section id="learning-hub" className="pb-16 md:pb-24">
      <div className="max-w-[1240px] mx-auto px-6">
        <SectionHeader
          eyebrow="Theory & The Road"
          title="Everything You Need to Learn."
          description="Access high-quality theoretical resources, official DMT test preparation materials, and practical video lessons from anywhere."
        />

        <div className="mt-12 grid gap-5 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          {/* Featured: mock exam practice */}
          <div className="rounded-2xl bg-white p-8 shadow-card md:p-9">
            <span className="inline-flex items-center gap-2 rounded-full bg-gold-soft px-3 py-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gold-ink">
              <Icon name="book" className="w-3.5 h-3.5" strokeWidth={1.8} />
              {examPractice.badge}
            </span>

            <h3 className="mt-6 text-[1.625rem] md:text-[2rem] font-bold leading-tight tracking-[-0.025em] text-ink">
              {examPractice.title}
            </h3>
            <p className="mt-4 text-[0.875rem] leading-relaxed text-muted">{examPractice.description}</p>

            {/* Readiness meter */}
            <div className="mt-8 rounded-xl bg-page p-5">
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-[0.8125rem] font-medium text-ink">{examPractice.thresholdLabel}</p>
                <p className="text-lg font-bold tracking-[-0.02em] text-success">{examPractice.score}</p>
              </div>

              <div
                className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white"
                role="meter"
                aria-valuenow={examPractice.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={examPractice.thresholdLabel}
              >
                <div className="h-full rounded-full bg-success" style={{ width: `${examPractice.percent}%` }} />
              </div>

              <p className="mt-3 text-[0.6875rem] text-muted">
                {examPractice.percent}% · {examPractice.progressNote}
              </p>
            </div>

            <ul className="mt-6 flex flex-wrap gap-2">
              {examPractice.languages.map((language) => (
                <li
                  key={language}
                  className="rounded-full bg-page px-3.5 py-1.5 text-xs font-medium text-muted ring-1 ring-line"
                >
                  {language}
                </li>
              ))}
            </ul>

            <div className="mt-7">
              <Button href="#practice" size="lg" icon="external-link">
                {examPractice.cta}
              </Button>
            </div>

            <p className="mt-4 text-[0.6875rem] text-muted">{examPractice.footnote}</p>
          </div>

          {/* Supporting resources */}
          <div className="grid gap-5">
            {learningResources.map((resource) => (
              <article key={resource.id} className="rounded-2xl bg-white p-7 shadow-card">
                <div className="flex items-center gap-3.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-deep">
                    <Icon name={resource.icon} className="w-5 h-5" />
                  </span>
                  <h3 className="text-[1.0625rem] font-semibold tracking-[-0.01em] text-ink">{resource.title}</h3>
                </div>

                <p className="mt-4 text-[0.8125rem] leading-relaxed text-muted">{resource.description}</p>

                <a
                  href={resource.href}
                  className="mt-5 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-gold-ink hover:text-gold-deep transition-colors"
                >
                  {resource.cta}
                  <Icon name="arrow-up-right" className="w-3.5 h-3.5" strokeWidth={2} />
                </a>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
