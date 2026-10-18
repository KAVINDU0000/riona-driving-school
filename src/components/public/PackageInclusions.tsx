import Icon from "@/components/ui/Icon";
import { whyCards } from "@/data/landing";
import { Surface } from "@/components/landing/primitives";

/*
 * Only the school's own service copy from src/data/landing.ts is shown. The instalment card is left out, because no
 * instalment scheme is in the price list. There is no comparison with other schools, because the project holds no
 * data about them.
 */
const INCLUDED_TITLES = [
  "Government Approved & Certified",
  "Patient, Highly Qualified Instructors",
  "Modern Dual-Control Fleet",
  "Dedicated Practical Training Yard",
  "Full Support on DMT Exam Day",
];

/** Table of what every package includes. It is a list on small screens and a table from medium screens up. */
export default function PackageInclusions() {
  const rows = whyCards.filter((card) => INCLUDED_TITLES.includes(card.title));

  return (
    <section aria-labelledby="includes-heading" className="mt-16">
      <div className="mb-8 flex flex-col gap-2">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-gold-ink">What is included</p>
        <h2 id="includes-heading" className="text-[1.5rem] font-bold tracking-[-0.02em] text-ink md:text-[1.75rem]">
          What every Riyona package includes
        </h2>
      </div>

      <Surface className="overflow-hidden p-0">
        <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_minmax(0,0.8fr)] gap-6 border-b border-line bg-page px-6 py-4 text-[0.8125rem] font-semibold text-muted md:grid">
          <span>Service</span>
          <span>What you get</span>
          <span>Included</span>
        </div>

        <ul className="divide-y divide-line">
          {rows.map((row) => (
            <li key={row.title} className="grid gap-3 px-6 py-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_minmax(0,0.8fr)] md:items-center md:gap-6">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-ink">
                  <Icon name={row.icon} className="h-[18px] w-[18px]" />
                </span>
                <span className="text-[1rem] font-bold text-ink">{row.title}</span>
              </div>
              <p className="text-[0.9375rem] leading-[1.6] text-muted">{row.body}</p>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-[0.8125rem] font-semibold text-success">
                <Icon name="check-circle" className="h-3.5 w-3.5" />
                {row.tag}
              </span>
            </li>
          ))}
        </ul>
      </Surface>
    </section>
  );
}
