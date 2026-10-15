import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import AuthBackground from "@/components/auth/AuthBackground";
import AuthShell from "@/components/auth/AuthShell";
import SignupForm from "@/components/auth/SignupForm";
import { getPublicPackageCatalog } from "@/lib/packages/catalog";

export const metadata: Metadata = {
  title: "Student Registration | Riyona Driving School",
  description: "Register as a new student with Riyona Driving School and choose your training package.",
  robots: { index: false, follow: false },
};

export default async function SignupPage() {
  // Rendered per request, so a package deactivated in the database disappears from the list right away.
  await connection();
  const catalog = await getPublicPackageCatalog();

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
        aside={
          <Link
            href="/application-status"
            className="glass flex flex-col gap-2 rounded-2xl p-5 transition-colors hover:bg-gold-soft/40"
          >
            <span className="text-[1rem] font-bold text-ink">Already applied?</span>
            <span className="text-[0.875rem] leading-relaxed text-muted">
              Enter your reference number and password to see your payment status, or to send a new payment slip.
            </span>
            <span className="mt-1 text-[0.9375rem] font-semibold text-gold-ink">Check application status →</span>
          </Link>
        }
        scrollableCard
        cardClassName="lg:w-[540px] lg:justify-self-end lg:-translate-x-10 xl:-translate-x-20"
      >
        <SignupForm catalog={catalog} />
      </AuthShell>
    </>
  );
}
