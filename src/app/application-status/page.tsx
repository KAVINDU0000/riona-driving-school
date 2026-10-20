import type { Metadata } from "next";
import AuthBackground from "@/components/auth/AuthBackground";
import ApplicationStatus from "@/components/auth/ApplicationStatus";
import AuthShell from "@/components/auth/AuthShell";

export const metadata: Metadata = {
  title: "Application Status | Riyona Driving School",
  description: "Check your application and payment status, or send a new payment slip.",
  robots: { index: false, follow: false },
};

export default async function ApplicationStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const { reference } = await searchParams;
  // Filled in when the student comes from the enrollments page. The password is still typed by the student.
  const initialReference = reference && /^RDS-[0-9A-F]{10}$/.test(reference) ? reference : undefined;

  return (
    <>
      <AuthBackground intensity="strong" />
      <AuthShell
        align="start"
        wideCard
        cardClassName="lg:-translate-x-10 xl:-translate-x-20"
        eyebrow="Your application"
        title="Application Status"
        body="See whether your payment has been approved, or send a new payment slip if it was rejected."
        points={[
          { icon: "file-check", text: "Reference number and password from signup" },
          { icon: "shield-check", text: "Your details are only shown to you" },
          { icon: "wallet", text: "Resubmit with the same bank details" },
        ]}
      >
        <ApplicationStatus initialReference={initialReference} />
      </AuthShell>
    </>
  );
}
