import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import SignupForm from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Student Registration | Riyona Driving School",
  description: "Register as a new student with Riyona Driving School and choose your training package.",
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="New Student"
      title="Start Your Journey"
      body="Register once, choose the package that fits your licence goal and we will confirm your lessons with you."
      points={[
        { icon: "file-check", text: "Regular and trial preparation packages" },
        { icon: "car", text: "Daily training for extra vehicle types" },
        { icon: "wallet", text: "5% off when you pay in full in cash" },
      ]}
    >
      <SignupForm />
    </AuthShell>
  );
}
