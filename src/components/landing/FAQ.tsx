import Icon from "@/components/ui/Icon";
import { faqs, site } from "@/data/landing";
import { Container, Eyebrow, Surface } from "./primitives";

/** Split layout: heading and help on the left, accordion on the right. Uses native <details>, so no client JS. */
export default function FAQ() {
  return (
    <section id="faq" className="pt-14 pb-14 md:pt-[clamp(72px,8vw,136px)] md:pb-[clamp(72px,8vw,136px)]">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <Eyebrow>Help Centre</Eyebrow>
            <h2 className="mt-3 text-[1.75rem] font-bold leading-[1.15] tracking-[-0.02em] text-ink md:text-[clamp(1.875rem,2.5vw,2.75rem)]">
              A little clarity before your first drive.
            </h2>
            <p className="mt-4 max-w-[400px] text-[0.9375rem] leading-[1.7] text-muted">
              Still have questions about licence classes, transmissions or the DMT process? Talk to Riyona.
            </p>
            <a
              href={site.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-[0.875rem] font-semibold text-ink shadow-card ring-1 ring-line transition-colors hover:text-gold-ink"
            >
              <Icon name="chat" className="h-4 w-4" />
              Ask on WhatsApp
            </a>
          </div>

          <div className="flex flex-col gap-3">
            {faqs.map((item) => (
              <Surface key={item.q} className="overflow-hidden p-0">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-[0.9375rem] font-semibold text-ink">
                    {item.q}
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-page text-ink transition-transform duration-200 group-open:rotate-45">
                      <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </span>
                  </summary>
                  <p className="px-6 pb-5 text-[0.875rem] leading-[1.7] text-muted">{item.a}</p>
                </details>
              </Surface>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
