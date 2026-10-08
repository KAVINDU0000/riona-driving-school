import Icon from "@/components/ui/Icon";
import { safetyPrinciples } from "@/data/landing";
import { Container, Eyebrow, IconTile, Surface } from "./primitives";

export default function RoadSafety() {
  return (
    <section className="pt-14 md:pt-[clamp(72px,8vw,136px)]">
      <Container>
        <Surface className="grid gap-8 p-8 md:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-center">
          <div>
            <Eyebrow>Our Guiding Standards</Eyebrow>
            <h2 className="mt-3 text-[1.75rem] font-bold leading-[1.15] tracking-[-0.02em] text-ink md:text-[2rem]">
              Good Drivers Are Built on Good Habits.
            </h2>
          </div>
          <ul className="grid gap-[clamp(16px,1.5vw,28px)] sm:grid-cols-2 xl:grid-cols-4">
            {safetyPrinciples.map((p) => (
              <li key={p.title} className="flex items-start gap-3">
                <IconTile tone="success">
                  <Icon name={p.icon} className="h-[18px] w-[18px]" />
                </IconTile>
                <div>
                  <p className="text-[0.9375rem] font-bold text-ink">{p.title}</p>
                  <p className="text-[0.8125rem] text-muted">{p.sub}</p>
                </div>
              </li>
            ))}
          </ul>
        </Surface>
      </Container>
    </section>
  );
}
