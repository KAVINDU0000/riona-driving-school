import type { ReactNode } from "react";
import { requirePortalUser } from "@/lib/auth/portal-guard";

/**
 * Every instructor page is behind this guard: a signed-in, active instructor, checked on each render. Pages still call
 * requirePortalUser for the user ID, so removing this layout would not open any page.
 */
export default async function InstructorLayout({ children }: { children: ReactNode }) {
  await requirePortalUser("INSTRUCTOR");
  return children;
}
