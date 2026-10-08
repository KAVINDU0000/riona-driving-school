import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Admin Login | Riyona Driving School",
  description: "Staff sign-in for the Riyona Driving School admin console.",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <AuthShell
      eyebrow="Admin Console"
      title="Staff Sign In"
      body="Restricted to school administrators. Manage student records, instructors and vehicles from one secure console."
      points={[
        { icon: "users", text: "Manage student records" },
        { icon: "car", text: "Schedule instructors and vehicles" },
        { icon: "file-check", text: "Track licence progress" },
      ]}
    >
      <LoginForm
        identifierLabel="Admin email"
        identifierPlaceholder="you@example.com"
        identifierType="email"
        identifierIcon="mail"
        submitLabel="Sign in to console"
        footnote="Admin access is by invitation only. Contact the school owner to request an account."
      />
    </AuthShell>
  );
}
