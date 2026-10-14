/** Placeholder shown while a student page loads. Keeps the layout stable and announces progress to screen readers. */
export default function LoadingState({ label = "Loading your portal" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">{label}</span>
      <div className="h-8 w-56 animate-pulse rounded-lg bg-white/80" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/80" />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-2xl bg-white/80" />
    </div>
  );
}
