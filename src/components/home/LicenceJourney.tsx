import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import SectionHeader from "@/components/ui/SectionHeader";
import { licenceSteps } from "@/data/home";

export default function LicenceJourney() {
  return (
    <section id="journey" className="glow-journey pb-16 md:pb-24">
      <div className="max-w-[1240px] mx-auto px-6 pt-10 md:pt-16">
        <SectionHeader
          layout="centered"
          eyebrow="Sri Lanka · Step-by-Step Process"
          title="Your Journey to a Driving Licence in Sri Lanka."
          description="From medical clearance through the final Werahera trial, Riyona accompanies you every step of the way."
        />

        <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {licenceSteps.map((step) => (
            <li
              key={step.number}
              className="relative flex flex-col rounded-2xl bg-white p-6 shadow-card"
            >
              <div className="flex items-start justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gold text-sm font-bold text-ink">
                  {step.number}
                </span>
                <Icon name={step.icon} className="w-5 h-5 text-muted/70" />
              </div>

              <h3 className="mt-6 text-[1.0625rem] font-semibold tracking-[-0.01em] text-ink">{step.title}</h3>
              <p className="mt-3 text-[0.8125rem] leading-relaxed text-muted">{step.description}</p>

              <div className="mt-auto pt-6">
                <div className="border-t border-line pt-4">
                  <p className="text-xs font-semibold text-success">{step.status}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        {/* Guidance bar */}
        <div className="mt-5 flex flex-col gap-5 rounded-2xl bg-white px-6 py-5 shadow-card md:flex-row md:items-center md:justify-between md:gap-8">
          <p className="flex items-start gap-3 text-[0.8125rem] leading-relaxed text-muted">
            <Icon name="info" className="mt-px w-4 h-4 shrink-0 text-muted/70" />
            Our staff assists with paperwork and scheduling, keeping you up to date with government requirements.
            Contact us for guidance and specific timelines.
          </p>

          <Button href="#contact" variant="white" size="md" icon="arrow-up-right" className="shrink-0">
            Read Full Journey Guide
          </Button>
        </div>
      </div>
    </section>
  );
}
