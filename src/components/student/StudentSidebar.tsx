"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { studentNav } from "@/components/student/nav";

/** Desktop navigation. The current section is marked with aria-current so screen readers announce it. */
export default function StudentSidebar() {
  const pathname = usePathname();

  return (
    // Plain background (no backdrop blur). The frame does not scroll on large screens, so the sidebar stays in place.
    <nav
      aria-label="Student portal"
      className="hidden h-fit w-64 shrink-0 self-start rounded-[22px] border border-white/70 bg-white/85 p-3 shadow-[0_12px_40px_-16px_rgb(40_60_90/0.16)] lg:block"
    >
      <ul className="flex flex-col gap-1">
        {studentNav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[0.9375rem] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark ${
                  active ? "bg-gold-soft text-ink ring-1 ring-gold" : "text-muted hover:bg-white hover:text-ink"
                }`}
              >
                <Icon name={item.icon} className={`h-[18px] w-[18px] ${active ? "text-gold-ink" : ""}`} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
