import Link from "next/link";
import type { ReactNode } from "react";
import Icon from "@/components/ui/Icon";

const TONES = {
  gold: "bg-gold-soft text-gold-ink ring-gold/50",
  blue: "bg-sky-100 text-sky-700 ring-sky-200",
  green: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  violet: "bg-violet-100 text-violet-700 ring-violet-200",
  amber: "bg-amber-100 text-amber-700 ring-amber-200",
} as const;

/** A single figure on the dashboard. The caption explains where the number comes from. With an href, the whole card links to its page. */
export default function StudentStatCard({
  label,
  value,
  caption,
  icon,
  tone = "gold",
  href,
  children,
}: {
  label: string;
  value: ReactNode;
  caption?: string;
  icon: string;
  tone?: keyof typeof TONES;
  href?: string;
  children?: ReactNode;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1 ${TONES[tone]}`}>
          <Icon name={icon} className="h-5 w-5" />
        </span>
        {href && <Icon name="arrow-right" className="mt-1 h-4 w-4 text-muted" />}
      </div>
      <span className="text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-muted">{label}</span>
      <div className="text-[1.375rem] font-bold tracking-[-0.02em] text-ink">{value}</div>
      {caption && <p className="text-[0.8125rem] text-muted">{caption}</p>}
      {children}
    </>
  );
  const className = "glass flex h-full flex-col gap-2.5 rounded-2xl p-5";
  if (href) {
    return (
      <Link href={href} className={`${className} transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark`}>
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}
