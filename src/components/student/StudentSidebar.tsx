"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { studentNav } from "@/components/student/nav";

/** Desktop navigation. The current section is marked with aria-current so screen readers announce it. */
export default function StudentSidebar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Student portal" className="glass sticky top-6 hidden h-fit w-64 shrink-0 rounded-[22px] p-3 lg:block">
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
