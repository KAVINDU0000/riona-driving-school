import Image from "next/image";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { heroStats, site } from "@/data/home";

export default function Hero() {
  return (
    <section id="home" className="glow-hero relative pt-14 pb-10 md:pt-20 md:pb-14">
      <div className="max-w-[1240px] mx-auto px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:items-center">
          {/* Copy */}
          <div className="animate-fadeUp">
            <span className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3.5 py-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-success">
              <Icon name="check-circle" className="w-4 h-4" strokeWidth={1.8} />
              DMT Approved · Trusted Instructors
            </span>

            <h1 className="mt-6 text-[2.75rem] sm:text-[3.5rem] lg:text-[4.25rem] font-bold leading-[1.04] tracking-[-0.035em] text-ink">
              Drive With
              <br />
              Confidence<span className="text-gold-dark">.</span>
            </h1>

            <p className="mt-6 text-[1.375rem] md:text-[1.625rem] font-medium tracking-[-0.02em] text-ink">
              Learn Today. <span className="text-gold-ink">Drive Tomorrow.</span>
            </p>

            <p className="mt-5 max-w-[30rem] text-[0.9375rem] leading-relaxed text-muted">
              Government approved driver education with practical lessons, experienced instructors, and patient
              coaching. A clear, supportive path to your Sri Lankan driving licence.
            </p>

            <div className="mt-8">
              <Button href="#lessons" size="lg" icon="arrow-up-right">
                Explore Packages
              </Button>
            </div>

            <p className="mt-7 flex items-center gap-2 text-xs font-medium text-muted">
              <Icon name="shield-check" className="w-4 h-4 text-success" />
              Government Approved • Reg {site.registration}
            </p>
          </div>

          {/* Media + stats card */}
          <div className="animate-fadeUp rounded-2xl bg-white p-3 shadow-float">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-page">
              <Image
                src="/images/hero-driving.jpg"
                alt="A Riyona instructor coaching a learner driver in a dual-control car"
                fill
                sizes="(max-width: 1024px) 100vw, 620px"
                className="object-cover"
                preload
              />
              <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-gold-soft px-3.5 py-2 text-xs font-semibold text-ink shadow-sm">
                <Icon name="sparkle" className="w-3.5 h-3.5 text-gold-deep" strokeWidth={1.8} />
                Learn • Practise • Drive
              </span>
            </div>

            <div className="px-3 pb-2 pt-5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-ink">
                  Calm. Safe. Skilled. Drivers.
                </p>
                <p className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-success whitespace-nowrap">
                  DMT Certified
                </p>
              </div>

              <dl className="mt-5 grid grid-cols-3 gap-4">
                {heroStats.map((stat) => (
                  <div key={stat.label}>
                    <dd className="text-[2.25rem] font-bold leading-none tracking-[-0.03em] text-ink">
                      {stat.value}
                    </dd>
                    <dt className="mt-2 text-xs text-muted">{stat.label}</dt>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
