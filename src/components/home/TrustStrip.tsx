import Icon from "@/components/ui/Icon";
import { trustItems } from "@/data/home";

export default function TrustStrip() {
  return (
    <section className="pb-16 md:pb-24">
      <div className="max-w-[1240px] mx-auto px-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map((item) => (
            <div key={item.id} className="rounded-2xl bg-white p-6 shadow-card">
              <Icon name={item.icon} className="w-[22px] h-[22px] text-success" />
              <p className="mt-4 text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink">{item.title}</p>
              <p className="mt-2.5 text-xs text-muted">{item.subtitle}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
