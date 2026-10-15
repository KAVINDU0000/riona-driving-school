import Link from "next/link";
import type { ReactNode } from "react";
import PortalFrame from "@/components/portal/PortalFrame";

const SECTIONS = [
  { href: "/portal/instructor", label: "Dashboard" },
  { href: "/portal/instructor/lessons", label: "Lessons" },
  { href: "/portal/instructor/profile", label: "Profile" },
] as const;

/** Instructor portal page shell: the shared portal header, a section switcher, then the page heading and content. */
export default function InstructorFrame({
  title,
  description,
  active,
  children,
}: {
  title: string;
  description: string;
  active: (typeof SECTIONS)[number]["href"];
  children: ReactNode;
}) {
  return (
    <PortalFrame eyebrow="Instructor Portal" title={title}>
      <nav aria-label="Instructor sections" className="mb-6 flex flex-wrap gap-2">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            aria-current={active === section.href ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-[0.875rem] font-semibold ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark ${
              active === section.href ? "bg-gold-soft text-gold-ink ring-gold/60" : "bg-white text-muted ring-line hover:text-ink"
            }`}
          >
            {section.label}
          </Link>
        ))}
      </nav>
      <p className="mb-6 max-w-2xl text-[0.9375rem] text-muted">{description}</p>
      {children}
    </PortalFrame>
  );
}
