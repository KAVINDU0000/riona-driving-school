import type { ReactNode } from "react";
import { IconTile, Surface } from "@/components/landing/primitives";

/**
 * Shared card for a document or a practice area: a gold accent bar, an icon tile with
 * a title and meta line, optional actions on the right, and the content below.
 */
export default function DocumentCard({
  icon,
  title,
  meta,
  actions,
  children,
  className = "",
}: {
  icon: ReactNode;
  title: string;
  meta?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Surface className={`mx-auto max-w-3xl overflow-hidden ${className}`}>
      <div className="h-1 bg-gradient-to-r from-gold via-gold-dark to-gold-deep" aria-hidden="true" />
      <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <IconTile>{icon}</IconTile>
          <div className="min-w-0">
            <h3 className="truncate text-[1.0625rem] font-bold text-ink">{title}</h3>
            {meta && <p className="mt-0.5 text-[0.8125rem] text-muted">{meta}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children && <div className="border-t border-line/70 bg-page/60 p-3 md:p-5">{children}</div>}
    </Surface>
  );
}

/** Pill button used in DocumentCard headers. */
export const CARD_BUTTON_OUTLINE =
  "inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-[0.8125rem] font-semibold text-ink-soft transition hover:border-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark";

export const CARD_BUTTON_SOLID =
  "inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-[0.8125rem] font-bold text-ink shadow-[0_10px_24px_-14px_rgba(232,164,0,0.9)] transition hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark";
