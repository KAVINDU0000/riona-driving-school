import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Riyona Driving School | Professional Driving Lessons in Sri Lanka",
  description:
    "Professional driving school in Sri Lanka offering quality driving lessons, training packages, and DMT exam preparation. Government-approved instructors with proven success rates.",
  openGraph: {
    title: "Riyona Driving Academy",
    description:
      "Learn to drive with confidence from experienced instructors. Government-approved driving school in Sri Lanka.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={{ backgroundColor: '#EEF3FA' }}>{children}</body>
    </html>
  );
}
