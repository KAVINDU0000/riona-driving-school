import type { Metadata } from "next";
import AuthBackground from "@/components/auth/AuthBackground";
import AuthShell from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/AccountActionForms";

export const metadata: Metadata = {
  title: "Choose a password | Riyona Driving School",
  robots: { index: false, follow: false },
  // Keeps the token in this URL out of the Referer header sent to other sites.
  referrer: "no-referrer",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <>
      <AuthBackground />
      <AuthShell
        eyebrow="Riyona Driving School"
        title="Choose a password"
        body="Set a new password for your account. Every device you are signed in on will be signed out."
        points={[
          { icon: "lock", text: "At least 8 characters" },
          { icon: "shield-check", text: "Single-use link" },
          { icon: "users", text: "Signs out other devices" },
        ]}
      >
        <ResetPasswordForm token={typeof token === "string" && token ? token : null} />
      </AuthShell>
    </>
  );
}
