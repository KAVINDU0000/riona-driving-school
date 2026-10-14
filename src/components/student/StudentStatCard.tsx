import type { ReactNode } from "react";
import Icon from "@/components/ui/Icon";

/** A single figure on the dashboard. The caption explains where the number comes from. */
export default function StudentStatCard({
  label,
  value,
  caption,
  icon,
  children,
}: {
  label: string;
  value: ReactNode;
  caption?: string;
  icon: string;
  children?: ReactNode;
}) {
  return (
    <div className="glass flex flex-col gap-3 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-muted">{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gold-soft text-gold-ink ring-1 ring-gold/50">
          <Icon name={icon} className="h-[18px] w-[18px]" />
        </span>
      </div>
      <div className="text-[1.5rem] font-bold tracking-[-0.02em] text-ink">{value}</div>
      {caption && <p className="text-[0.8125rem] text-muted">{caption}</p>}
      {children}
    </div>
  );
}
