import Icon from "@/components/ui/Icon";
import { licenceSteps, site } from "@/data/landing";
import { Container, Eyebrow, Surface } from "./primitives";

const stepIcons = ["heart-pulse", "file-check", "car", "badge-check"];

export default function LicenceJourney() {
  return (
    <section className="pt-14 md:pt-[clamp(72px,8vw,136px)]">
      <Container>
        <div className="mb-10 text-center md:mb-12">
          <Eyebrow>Sri Lanka · DMT Pathway</Eyebrow>
          <h2 className="mt-3 text-[1.75rem] font-bold leading-[1.15] tracking-[-0.02em] text-ink md:text-[clamp(1.875rem,2.5vw,2.75rem)]">
            Your Journey to a Driving Licence in Sri Lanka.
          </h2>
          <p className="mx-auto mt-3 max-w-[560px] text-[0.9375rem] leading-[1.7] text-muted">
            From medical clearance through the final road test, we guide you through every step.
          </p>
        </div>

        <div className="relative grid gap-[clamp(16px,1.5vw,28px)] md:grid-cols-2 xl:grid-cols-4">
          {/* Connecting line behind the number circles */}
          <div className="absolute left-[12%] right-[12%] top-[34px] hidden h-px bg-gradient-to-r from-transparent via-line to-transparent xl:block" />

          {licenceSteps.map((step, i) => (
            <Surface key={step.n} className="relative flex flex-col gap-4 p-6">
              <div className="flex items-center justify-between">
                <span
                  className={`grid h-9 w-9 place-items-center rounded-full text-[0.8125rem] font-bold ring-4 ring-page ${
                    i === 0 ? "bg-gold text-ink" : "bg-white text-ink ring-1 ring-line"
                  }`}
                >
                  {step.n}
                </span>
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-page text-muted">
                  <Icon name={stepIcons[i]} className="h-[18px] w-[18px]" />
                </span>
              </div>
              <h3 className="text-[1.0625rem] font-bold text-ink">{step.title}</h3>
              <p className="text-[0.875rem] leading-[1.6] text-muted">{step.body}</p>
              <p className="mt-auto border-t border-line pt-3 text-[0.75rem] font-semibold text-gold-ink">{step.note}</p>
            </Surface>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-gold/40 bg-gold-soft/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-3 text-[0.875rem] text-ink">
            <Icon name="info" className="h-5 w-5 shrink-0 text-gold-ink" />
            Fees and schedules change with official DMT notices. Confirm current requirements with our team before
            you enrol.
          </p>
          <a
            href={site.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[0.8125rem] font-semibold text-ink shadow-card ring-1 ring-line hover:text-gold-ink"
          >
            Ask on WhatsApp
            <Icon name="arrow-up-right" className="h-3.5 w-3.5" strokeWidth={2} />
          </a>
        </div>
      </Container>
    </section>
  );
}
