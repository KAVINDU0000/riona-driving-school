"use client";

/** Shown when a page fails to load. It offers a retry and never displays raw error text. */
export default function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-6 py-8">
      <h2 className="text-[1rem] font-semibold text-red-800">This page could not be loaded</h2>
      <p className="text-[0.875rem] text-red-700">Something went wrong on our side. Your records have not been changed.</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl bg-white px-4 py-2 text-[0.875rem] font-semibold text-ink ring-1 ring-line hover:ring-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
        >
          Try again
        </button>
      )}
    </div>
  );
}
