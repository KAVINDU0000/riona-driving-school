import Link from "next/link";
import Icon from "@/components/ui/Icon";

/** Shown when a section has no records. It explains the state and never shows invented figures. */
export default function EmptyState({ title, body, action }: { title: string; body: string; action?: { label: string; href: string } }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-white/60 px-6 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-gold-soft text-gold-ink ring-1 ring-gold/60">
        <Icon name="info" className="h-5 w-5" />
      </span>
      <h3 className="text-[1rem] font-semibold text-ink">{title}</h3>
      <p className="max-w-md text-[0.875rem] text-muted">{body}</p>
      {action && (
        <Link href={action.href} className="mt-1 text-[0.875rem] font-semibold text-gold-ink hover:text-ink">
          {action.label}
        </Link>
      )}
    </div>
  );
}
