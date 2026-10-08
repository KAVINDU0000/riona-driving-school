import Icon from "@/components/ui/Icon";
import { trustPoints } from "@/data/landing";
import { Container, IconTile, Surface } from "./primitives";

export default function TrustStrip() {
  return (
    <div className="pb-14 md:pb-20">
      <Container>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trustPoints.map((p) => (
            <Surface key={p.title} className="flex items-center gap-4 p-5">
              <IconTile tone="success">
                <Icon name={p.icon} className="h-5 w-5" />
              </IconTile>
              <div>
                <p className="text-[0.9375rem] font-bold text-ink">{p.title}</p>
                <p className="text-[0.8125rem] text-muted">{p.sub}</p>
              </div>
            </Surface>
          ))}
        </div>
      </Container>
    </div>
  );
}
