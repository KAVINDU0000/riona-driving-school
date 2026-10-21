import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import AccountMenu from "@/components/auth/AccountMenu";
import Icon from "@/components/ui/Icon";

/**
 * Only sections that have a page. A section is added here when its page exists, so the navigation has no dead links.
 * Sections are grouped the way staff look for them: overview, applications, people, then the school's fleet and prices.
 */
const SECTIONS = [
  { href: "/portal/admin", label: "Dashboard", icon: "grid", group: "Overview" },
  { href: "/portal/admin/registrations", label: "Registrations", icon: "file-check", group: "Admissions" },
  { href: "/portal/admin/students", label: "Students", icon: "users", group: "People" },
  { href: "/portal/admin/instructors", label: "Instructors", icon: "user", group: "People" },
  { href: "/portal/admin/vehicles", label: "Vehicles", icon: "car", group: "School" },
  { href: "/portal/admin/packages", label: "Packages", icon: "wallet", group: "School" },
] as const;

const GROUP_LABELS = ["Overview", "Admissions", "People", "School"] as const;

const GROUPS = GROUP_LABELS.map((label) => ({
  label,
  items: SECTIONS.filter((section) => section.group === label),
}));

export type AdminSectionHref = (typeof SECTIONS)[number]["href"];

/** One step of the breadcrumb trail. The last step is the current page and has no link. */
export type AdminCrumb = { label: string; href?: string };

/**
 * Shell for every admin page: a dark sidebar with grouped sections (the current one highlighted), a top bar with
 * breadcrumbs and the account menu, then the page heading and content. On small screens the sidebar becomes a
 * horizontally scrolling row. The page itself must call requirePortalUser("ADMIN") before rendering.
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
    <div className="relative min-h-screen bg-page lg:flex lg:h-dvh lg:overflow-hidden">
      <div className="page-atmosphere" aria-hidden="true" />

      <aside className="relative z-20 bg-ink text-white lg:sticky lg:top-0 lg:h-screen lg:w-[264px] lg:shrink-0 lg:overflow-y-auto">
        <div className="flex items-center gap-3 px-5 pb-3 pt-5 lg:pb-5 lg:pt-7">
          <Link href="/portal/admin" className="flex items-center gap-3">
            <Image
              src="/images/logo-riyona.jpg"
              alt="Riyona Driving School logo"
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-white/15"
            />
            <span className="min-w-0">
              <span className="block whitespace-nowrap text-[0.9375rem] font-bold tracking-[0.02em]">RIYONA</span>
              <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-gold">Admin portal</span>
            </span>
          </Link>
        </div>

        <nav aria-label="Admin sections" className="flex gap-6 overflow-x-auto px-3 pb-4 lg:block lg:overflow-visible lg:px-4 lg:pb-8">
          {GROUPS.map((group) => (
            <div key={group.label} className="shrink-0 lg:mt-6 lg:first:mt-0">
              <p className="mb-2 hidden px-3 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-white/40 lg:block">
                {group.label}
              </p>
              <ul className="flex gap-1 lg:grid lg:gap-1">
                {group.items.map((section) => {
                  const isActive = active === section.href;
                  return (
                    <li key={section.href}>
                      <Link
                        href={section.href}
                        aria-current={isActive ? "page" : undefined}
                        className={`group relative flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-[0.9375rem] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                          isActive ? "bg-white/10 text-gold" : "text-white/75 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {isActive && (
                          <span aria-hidden="true" className="absolute -left-3 top-1/2 hidden h-6 w-1 -translate-y-1/2 rounded-r-full bg-gold lg:block" />
                        )}
                        <span
                          aria-hidden="true"
                          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                            isActive ? "bg-gold text-ink" : "bg-white/5 text-white/70 group-hover:text-white"
                          }`}
                        >
                          <Icon name={section.icon} className="h-[17px] w-[17px]" />
                        </span>
                        {section.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col lg:min-h-0">
        <header className="sticky top-0 z-30 px-4 pt-5 md:px-8">
          <div className="glass flex h-[88px] items-center justify-between gap-4 rounded-[18px] px-5 shadow-[0_12px_40px_-16px_rgb(40_60_90/0.16)] backdrop-blur-2xl">
            <nav aria-label="Breadcrumb" className="min-w-0 text-[0.8125rem] text-muted">
              <ol className="flex flex-wrap items-center gap-1.5">
                <li>
                  <Link href="/portal/admin" className="hover:text-ink hover:underline">
                    Admin
                  </Link>
                </li>
                {trail.map((crumb, index) => (
                  <li key={`${crumb.label}-${index}`} className="contents">
                    <span aria-hidden="true" className="text-muted/60">
                      /
                    </span>
                    {index === trail.length - 1 || !crumb.href ? (
                      <span aria-current={index === trail.length - 1 ? "page" : undefined} className="font-semibold text-ink">
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
            <div className="flex shrink-0 items-center gap-3">
              <Link
                href="/"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-[0.875rem] font-semibold text-ink shadow-[0_1px_2px_rgba(16,27,48,0.04)] transition-colors hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 10.5 12 3l9 7.5" />
                  <path d="M5 9.5V20h14V9.5" />
                </svg>
                Home
              </Link>
              <AccountMenu />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pb-16 pt-8 md:px-8 md:pt-10 lg:min-h-0 lg:overflow-y-auto lg:scroll-smooth lg:pt-0 lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden">
          <div className="mx-auto max-w-[1280px]">
            <div className="lg:sticky lg:top-0 lg:z-10 lg:pt-10">
              <h1 className="text-[2rem] font-bold leading-[1.1] tracking-[-0.03em] text-ink md:text-[2.25rem] [animation:title-fade_linear_both] [animation-range:64px_74px] [animation-timeline:scroll(nearest)] motion-reduce:[animation:none]">
                {title}
                <span className="text-gold-dark">.</span>
              </h1>
              <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-muted [animation:title-fade_linear_both] [animation-range:32px_38px] [animation-timeline:scroll(nearest)] motion-reduce:[animation:none]">
                {description}
              </p>
            </div>
            <div className="mt-8">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
