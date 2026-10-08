import Icon from "@/components/ui/Icon";
import { testimonials } from "@/data/landing";
import { Container, Eyebrow, Surface } from "./primitives";

export default function Testimonials() {
  return (
    <section className="py-14 md:py-20">
      <Container>
        <div className="mb-10 grid gap-6 md:mb-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-end">
          <div>
            <Eyebrow>Verified Reviews from Students</Eyebrow>
            <h2 className="mt-3 text-[1.75rem] font-bold leading-[1.15] tracking-[-0.02em] text-ink md:text-[2.25rem]">
              What Our Students Say.
            </h2>
          </div>
          <p className="text-[0.9375rem] leading-[1.7] text-muted">
            Reviews from learners across Colombo and the Western Province who trusted Riyona with their first drives.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {testimonials.map((t) => (
            <Surface key={t.name} className="flex flex-col gap-4 p-6">
              <div className="flex gap-0.5 text-gold-dark" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} viewBox="0 0 20 20" className="h-4 w-4 fill-current" aria-hidden="true">
                    <path d="m10 1.6 2.6 5.4 5.9.8-4.3 4.1 1 5.8L10 14.9l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8Z" />
                  </svg>
                ))}
              </div>
              <p className="text-[0.9375rem] leading-[1.7] text-ink">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-auto flex items-center gap-3 border-t border-line pt-4">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gold-soft text-[0.8125rem] font-bold text-gold-ink">
                  {t.initials}
                </span>
                <div className="flex-1">
                  <p className="text-[0.875rem] font-bold text-ink">{t.name}</p>
                  <p className="text-[0.75rem] text-muted">{t.role}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-[0.6875rem] font-bold text-success">
                  <Icon name="check" className="h-3 w-3" strokeWidth={2.6} />
                  DMT Verified
                </span>
              </div>
            </Surface>
          ))}
        </div>
      </Container>
    </section>
  );
}
