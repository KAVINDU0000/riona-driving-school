import type { ReactNode } from "react";
import StudentBreadcrumbs from "@/components/student/StudentBreadcrumbs";

/** Title, one-line description and breadcrumb at the top of every student page. */
export default function PageIntro({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 pb-3 pt-1 lg:sticky lg:top-0 lg:z-10">
      <div>
        <StudentBreadcrumbs current={title} />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[1.75rem] font-bold leading-tight tracking-[-0.02em] text-ink md:text-[2rem]">
            {title}
          </h1>
          <p className="mt-1.5 max-w-2xl text-[0.9375rem] text-muted">
            {description}
          </p>
        </div>
        {actions}
      </div>
    </div>
  );
}
