import type { Metadata } from "next";
import AuthBackground from "@/components/auth/AuthBackground";
import AuthShell from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/AccountActionForms";

export const metadata: Metadata = {
  title: "Forgot password | Riyona Driving School",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthBackground />
      <AuthShell
        eyebrow="Riyona Driving School"
        title="Reset password"
        body="Enter the email address on your account. If it matches an account, we will send a link to choose a new password."
        points={[
          { icon: "mail", text: "Reset link sent by email" },
          { icon: "lock", text: "Link works once and expires in 30 minutes" },
          { icon: "shield-check", text: "Signing in again on other devices is required" },
        ]}
      >
        <ForgotPasswordForm />
      </AuthShell>
    </>
  );
}
