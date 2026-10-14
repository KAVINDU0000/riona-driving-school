import type { Metadata } from "next";
import AuthBackground from "@/components/auth/AuthBackground";
import AuthShell from "@/components/auth/AuthShell";
import { ConfirmEmailPanel } from "@/components/auth/AccountActionForms";

export const metadata: Metadata = {
  title: "Confirm email | Riyona Driving School",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ConfirmEmailPage({
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
        title="Confirm email"
        body="Confirming this link switches your account to the new email address."
        points={[
          { icon: "mail", text: "Confirms the address you entered" },
          { icon: "shield-check", text: "Link works once and expires in 60 minutes" },
        ]}
      >
        <ConfirmEmailPanel token={typeof token === "string" && token ? token : null} />
      </AuthShell>
    </>
  );
}
