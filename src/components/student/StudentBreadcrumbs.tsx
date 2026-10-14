import Link from "next/link";

/** Breadcrumb trail: Student portal / section. The current page is marked with aria-current. */
export default function StudentBreadcrumbs({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[0.8125rem] text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href="/portal/student/dashboard" className="hover:text-ink">
            Student portal
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="font-semibold text-ink">
          {current}
        </li>
      </ol>
    </nav>
  );
}
