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
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const initialRole = roles.find((value) => value === role) ?? "student";

  return <RoleLoginForm initialRole={initialRole} />;
}
