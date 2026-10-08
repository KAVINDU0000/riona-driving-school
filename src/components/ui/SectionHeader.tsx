interface SectionHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  /** Supporting copy. Sits to the right on `split`, under the title otherwise. */
  description?: string;
  /** "split" = title left / description right, "centered", "stacked". */
  layout?: "split" | "centered" | "stacked";
  className?: string;
}

export default function SectionHeader({
  eyebrow,
  title,
  description,
  layout = "split",
  className = "",
}: SectionHeaderProps) {
  if (layout === "centered") {
    return (
      <div className={`text-center max-w-3xl mx-auto ${className}`}>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="mt-4 text-[2rem] md:text-[2.75rem] font-bold text-ink leading-[1.12] tracking-[-0.02em]">
          {title}
        </h2>
        {description && <p className="mt-4 text-[0.9375rem] text-muted leading-relaxed">{description}</p>}
      </div>
    );
  }

  if (layout === "stacked") {
    return (
      <div className={`max-w-2xl ${className}`}>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="mt-4 text-[2rem] md:text-[2.75rem] font-bold text-ink leading-[1.12] tracking-[-0.02em]">
          {title}
        </h2>
        {description && <p className="mt-5 text-[0.9375rem] text-muted leading-relaxed">{description}</p>}
      </div>
    );
  }

  return (
    <div className={`grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-end ${className}`}>
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="mt-4 text-[2rem] md:text-[2.75rem] font-bold text-ink leading-[1.12] tracking-[-0.02em]">
          {title}
        </h2>
      </div>
      {description && (
        <p className="text-[0.9375rem] text-muted leading-relaxed lg:pb-2">{description}</p>
      )}
    </div>
  );
}
