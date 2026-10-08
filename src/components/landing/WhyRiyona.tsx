import Icon from "@/components/ui/Icon";
import { whyCards } from "@/data/landing";
import { Container, Eyebrow, IconTile, Surface } from "./primitives";

export default function WhyRiyona() {
  return (
    <section className="py-14 md:py-20">
      <Container>
        <div className="mb-10 grid gap-6 md:mb-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-end">
          <div>
            <Eyebrow>The Riyona Experience</Eyebrow>
            <h2 className="mt-3 text-[1.75rem] font-bold leading-[1.15] tracking-[-0.02em] text-ink md:text-[2.25rem]">
              Why Choose Riyona Driving Academy
            </h2>
          </div>
          <p className="text-[0.9375rem] leading-[1.7] text-muted">
            Over 25 cumulative years of training legacy across Colombo and the Western Province. Built on proven
            safety practices and exceptional learner outcomes.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {whyCards.map((card, i) => (
            <Surface key={card.title} className="flex flex-col gap-4 p-6">
              <div className="flex items-start justify-between">
                <IconTile>
                  <Icon name={card.icon} className="h-5 w-5" />
                </IconTile>
                <span className="text-[0.75rem] font-semibold text-muted">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="text-[1.0625rem] font-bold leading-[1.3] text-ink">{card.title}</h3>
              <p className="text-[0.875rem] leading-[1.65] text-muted">{card.body}</p>
              <p className="mt-auto border-t border-line pt-4 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-gold-ink">
                {card.tag}
              </p>
            </Surface>
          ))}
        </div>
      </Container>
    </section>
  );
}
