import Icon from "@/components/ui/Icon";
import SectionHeader from "@/components/ui/SectionHeader";
import { features } from "@/data/home";

export default function WhyRiyona() {
  return (
    <section className="pb-16 md:pb-24">
      <div className="max-w-[1240px] mx-auto px-6">
        <SectionHeader
          eyebrow="The Riyona Experience"
          title="Why Choose Riyona Driving School?"
          description="Over 25 cumulative years of training legacy across Colombo and the Western Province. Built on proven safety practices and exceptional learner outcomes."
        />

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.number}
              className="flex flex-col rounded-2xl bg-white p-7 shadow-card transition-shadow hover:shadow-float"
            >
              <div className="flex items-start justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-gold-soft text-gold-deep">
                  <Icon name={feature.icon} className="w-[22px] h-[22px]" />
                </span>
                <span className="text-xs font-medium text-muted/70">{feature.number}</span>
              </div>

              <h3 className="mt-6 text-[1.0625rem] font-semibold tracking-[-0.01em] text-ink">{feature.title}</h3>
              <p className="mt-3 text-[0.8125rem] leading-relaxed text-muted">{feature.description}</p>

              <div className="mt-auto pt-6">
                <div className="border-t border-line pt-4">
                  <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">{feature.tag}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
