import Image from "next/image";
import Icon from "@/components/ui/Icon";
import { resources } from "@/data/landing";
import { Container, Eyebrow, IconTile, Surface } from "./primitives";

export default function LearningHub() {
  const { featured, side } = resources;

  return (
    <section id="learning-hub" className="py-14 md:py-20">
      <Container>
        <div className="mb-10 grid gap-6 md:mb-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-end">
          <div>
            <Eyebrow>Theory &amp; Training</Eyebrow>
            <h2 className="mt-3 text-[1.75rem] font-bold leading-[1.15] tracking-[-0.02em] text-ink md:text-[2.25rem]">
              Everything You Need to Learn.
            </h2>
          </div>
          <p className="text-[0.9375rem] leading-[1.7] text-muted">
            Access high-quality theoretical resources, official DMT test preparation materials, and practical video
            lessons from anywhere.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          {/* Featured resource */}
          <Surface className="flex flex-col overflow-hidden p-0">
            <div className="relative aspect-[16/9]">
              <Image
                src={featured.image}
                alt="Learner car on a training yard"
                fill
                sizes="(min-width: 1024px) 780px, 100vw"
                className="object-cover"
              />
              <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-ink shadow-card backdrop-blur">
                Car · Auto &amp; Manual
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-4 p-7">
              <h3 className="text-[1.375rem] font-bold leading-[1.25] text-ink">{featured.title}</h3>
              <p className="text-[0.9375rem] leading-[1.7] text-muted">{featured.body}</p>
              <a
                href="#faq"
                className="mt-auto inline-flex w-fit items-center gap-2 rounded-xl bg-gold px-5 py-3 text-[0.875rem] font-semibold text-ink transition-colors hover:bg-gold-dark"
              >
                Start Practice Paper
                <Icon name="arrow-right" className="h-4 w-4" strokeWidth={2} />
              </a>
            </div>
          </Surface>

          {/* Stacked resource cards */}
          <div className="flex flex-col gap-4">
            {side.map((item) => (
              <Surface key={item.title} className="flex flex-1 gap-4 p-6">
                <IconTile>
                  <Icon name={item.icon} className="h-5 w-5" />
                </IconTile>
                <div className="flex flex-col gap-2">
                  <h3 className="text-[1rem] font-bold text-ink">{item.title}</h3>
                  <p className="text-[0.8125rem] leading-[1.6] text-muted">{item.body}</p>
                  <a href="#faq" className="mt-1 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-gold-ink hover:text-ink">
                    {item.cta}
                    <Icon name="arrow-up-right" className="h-3.5 w-3.5" strokeWidth={2} />
                  </a>
                </div>
              </Surface>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
