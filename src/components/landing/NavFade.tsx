"use client";

import { useEffect } from "react";

/** Items that fade one by one: headings, text, images, buttons, list items and cards. */
const ITEM_SELECTOR =
  'main h1, main h2, main h3, main h4, main p, main img, main figure, main li, main article, main button, main a, main [class*="rounded"]';

/** Attribute that keeps a block and everything in it out of the fade. */
const OPT_OUT = "[data-nav-fade-off]";
/** Share of an item's height that must pass under the bar before it is fully transparent. */
const FADE_SHARE = 0.6;
/** Smallest fade distance in pixels, so small items such as one text line still fade gently. */
const MIN_FADE_PX = 20;
/** Elements taller than this are faded in strips by a mask that follows the bar, not all at once. */
const MAX_ITEM_HEIGHT = 600;

/**
 * Fades the page content as it scrolls under the sticky navigation bar.
 * - Small items (headings, text, images, buttons, list items, cards) fade one by one. Each starts to fade the moment
 *   its top edge reaches the bar, and is fully transparent once it has passed a fifth of its height under it.
 *   Items inside another item are left to the outer one, so a card fades as a whole.
 * - Large elements (image panels, dark panels) are masked, so the part under the bar disappears strip by strip. The
 *   fade starts half a band before the bar, so it never begins with a sudden cut.
 * Reduced-motion visitors keep every item visible.
 */
export default function NavFade() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Blocks marked with OPT_OUT (such as the past paper) keep full opacity and are not masked.
    const candidates = Array.from(document.querySelectorAll<HTMLElement>(ITEM_SELECTOR)).filter(
      (el) => !el.closest(OPT_OUT) && !el.querySelector(OPT_OUT),
    );
    const large = candidates.filter((el) => el.offsetHeight > MAX_ITEM_HEIGHT);
    const small = candidates.filter((el) => el.offsetHeight <= MAX_ITEM_HEIGHT);
    // Keep only the outermost small item, so nothing fades twice.
    const items = small.filter((el) => !small.some((other) => other !== el && other.contains(el)));

    let frame = 0;
    const update = () => {
      frame = 0;
      const nav = document.querySelector<HTMLElement>("[data-site-nav]");
      const barBottom = nav ? nav.getBoundingClientRect().bottom : 0;

      for (const el of large) {
        const { top, height } = el.getBoundingClientRect();
        if (height === 0) continue;
        const cutoff = barBottom - top;
        const soft = Math.max(height * FADE_SHARE, MIN_FADE_PX);
        const lead = soft * 0.5;
        const mask =
          cutoff + soft <= 0
            ? "none"
            : `linear-gradient(to bottom, transparent ${Math.max(0, cutoff - lead)}px, #000 ${cutoff + soft}px)`;
        el.style.opacity = cutoff >= height ? "0" : "1";
        el.style.maskImage = mask;
        el.style.webkitMaskImage = mask;
      }

      for (const item of items) {
        const { top, height } = item.getBoundingClientRect();
        if (height === 0) continue;
        const fadeDistance = Math.max(height * FADE_SHARE, MIN_FADE_PX);
        const progress = Math.min(1, Math.max(0, (barBottom - top) / fadeDistance));
        const eased = 1 - (1 - progress) * (1 - progress);
        item.style.opacity = String(1 - eased);
      }
    };
    const onChange = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onChange, { passive: true });
    window.addEventListener("resize", onChange);
    return () => {
      window.removeEventListener("scroll", onChange);
      window.removeEventListener("resize", onChange);
      if (frame) cancelAnimationFrame(frame);
      for (const el of [...large, ...items]) {
        el.style.opacity = "";
        el.style.maskImage = "";
        el.style.webkitMaskImage = "";
      }
    };
  }, []);

  return null;
}
