import type { Metadata } from "next";
import { connection } from "next/server";
import AuthBackground from "@/components/auth/AuthBackground";
import AuthShell from "@/components/auth/AuthShell";
import SignupForm from "@/components/auth/SignupForm";
import { getActivePackageIds } from "@/lib/registration/packages";

export const metadata: Metadata = {
  title: "Student Registration | Riyona Driving School",
  description: "Register as a new student with Riyona Driving School and choose your training package.",
  robots: { index: false, follow: false },
};

export default async function SignupPage() {
  // Rendered per request, so a package deactivated in the database disappears from the list right away.
  await connection();
  const availablePackageIds = await getActivePackageIds();

  return (
    <>
      <AuthBackground intensity="strong" />
      <AuthShell
        align="start"
        eyebrow="New Student"
        title="Start Your Journey"
        body="Register once, choose the package that fits your licence goal and we will confirm your lessons with you."
        points={[
          { icon: "file-check", text: "Regular and trial preparation packages" },
          { icon: "car", text: "Daily training for extra vehicle types" },
          { icon: "wallet", text: "5% off when you pay in full in cash" },
        ]}
        scrollableCard
        cardClassName="lg:w-[540px] lg:justify-self-end lg:-translate-x-10 xl:-translate-x-20"
      >
        <SignupForm availablePackageIds={availablePackageIds} />
      </AuthShell>
    </>
  );
}
