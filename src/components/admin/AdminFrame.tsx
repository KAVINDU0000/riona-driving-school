import Link from "next/link";
import type { ReactNode } from "react";
import PortalFrame from "@/components/portal/PortalFrame";

/** Only sections that have a page. A section is added here when its page exists, so the navigation has no dead links. */
const SECTIONS = [
  { href: "/portal/admin", label: "Dashboard" },
  { href: "/portal/admin/registrations", label: "Registrations" },
  { href: "/portal/admin/students", label: "Students" },
  { href: "/portal/admin/instructors", label: "Instructors" },
] as const;

export type AdminSectionHref = (typeof SECTIONS)[number]["href"];

/** One step of the breadcrumb trail. The last step is the current page and has no link. */
export type AdminCrumb = { label: string; href?: string };

/**
 * Shell for every admin page: the portal header, a section switcher with the current section marked, breadcrumbs,
 * then the page heading and content. The page itself must call requirePortalUser("ADMIN") before rendering.
 * Pass `crumbs` for a page deeper than its section, such as a profile; otherwise the section is the only step.
 */
export default function AdminFrame({
  title,
  description,
  active,
  crumbs,
  children,
}: {
  title: string;
  description: string;
  active: AdminSectionHref;
  crumbs?: AdminCrumb[];
  children: ReactNode;
}) {
  const current = SECTIONS.find((section) => section.href === active);
  const trail: AdminCrumb[] =
    crumbs ?? (current && current.href !== "/portal/admin" ? [{ label: current.label }] : []);
  return (
    <PortalFrame eyebrow="Admin Portal" title={title}>
      <nav aria-label="Breadcrumb" className="mb-3 text-[0.8125rem] text-muted">
        <ol className="flex flex-wrap gap-1.5">
          <li>
            <Link href="/portal/admin" className="hover:text-ink hover:underline">
              Admin
            </Link>
          </li>
          {trail.map((crumb, index) => (
            <li key={`${crumb.label}-${index}`} className="contents">
              <span aria-hidden="true">/</span>
              {index === trail.length - 1 || !crumb.href ? (
                <span aria-current={index === trail.length - 1 ? "page" : undefined} className="text-ink">
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className="hover:text-ink hover:underline">
                  {crumb.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <nav aria-label="Admin sections" className="mb-6 flex flex-wrap gap-2">
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
