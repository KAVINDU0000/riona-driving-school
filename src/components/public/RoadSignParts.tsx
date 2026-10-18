import { Surface } from "@/components/landing/primitives";
import DangerSignImage, { hasDangerSignImage } from "@/components/public/DangerSignImage";
import type { SignCategory, SignGlyph } from "@/data/road-rules";

/** Drawn sign shape. Its colour and outline show the type of sign. Decorative only; the sign name is always written out. */
export function SignShape({ glyph, className = "h-10 w-10" }: { glyph: SignGlyph; className?: string }) {
  const body = (() => {
    switch (glyph) {
      case "diamond":
        return <rect x="11" y="11" width="26" height="26" transform="rotate(45 24 24)" fill="#facc15" stroke="#111827" strokeWidth="2.5" />;
      case "circle":
        return <circle cx="24" cy="24" r="19" fill="#ffffff" stroke="#dc2626" strokeWidth="4.5" />;
      case "triangle":
        return <path d="M5 9 L43 9 L24 41 Z" fill="#ffffff" stroke="#dc2626" strokeWidth="4.5" strokeLinejoin="round" />;
      case "octagon":
        return <polygon points="16,4 32,4 44,16 44,32 32,44 16,44 4,32 4,16" fill="#dc2626" />;
      case "square":
        return <rect x="4" y="4" width="40" height="40" rx="6" fill="#1d4ed8" />;
      default:
        return null;
    }
  })();

  return (
    <svg viewBox="0 0 48 48" className={`shrink-0 ${className}`} aria-hidden="true">
      {body}
    </svg>
  );
}

/** Icon for a category card. Danger signs use a drawn sign; the other categories use their sign shape or a small drawing. */
export function CategoryIcon({ category, className = "h-12 w-12" }: { category: SignCategory; className?: string }) {
  if (category.id === "warning") {
    return <DangerSignImage name="Pedestrian crossing ahead" className={className} />;
  }
  if (category.id === "lights") {
    return (
      <svg viewBox="0 0 48 48" className={`shrink-0 ${className}`} aria-hidden="true">
        <rect x="16" y="6" width="16" height="36" rx="4" fill="#111827" />
        <circle cx="24" cy="14" r="4" fill="#dc2626" />
        <circle cx="24" cy="24" r="4" fill="#facc15" />
        <circle cx="24" cy="34" r="4" fill="#16a34a" />
      </svg>
    );
  }
  if (category.id === "markings") {
    return (
      <svg viewBox="0 0 48 48" className={`shrink-0 ${className}`} aria-hidden="true">
        <rect x="6" y="6" width="36" height="36" rx="4" fill="#111827" />
        <line x1="24" y1="10" x2="24" y2="16" stroke="#ffffff" strokeWidth="3" />
        <line x1="24" y1="20" x2="24" y2="28" stroke="#ffffff" strokeWidth="3" />
        <line x1="24" y1="32" x2="24" y2="38" stroke="#ffffff" strokeWidth="3" />
      </svg>
    );
  }
  if (category.id === "police") {
    return (
      <svg viewBox="0 0 48 48" className={`shrink-0 ${className}`} aria-hidden="true">
        <circle cx="24" cy="24" r="22" fill="#f1f5f9" />
        <circle cx="24" cy="16" r="5" fill="#111827" />
        <line x1="24" y1="22" x2="24" y2="34" stroke="#111827" strokeWidth="4" strokeLinecap="round" />
        <line x1="24" y1="26" x2="14" y2="18" stroke="#111827" strokeWidth="3" strokeLinecap="round" />
        <line x1="24" y1="26" x2="34" y2="18" stroke="#111827" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  return <SignShape glyph={category.glyph} className={className} />;
}

/** All signs in one category, as tiles. Warning signs are drawn; other shape-based signs use their shape. */
export function CategorySignGrid({ category }: { category: SignCategory }) {
  if (category.glyph === "none") {
    return (
      <ul className="mt-10 grid gap-3 md:grid-cols-2">
        {category.signs.map((name) => (
          <li key={name}>
            <Surface className="flex h-full items-start gap-3 p-4">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" aria-hidden="true" />
              <span className="text-[0.9375rem] leading-[1.6] text-ink">{name}</span>
            </Surface>
          </li>
        ))}
      </ul>
    );
  }

  if (category.id === "warning") {
    return (
      <ul className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {category.signs.map((name) => (
          <li key={name}>
            <Surface lift className="flex h-full flex-col items-center gap-3 p-4 text-center">
              {hasDangerSignImage(name) ? (
                <DangerSignImage name={name} className="h-20 w-20" />
              ) : (
                <SignShape glyph="diamond" className="h-20 w-20" />
              )}
              <span className="text-[0.875rem] font-semibold leading-snug text-ink">{name}</span>
            </Surface>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {category.signs.map((name) => (
        <li key={name}>
          <Surface className="flex h-full items-center gap-4 p-4">
            <SignShape glyph={category.glyph} />
            <span className="text-[0.9375rem] font-semibold leading-snug text-ink">{name}</span>
          </Surface>
        </li>
      ))}
    </ul>
  );
}
