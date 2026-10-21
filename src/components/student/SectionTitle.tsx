import type { ReactNode } from "react";
import Icon from "@/components/ui/Icon";

const TONES = {
  gold: "bg-gold-soft text-gold-ink ring-gold/50",
  blue: "bg-sky-100 text-sky-700 ring-sky-200",
  green: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  violet: "bg-violet-100 text-violet-700 ring-violet-200",
  amber: "bg-amber-100 text-amber-700 ring-amber-200",
} as const;

/** Section heading with an icon tile, used on the student screens. */
export default function SectionTitle({
  id,
  icon,
  tone = "gold",
  children,
}: {
  id?: string;
  icon: string;
  tone?: keyof typeof TONES;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ${TONES[tone]}`}>
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <h2 id={id} className="text-[1.125rem] font-bold text-ink">
        {children}
      </h2>
    </div>
  );
}
