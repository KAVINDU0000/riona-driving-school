import type { ReactNode } from "react";
import Footer from "@/components/landing/Footer";
import Navbar from "@/components/landing/Navbar";
import FloatingWhatsApp from "@/components/landing/FloatingWhatsApp";

/** Shared shell for the public pages: skip link, the site header, the page content, footer and WhatsApp button. */
export default function PublicFrame({ children }: { children: ReactNode }) {
  return (
    <div className="landing-theme flex min-h-screen flex-col">
      <div className="page-atmosphere" aria-hidden="true" />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-ink focus:ring-2 focus:ring-gold"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="flex-1 pt-10 pb-16 md:pt-14 md:pb-20">
        {children}
      </main>
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
