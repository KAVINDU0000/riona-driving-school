"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

/** Full-page driving artwork behind the auth pages, with a light veil and a gentle pointer parallax. Decorative only. */
export default function AuthBackground({
  intensity = "soft",
  variant = "default",
}: {
  intensity?: "soft" | "strong";
  /** "soft" lets more of the road photo show through, for the login and sign-up pages. */
  variant?: "default" | "soft";
}) {
  const artRef = useRef<HTMLDivElement>(null);

  // The artwork shifts slightly with the pointer. Skipped when reduced motion is requested.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    function handlePointerMove(event: PointerEvent) {
      const x = event.clientX / window.innerWidth - 0.5;
      const y = event.clientY / window.innerHeight - 0.5;
      if (artRef.current) {
        artRef.current.style.transform = `translate3d(${-x * 24}px, ${-y * 16}px, 0) scale(1.04)`;
      }
    }
    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div ref={artRef} className="absolute inset-0 transition-transform duration-700 ease-out will-change-transform">
        <Image src="/images/login-background.jpg" alt="" fill priority sizes="100vw" className="object-cover object-center" />
      </div>
      <div
        className={`absolute inset-0 ${
          variant === "soft"
            ? "bg-[linear-gradient(105deg,rgb(248_251_255/0.7)_0%,rgb(236_243_252/0.45)_40%,rgb(236_243_252/0.08)_100%)]"
            : intensity === "strong"
            ? "bg-[linear-gradient(90deg,rgb(238_243_250/0.94)_0%,rgb(238_243_250/0.84)_50%,rgb(238_243_250/0.5)_100%)]"
            : "bg-[linear-gradient(90deg,rgb(238_243_250/0.85)_0%,rgb(238_243_250/0.5)_45%,rgb(238_243_250/0.1)_100%)]"
        }`}
      />
    </div>
  );
}
