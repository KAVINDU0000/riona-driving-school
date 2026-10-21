"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navLinks } from "@/data/landing";

/** The page a link leads to is the current page, or a page inside it. "/" matches only the home page. */
function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop navigation list with a clear active state. Hidden below the extra-large breakpoint, as before. */
export function DesktopNav() {
  const pathname = usePathname();
  return (
    <ul aria-label="Main" className="hidden items-center gap-2 pl-4 xl:flex">
      {navLinks.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`relative block rounded-full px-3.5 py-2 text-[0.875rem] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark ${
                active
                  ? "font-semibold text-ink after:absolute after:inset-x-3.5 after:-bottom-0.5 after:h-[3px] after:rounded-full after:bg-gold"
                  : "font-medium text-muted hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Links inside the small-screen menu. The menu is a native details element, so it works without JavaScript. */
export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="space-y-1">
      {navLinks.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark ${
              active ? "bg-gold-soft text-ink ring-1 ring-gold" : "text-muted hover:bg-page hover:text-ink"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
