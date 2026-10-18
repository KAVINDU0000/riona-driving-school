import type { ReactNode } from "react";
import Icon from "@/components/ui/Icon";

/**
 * One figure on the admin dashboard. Styled to match the admin registration queue: bordered white panel,
 * soft icon chip, small uppercase label, and a caption that says where the number comes from.
 * When `linked` is set, the card shows a footer that reads as a link.
 */
export default function AdminStatCard({
  label,
  value,
  caption,
  icon,
  linked = false,
  children,
}: {
  label: string;
  value: ReactNode;
  caption?: string;
  icon: string;
  linked?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={`group flex h-full flex-col gap-4 rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(16,27,48,0.04)] transition-all ${
        linked ? "hover:-translate-y-px hover:border-gold/60 hover:shadow-[0_12px_28px_-18px_rgba(16,27,48,0.45)]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-muted">{label}</span>
        <span
          aria-hidden="true"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-page text-ink-soft ring-1 ring-line transition-colors group-hover:bg-gold-soft group-hover:text-gold-ink group-hover:ring-gold/50"
        >
          <Icon name={icon} className="h-[18px] w-[18px]" />
        </span>
      </div>
      <div className="text-[2rem] font-bold leading-none tracking-[-0.02em] text-ink">{value}</div>
      {caption && <p className="text-[0.8125rem] leading-snug text-muted">{caption}</p>}
      {children}
      {linked && (
        <span className="mt-auto flex items-center gap-1.5 border-t border-line pt-3 text-[0.8125rem] font-semibold text-gold-ink">
          View details
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7.5 5 12.5 10l-5 5" />
          </svg>
        </span>
      )}
    </div>
  );
}
