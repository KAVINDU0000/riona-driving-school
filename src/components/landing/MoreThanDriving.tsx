import Image from "next/image";
import { learningStages } from "@/data/landing";
import { Container, Eyebrow, Surface } from "./primitives";

export default function MoreThanDriving() {
  return (
    <section id="about" className="pt-14 md:pt-[clamp(72px,8vw,136px)]">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Eyebrow>Before the Cockpit</Eyebrow>
            <h2 className="mt-3 text-[1.75rem] font-bold leading-[1.15] tracking-[-0.02em] text-ink md:text-[clamp(1.875rem,2.5vw,2.75rem)]">
              More Than A Driving Lesson.
            </h2>
            <p className="mt-4 max-w-[520px] text-[0.9375rem] leading-[1.7] text-muted">
              We cultivate calm, proactive driving habits. Beyond acing the test at Werahera, we ensure you
              navigate Colombo&apos;s intense downtown streets, three-wheeler traffic and highway conditions with
              complete control.
            </p>

            <ol className="mt-8 space-y-3">
              {learningStages.map((stage, i) => (
                <li key={stage.title}>
                  <Surface lift className="flex gap-4 p-4">
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[0.8125rem] font-bold ${
                        i === 0 ? "bg-gold text-ink" : "bg-page text-muted ring-1 ring-line"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="text-[0.9375rem] font-bold text-ink">{stage.title}</p>
                      <p className="mt-1 text-[0.8125rem] leading-[1.6] text-muted">{stage.body}</p>
                    </div>
                  </Surface>
                </li>
              ))}
            </ol>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-[10px] shadow-float ring-1 ring-white/70">
            <Image
              src="/images/more-than-lesson.png"
              alt="Riyona instructor giving a thumbs up while a smiling student drives"
              fill
              sizes="(min-width: 1024px) 600px, 100vw"
              className="object-cover"
            />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-2xl bg-white/90 p-4 shadow-card backdrop-blur">
              <div>
                <p className="text-[0.875rem] font-bold text-ink">Learn &amp; Practise · Drive</p>
                <p className="text-[0.75rem] text-muted">Personal guidance, built around you.</p>
              </div>
              <span className="rounded-full bg-success-soft px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-wide text-success">
                DMT Ready
              </span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
