import Icon from "@/components/ui/Icon";
import { safetyPrinciples } from "@/data/home";

export default function RoadSafety() {
  return (
    <section className="bg-white py-14 md:py-16">
      <div className="max-w-[1240px] mx-auto px-6">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.6fr] lg:items-center lg:gap-14">
          <div>
            <p className="eyebrow">Our Educational Creed</p>
            <h2 className="mt-4 text-[1.75rem] md:text-[2.25rem] font-bold leading-[1.15] tracking-[-0.025em] text-ink">
              Good Drivers Are Built on Good Habits.
            </h2>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {safetyPrinciples.map((principle) => (
              <li
                key={principle.id}
                className="rounded-2xl bg-page px-5 py-6 text-center ring-1 ring-line/70"
              >
                <Icon name={principle.icon} className="mx-auto w-[22px] h-[22px] text-gold-deep" />
                <p className="mt-4 text-[0.8125rem] font-semibold tracking-[-0.01em] text-ink">{principle.title}</p>
                <p className="mt-2 text-[0.6875rem] text-muted">{principle.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
