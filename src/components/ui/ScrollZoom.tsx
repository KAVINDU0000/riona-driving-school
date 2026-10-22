"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { zoomScale } from "@/lib/ui/scroll-zoom";

const ITEM_SELECTOR = "[data-scroll-zoom]";
const DESKTOP_MAX_SCALE = 1.02;
const MOBILE_MAX_SCALE = 1.01;
const MOBILE_QUERY = "(max-width: 767px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

type Item = { el: HTMLElement; container: HTMLElement | null };

/** The nearest ancestor that scrolls vertically. Null means the window scrolls. */
function scrollParent(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * Scales the marked items inside it as they pass the centre of the visible area, so cards grow slightly near the
 * middle of the screen and return to normal size as they leave. It works with the window scroll or a nested scroll
 * container, and only touches the `transform` of items marked with `data-scroll-zoom`.
 *
 * Positions are read once per animation frame, not in React state. Nothing is changed when the user prefers reduced
 * motion, and all listeners and frames are removed on unmount.
 */
export default function ScrollZoom({ children, className = "" }: { children: ReactNode; className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
    const mobile = window.matchMedia(MOBILE_QUERY);
    let items: Item[] = [];
    let frame = 0;
    let active = false;

    const collect = () => {
      items = Array.from(root.querySelectorAll<HTMLElement>(ITEM_SELECTOR)).map((el) => ({ el, container: scrollParent(el) }));
    };

    const update = () => {
      frame = 0;
      const maxScale = mobile.matches ? MOBILE_MAX_SCALE : DESKTOP_MAX_SCALE;

      // Read every position first, then write every transform, so the browser lays out once per frame.
      const reads = items.map(({ el, container }) => {
        const area = container
          ? container.getBoundingClientRect()
          : { top: 0, bottom: window.innerHeight };
        const areaTop = Math.max(area.top, 0);
        const areaBottom = Math.min(area.bottom, window.innerHeight);
        const rect = el.getBoundingClientRect();
        return { el, scale: areaBottom > areaTop ? zoomScale(rect.top, rect.bottom, areaTop, areaBottom, maxScale) : 1 };
      });

      for (const { el, scale } of reads) {
        const transform = scale === 1 ? "" : `scale(${scale.toFixed(4)})`;
        if (el.style.transform !== transform) el.style.transform = transform;
      }
    };

    const requestUpdate = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    const onResize = () => {
      collect();
      requestUpdate();
    };

    const start = () => {
      if (active) return;
      active = true;
      collect();
      document.addEventListener("scroll", requestUpdate, { capture: true, passive: true });
      window.addEventListener("resize", onResize, { passive: true });
      requestUpdate();
    };

    const stop = () => {
      if (!active) return;
      active = false;
      document.removeEventListener("scroll", requestUpdate, { capture: true });
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame);
      frame = 0;
      for (const { el } of items) el.style.transform = "";
      items = [];
    };

    const sync = () => (reducedMotion.matches ? stop() : start());
    reducedMotion.addEventListener("change", sync);
    sync();

    return () => {
      reducedMotion.removeEventListener("change", sync);
      stop();
    };
  }, []);

  return (
    <div ref={rootRef} className={className}>
      {children}
    </div>
  );
}
