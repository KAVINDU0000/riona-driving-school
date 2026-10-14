import type { Metadata } from "next";
import RoleLoginForm, { type LoginRole } from "@/components/auth/RoleLoginForm";

export const metadata: Metadata = {
  title: "Login | Riyona Driving School",
  description: "Sign in to the Riyona Driving School portal as a student, instructor or admin.",
  robots: { index: false, follow: false },
};

const roles: LoginRole[] = ["student", "instructor", "admin"];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; reason?: string }>;
}) {
  const { role, reason } = await searchParams;
  const initialRole = roles.find((value) => value === role) ?? "student";
  const notice = reason === "expired" ? "Your session has ended. Please sign in again." : undefined;

  return <RoleLoginForm initialRole={initialRole} notice={notice} />;
}
