import React from "react";

/**
 * Global content system. Fluid: content is the viewport minus 64px on desktop
 * (32px each side), capped at 1680px. The max-width includes the 32px side
 * padding, so the widest content frame is exactly 1680px.
 */
export function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1744px] px-4 md:px-8 ${className}`}>{children}</div>;
}

/** Section wrapper with the shared vertical rhythm (80px desktop, 56px mobile). */
export function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`py-14 md:py-[clamp(64px,7vw,120px)] ${className}`}>
      <Container>{children}</Container>
    </section>
  );
}

export function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-gold-ink ${className}`}>
      {children}
    </p>
  );
}

/** Eyebrow + H2 + supporting copy, used at the top of every section. */
export function SectionHeading({
  eyebrow,
  title,
  body,
  align = "left",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  body?: string;
  align?: "left" | "center";
}) {
  const center = align === "center";
  return (
    <div className={`mb-10 flex flex-col gap-3 md:mb-12 ${center ? "items-center text-center" : ""}`}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="text-[1.75rem] font-bold leading-[1.15] tracking-[-0.02em] text-ink md:text-[clamp(1.875rem,2.5vw,2.75rem)]">
        {title}
      </h2>
      {body && <p className="max-w-[560px] text-[0.9375rem] leading-[1.65] text-muted">{body}</p>}
    </div>
  );
}

/** Translucent glass surface floating over the page atmosphere. */
export function Surface({
  children,
  className = "",
  lift = false,
}: {
  children: React.ReactNode;
  className?: string;
  lift?: boolean;
}) {
  return (
    <div className={`glass rounded-2xl ${lift ? "glass-lift" : ""} ${className}`}>{children}</div>
  );
}

/** Small rounded icon tile used on cards. Gold tiles get a translucent top-lit depth. */
export function IconTile({ children, tone = "gold" }: { children: React.ReactNode; tone?: "gold" | "success" }) {
  const toneClass = tone === "gold" ? "icon-gold text-gold-ink" : "bg-success-soft text-success";
  return (
    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${toneClass}`}>{children}</span>
  );
}
