"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import { site } from "@/data/home";

export default function FloatingActions() {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-center gap-4">
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
        className={`grid h-11 w-11 place-items-center rounded-full bg-white text-ink shadow-float transition-opacity duration-300 ${
          showTop ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <Icon name="arrow-up" className="w-[18px] h-[18px]" />
      </button>

      <a
        href={site.whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Riyona on WhatsApp"
        className="grid h-14 w-14 place-items-center rounded-full bg-success text-white shadow-float hover:brightness-110 transition-all"
      >
        <Icon name="chat" className="w-6 h-6" strokeWidth={1.8} />
      </a>
    </div>
  );
}
