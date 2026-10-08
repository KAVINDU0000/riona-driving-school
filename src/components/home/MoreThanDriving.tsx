import Image from "next/image";
import Icon from "@/components/ui/Icon";
import { drivingStages } from "@/data/home";

export default function MoreThanDriving() {
  return (
    <section id="about" className="pb-16 md:pb-24">
      <div className="max-w-[1240px] mx-auto px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:items-start">
          {/* Narrative + stage list */}
          <div>
            <p className="eyebrow">Beyond The Cockpit</p>
            <h2 className="mt-4 text-[2rem] md:text-[2.75rem] font-bold leading-[1.12] tracking-[-0.025em] text-ink">
              More Than A Driving Lesson.
            </h2>
            <p className="mt-6 max-w-[34rem] text-[0.9375rem] leading-relaxed text-muted">
              We cultivate calm, proactive driving habits. Beyond acing the test at Werahera, we ensure you can safely
              navigate Colombo&rsquo;s narrow downtown streets, three-wheel traffic, and unpredictable highway
              conditions with absolute poise.
            </p>

            <ol className="mt-10 space-y-7">
              {drivingStages.map((stage, i) => {
                const first = i === 0;
                const last = i === drivingStages.length - 1;

                return (
                  <li key={stage.number} className="relative flex gap-5">
                    {/* Marker + connector */}
                    <div className="relative flex flex-col items-center">
                      <span
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold ${
                          first ? "bg-gold text-ink" : "bg-white text-muted ring-1 ring-line"
                        }`}
                      >
                        {stage.number}
                      </span>
                      {!last && (
                        <span
                          aria-hidden="true"
                          className={`mt-1 w-px flex-1 ${first ? "bg-gold" : "bg-line"}`}
                        />
                      )}
                    </div>

                    <div className={last ? "" : "pb-1"}>
                      <h3 className="text-[1.0625rem] font-semibold tracking-[-0.01em] text-ink">{stage.title}</h3>
                      <p className="mt-2 max-w-[29rem] text-[0.8125rem] leading-relaxed text-muted">
                        {stage.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Media card */}
          <div className="rounded-2xl bg-white p-3 shadow-float lg:sticky lg:top-28">
            <div className="relative aspect-square overflow-hidden rounded-xl bg-page">
              <Image
                src="/images/more-than-driving.jpg"
                alt="Instructor guiding a learner's hands on the steering wheel during a lesson"
                fill
                sizes="(max-width: 1024px) 100vw, 560px"
                className="object-cover"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 px-3 pb-2 pt-5">
              <div>
                <p className="text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink">Learn • Practise • Drive</p>
                <p className="mt-1.5 text-xs text-muted">Personal attention. Real-world confidence.</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-success/35 px-3.5 py-2 text-xs font-semibold text-success">
                <Icon name="check-circle" className="w-4 h-4" strokeWidth={1.8} />
                DMT Test Ready
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
