import type { ReactNode } from "react";
import { Container, Eyebrow } from "@/components/landing/primitives";

/** Top of a public page: eyebrow, one h1, a short description, and optional calls to action. */
export default function PageHero({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <Container>
      <div className="grid gap-6 md:gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-3 text-[2rem] font-bold leading-[1.1] tracking-[-0.03em] text-ink md:text-[clamp(2.25rem,3.5vw,3.25rem)]">
            {title}
          </h1>
          <p className="mt-4 max-w-[640px] text-[0.9375rem] leading-[1.7] text-muted md:text-[1rem]">{description}</p>
        </div>
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>
    </Container>
  );
}
