"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import Icon from "@/components/ui/Icon";
import { studentNav } from "@/components/student/nav";

/**
 * Navigation for tablet and phone widths. It scrolls horizontally, and keeps the current section in view.
 * The bar is hidden on large screens, where the sidebar shows instead.
 */
export default function StudentMobileNavigation() {
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const active = barRef.current?.querySelector<HTMLAnchorElement>('[aria-current="page"]');
    active?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);

  return (
    <nav aria-label="Student portal sections" className="lg:hidden">
      <div ref={barRef} className="thin-scroll -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
        {studentNav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[0.875rem] font-semibold ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark ${
                active ? "bg-gold text-ink ring-gold" : "bg-white/80 text-muted ring-line hover:text-ink"
              }`}
            >
              <Icon name={item.icon} className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
