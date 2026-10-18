import type { ReactNode } from "react";
import InstructorSideFrame, { type InstructorSectionHref } from "@/components/instructor/InstructorSideFrame";

/**
 * Shell for every instructor page. It uses the same dark sidebar, top bar and heading as the admin portal
 * (InstructorSideFrame), so the instructor and admin portals look the same.
 */
export default function InstructorFrame({
  title,
  description,
  active,
  children,
}: {
  title: string;
  description: string;
  active: InstructorSectionHref;
  children: ReactNode;
}) {
  return (
    <InstructorSideFrame title={title} description={description} active={active}>
      {children}
    </InstructorSideFrame>
  );
}
