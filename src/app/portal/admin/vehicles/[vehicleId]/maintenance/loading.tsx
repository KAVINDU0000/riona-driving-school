/** Shown while the maintenance records are loading. */
export default function MaintenanceLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="mt-6 grid gap-6">
      <div className="glass h-40 animate-pulse rounded-[22px]" />
      <div className="glass h-64 animate-pulse rounded-[22px]" />
      <p className="text-[0.875rem] text-muted">Loading maintenance records…</p>
    </div>
  );
}
