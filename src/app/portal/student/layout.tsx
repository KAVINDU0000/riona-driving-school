import type { Metadata } from "next";
import type { ReactNode } from "react";
import StudentLayout from "@/components/student/StudentLayout";
import { requirePortalUser } from "@/lib/auth/portal-guard";

export const metadata: Metadata = {
  title: "Student portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

/** Every student page sits inside this layout. Signed-out and wrong-role visitors are redirected before anything renders. */
export default async function StudentPortalLayout({ children }: { children: ReactNode }) {
  const user = await requirePortalUser("STUDENT");
  return <StudentLayout studentId={user.userId}>{children}</StudentLayout>;
}
