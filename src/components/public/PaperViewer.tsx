"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";

const PAGE_WIDTH = 910;
const PAGE_HEIGHT = 1286;

const NAV_BUTTON =
  "inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink-soft transition hover:border-gold-dark hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark";

/** Page-by-page reader for the past paper. Pages are pre-rendered images, so no browser PDF toolbar shows. */
export default function PaperViewer({
  basePath,
  pageCount,
  title,
}: {
  basePath: string;
  pageCount: number;
  title: string;
}) {
  const [page, setPage] = useState(1);

  const go = (next: number) => setPage(Math.min(pageCount, Math.max(1, next)));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        setPage((p) => Math.min(pageCount, p + 1));
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        setPage((p) => Math.max(1, p - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pageCount]);

  const src = `${basePath}/page-${String(page).padStart(2, "0")}.webp`;
  const progress = (page / pageCount) * 100;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => go(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
          className={NAV_BUTTON}
        >
          <Icon name="arrow-left" className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center gap-2">
          <p className="text-[0.875rem] font-semibold text-ink-soft" aria-live="polite">
            Page <span className="tabular-nums text-ink">{page}</span> of {pageCount}
          </p>
          <div className="h-1 w-40 overflow-hidden rounded-full bg-line" aria-hidden="true">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold to-gold-deep transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => go(page + 1)}
          disabled={page === pageCount}
          aria-label="Next page"
          className={NAV_BUTTON}
        >
          <Icon name="arrow-right" className="h-4 w-4" />
        </button>
      </div>

      <div className="mx-auto w-full max-w-[560px] overflow-hidden rounded-xl bg-white shadow-[0_24px_50px_-28px_rgba(40,60,90,0.45)] ring-1 ring-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={src}
          src={src}
          alt={`${title}, page ${page} of ${pageCount}`}
          width={PAGE_WIDTH}
          height={PAGE_HEIGHT}
          className="block h-auto w-full"
        />
      </div>

      <p className="text-center text-[0.8125rem] text-muted">
        Use the arrows or the left and right keys to turn pages.
      </p>
    </div>
  );
}
