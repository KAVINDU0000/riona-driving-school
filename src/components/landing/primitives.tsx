import React from "react";

/**
 * Global content system. The Figma frame is 1440px wide with a 40px inner
 * margin, so every section shares a 1360px container.
 */
export function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1360px] px-4 md:px-10 ${className}`}>{children}</div>;
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
    <section id={id} className={`py-14 md:py-20 ${className}`}>
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
      <h2 className="text-[1.75rem] font-bold leading-[1.15] tracking-[-0.02em] text-ink md:text-[2.25rem]">
        {title}
      </h2>
      {body && <p className="max-w-[560px] text-[0.9375rem] leading-[1.65] text-muted">{body}</p>}
    </div>
  );
}

/** Frosted white surface with a thin border and soft shadow. */
export function Surface({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/80 bg-white/85 shadow-card backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

/** Small rounded icon tile used on cards. */
export function IconTile({ children, tone = "gold" }: { children: React.ReactNode; tone?: "gold" | "success" }) {
  const toneClass = tone === "gold" ? "bg-gold-soft text-gold-ink" : "bg-success-soft text-success";
  return (
    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${toneClass}`}>{children}</span>
  );
}
