import Image from "next/image";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { Container, Eyebrow } from "./primitives";

const stats = [
  { value: "98%", label: "Pass rate", sub: "Recent students" },
  { value: "15k+", label: "Students", sub: "Trained to date" },
  { value: "100%", label: "Certified", sub: "Approved instructors" },
];

export default function Hero() {
  return (
    <section id="home" className="pt-10 pb-6 md:pt-14">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-[clamp(32px,4vw,72px)]">
          {/* Copy */}
          <div className="flex flex-col items-start">
            <span className="inline-flex items-center gap-2 rounded-full bg-gold-soft px-3.5 py-1.5 ring-1 ring-gold/60">
              <Icon name="badge-check" className="h-4 w-4 text-gold-ink" />
              <Eyebrow className="mb-0">DMT Approved · Trusted Instructors</Eyebrow>
            </span>

            <h1 className="mt-6 text-[2.75rem] font-bold leading-[1.05] tracking-[-0.03em] text-ink md:text-[clamp(44px,4vw,68px)]">
              Drive With
              <br />
              Confidence.
            </h1>

            <p className="mt-4 text-[1.25rem] font-semibold text-gold-ink md:text-[1.375rem]">
              Learn Today. Drive Tomorrow.
            </p>

            <p className="mt-5 max-w-[500px] text-[0.9375rem] leading-[1.7] text-muted">
              Government approved driver education with a structured curriculum, patient instructors and
              modern dual-control vehicles. A clear, supportive path to your Sri Lankan driving licence.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/packages"
                className="inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3.5 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] transition-colors hover:bg-gold-dark"
              >
                Explore Packages
                <Icon name="arrow-right" className="h-4 w-4" strokeWidth={2} />
              </Link>
            </div>

            <p className="mt-6 flex items-center gap-2 text-[0.8125rem] text-muted">
              <Icon name="shield-check" className="h-4 w-4 text-success" />
              Government approved · Registered with DMT Sri Lanka
            </p>
          </div>

          {/* Visual */}
          <div className="flex flex-col gap-4">
            <div className="relative aspect-[590/430] overflow-hidden rounded-[28px] border border-white/70 shadow-[0_20px_50px_-20px_rgb(40_60_90/0.25)]">
              <Image
                src="/images/hero-instructors.jpg"
                alt="Riyona instructor teaching a student from the back seat of a dual-control car"
                fill
                priority
                sizes="(min-width: 1024px) 590px, 100vw"
                className="object-cover"
              />
              <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[0.75rem] font-semibold text-ink shadow-card backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-success" />
                Learn &amp; Practise · Drive
              </span>
            </div>

            <div className="glass grid grid-cols-3 divide-x divide-white/60 overflow-hidden rounded-2xl">
              {stats.map((s) => (
                <div key={s.label} className="px-5 py-4">
                  <p className="text-[1.5rem] font-bold tracking-[-0.02em] text-ink">{s.value}</p>
                  <p className="text-[0.8125rem] font-semibold text-ink">{s.label}</p>
                  <p className="text-[0.75rem] text-muted">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
