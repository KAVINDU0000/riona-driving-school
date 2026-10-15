import type { Metadata } from "next";
import Link from "next/link";
import AuthBackground from "@/components/auth/AuthBackground";
import AuthShell from "@/components/auth/AuthShell";
import PaymentForm from "@/components/auth/PaymentForm";
import { getPublicPackage } from "@/lib/packages/catalog";
import { formatPackagePrice, isPerSession } from "@/lib/packages/format";

export const metadata: Metadata = {
  title: "Complete Payment | Riyona Driving School",
  description: "Pay for your selected training package and upload your payment slip.",
  robots: { index: false, follow: false },
};

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ package?: string }>;
}) {
  const { package: packageId } = await searchParams;
  // Read from the database on every request. A package that is no longer active is treated as not offered.
  const pkg = packageId ? await getPublicPackage(packageId) : null;
  const notOffered = Boolean(packageId) && !pkg;

  return (
    <>
      <AuthBackground intensity="strong" />
      <AuthShell
        align="start"
        scrollableCard
        eyebrow="Step 2 of 2"
        title="Complete Payment"
        body="Pay for your chosen package by bank transfer or bank deposit, then upload your payment slip for review."
        points={[
          { icon: "wallet", text: "Bank transfer or bank deposit" },
          { icon: "file-check", text: "Upload a JPG, PNG or PDF slip" },
          { icon: "shield-check", text: "Student ID issued after approval" },
        ]}
      >
        {pkg && isPerSession(pkg) ? (
          <div className="flex flex-col gap-4">
            <h2 className="text-[1.5rem] font-bold leading-tight tracking-[-0.02em] text-ink">Per-session package</h2>
            <p className="text-[0.9375rem] leading-relaxed text-muted">
              {pkg.name} is charged per session at {formatPackagePrice(pkg)}. The number of sessions and the total fee are
              agreed with the school, so there is no online payment for this package yet.
            </p>
            <Link
              href="/signup"
              className="inline-flex w-full items-center justify-center rounded-xl bg-gold px-6 py-3.5 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] transition-colors hover:bg-gold-dark"
            >
              Choose another package
            </Link>
          </div>
        ) : pkg ? (
          <>
            <div className="mb-6">
              <h2 className="text-[1.5rem] font-bold leading-tight tracking-[-0.02em] text-ink">Payment</h2>
              <p className="mt-1.5 text-[0.875rem] text-muted">Check your package, then complete the payment below.</p>
            </div>
            <PaymentForm pkg={pkg} />
          </>
        ) : (
          <div className="flex flex-col gap-4">
            <h2 className="text-[1.5rem] font-bold leading-tight tracking-[-0.02em] text-ink">
              {notOffered ? "Package not offered" : "No package selected"}
            </h2>
            <p className="text-[0.9375rem] leading-relaxed text-muted">
              {notOffered
                ? "That package is no longer offered, so it cannot be paid for online. Choose another package in the registration form."
                : "Choose a training package in the registration form first, then you will be taken to payment."}
            </p>
            <Link
              href="/signup"
              className="inline-flex w-full items-center justify-center rounded-xl bg-gold px-6 py-3.5 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] transition-colors hover:bg-gold-dark"
            >
              Go to registration
            </Link>
          </div>
        )}
      </AuthShell>
    </>
  );
}
