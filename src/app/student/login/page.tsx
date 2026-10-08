import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";
import { site } from "@/data/landing";

export const metadata: Metadata = {
  title: "Student Login | Riyona Driving School",
  description: "Sign in to your Riyona Driving School student portal to follow your lessons and licence progress.",
  robots: { index: false, follow: false },
};

export default function StudentLoginPage() {
  return (
    <AuthShell
      eyebrow="Student Portal"
      title="Welcome Back"
      body="Sign in to follow your lessons, practise papers and licence progress. Your instructor is only a message away."
      points={[
        { icon: "calendar", text: "Your lesson schedule in one place" },
        { icon: "book", text: "Past papers and learning resources" },
        { icon: "user", text: "Direct contact with your instructor" },
      ]}
    >
      <LoginForm
        identifierLabel="Student ID or email"
        identifierPlaceholder="e.g. RDS-2041 or you@email.com"
        identifierType="text"
        identifierIcon="id-card"
        submitLabel="Sign in to portal"
        footnote={
          <>
            New student?{" "}
            <a
              href={site.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-gold-ink hover:text-ink"
            >
              Message us on WhatsApp
            </a>
          </>
        }
      />
    </AuthShell>
  );
}
