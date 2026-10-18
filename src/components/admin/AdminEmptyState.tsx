import Icon from "@/components/ui/Icon";

/**
 * Empty panel in the admin style: dashed border on a white panel, with a soft icon chip. Used where a list has no
 * records, so the state is explained instead of shown as a blank area.
 */
export default function AdminEmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-white px-6 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-gold-soft text-gold-ink ring-1 ring-gold/60">
        <Icon name="info" className="h-5 w-5" />
      </span>
      <h3 className="text-[1rem] font-semibold text-ink">{title}</h3>
      <p className="max-w-md text-[0.875rem] text-muted">{body}</p>
    </div>
  );
}
