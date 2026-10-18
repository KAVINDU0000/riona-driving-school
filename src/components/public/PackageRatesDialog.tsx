"use client";

import { useRef } from "react";

export type RateRow = { id: string; name: string; price: string };

export type DailyRateRow = { price: string; detail: string | null };

/** A card button that opens the package rates for one vehicle in a centred dialog. */
export default function PackageRatesDialog({
  vehicleTitle,
  daily,
  packages,
}: {
  vehicleTitle: string;
  daily: DailyRateRow | null;
  packages: RateRow[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="group/rates flex w-full items-center justify-between gap-3 rounded-xl bg-page px-4 py-3 text-left text-[0.875rem] font-semibold text-ink ring-1 ring-line transition-colors hover:bg-white hover:ring-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
      >
        <span>
          Packages and rates
          <span className="mt-0.5 block text-[0.75rem] font-medium text-muted">
            {packages.length} packages
            {daily ? " and a daily rate" : ""}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-ink ring-1 ring-line transition-colors group-hover/rates:bg-gold group-hover/rates:ring-gold"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 17 17 7M9 7h8v8" />
          </svg>
        </span>
      </button>

      <dialog
        ref={dialogRef}
        aria-label={`Packages and rates: ${vehicleTitle}`}
        onClick={(event) => {
          // A click on the dimmed backdrop closes the dialog. Clicks inside the panel do not.
          if (event.target === event.currentTarget) close();
        }}
        className="m-auto w-[min(92vw,540px)] overflow-hidden rounded-3xl bg-white p-0 text-ink shadow-card backdrop:bg-ink/50 backdrop:backdrop-blur-sm open:animate-panel-in"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-gold-ink">
              Packages and rates
            </p>
            <h3 className="mt-1 text-[1.25rem] font-bold leading-snug text-ink">
              {vehicleTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-page text-ink ring-1 ring-line transition-colors hover:bg-gold-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="max-h-[62vh] overflow-y-auto">
          {daily && (
            <div className="border-l-[3px] border-gold bg-gold-soft/50 px-6 py-4">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted">
                Daily individual training
              </p>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-[1rem] font-bold text-ink">
                {daily.price}
                {daily.detail && (
                  <span className="text-[0.8125rem] font-normal text-muted">
                    {daily.detail}
                  </span>
                )}
              </p>
            </div>
          )}

          {packages.length > 0 && (
            <ul>
              {packages.map((row) => (
                <li
                  key={row.id}
                  className="flex items-start justify-between gap-4 border-t border-line px-6 py-3.5 first:border-t-0"
                >
                  <span className="min-w-0 text-[0.9375rem] leading-snug text-ink">
                    {row.name}
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-right text-[0.9375rem] font-bold text-ink">
                    {row.price}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </dialog>
    </>
  );
}
