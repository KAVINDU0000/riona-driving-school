import type { ReactNode } from "react";
import StudentHeader from "@/components/student/StudentHeader";
import StudentMobileNavigation from "@/components/student/StudentMobileNavigation";
import StudentSidebar from "@/components/student/StudentSidebar";

/**
 * Shared frame for every student page: header, sidebar on large screens, a horizontal section bar on smaller
 * screens, and the page content. Access is checked by the portal layout before this renders.
 */
export default function StudentLayout({ studentId, children }: { studentId: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:h-dvh lg:overflow-hidden [&_.glass]:border-slate-300/80 [&_.glass]:bg-white [&_.glass]:shadow-[0_10px_28px_-14px_rgb(15_23_42/0.28)]">
      <div className="page-atmosphere" aria-hidden="true" />
      <StudentHeader studentId={studentId} />

      <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-6 px-4 pb-16 pt-6 md:px-8 lg:min-h-0 lg:flex-row lg:gap-8 lg:pb-6">
        <StudentSidebar />
        <div className="flex min-w-0 flex-1 flex-col gap-5 lg:min-h-0 lg:overflow-y-auto lg:scroll-smooth lg:pr-1 lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden">
          <StudentMobileNavigation />
          <main id="student-main" className="flex min-w-0 flex-col gap-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
