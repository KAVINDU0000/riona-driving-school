import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import AccountMenu from "@/components/auth/AccountMenu";
import { Container, Eyebrow } from "@/components/landing/primitives";

interface PortalFrameProps {
  eyebrow: string;
  title: string;
  children: ReactNode;
}

/** Shared frame for the signed-in portals: header with account navigation, then the portal card. */
export default function PortalFrame({ eyebrow, title, children }: PortalFrameProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="page-atmosphere" aria-hidden="true" />

      <header className="sticky top-0 z-50 pt-5">
        <div className="w-full px-4 md:px-8">
          <nav className="glass flex h-[88px] items-center gap-6 rounded-[18px] px-5 shadow-[0_12px_40px_-16px_rgb(40_60_90/0.16)] backdrop-blur-2xl">
            <Link href="/" className="flex shrink-0 items-center gap-3">
              <Image
                src="/images/logo-riyona.jpg"
                alt="Riyona Driving School logo"
                width={44}
                height={44}
                className="h-11 w-11 rounded-full object-cover ring-1 ring-line"
              />
              <span className="whitespace-nowrap text-[0.9375rem] font-bold tracking-[0.02em] text-ink">RIYONA DRIVING SCHOOL</span>
            </Link>
            <div className="ml-auto">
              <AccountMenu />
            </div>
          </nav>
        </div>
      </header>

      <main className="glow-hero flex-1 pt-10 pb-16 md:pt-14 md:pb-20">
        <Container>
          <section className="glass rounded-[28px] p-6 shadow-[0_20px_50px_-20px_rgb(40_60_90/0.25)] md:p-10">
            <span className="inline-flex items-center gap-2 rounded-full bg-gold-soft px-3.5 py-1.5 ring-1 ring-gold/60">
              <Eyebrow className="mb-0">{eyebrow}</Eyebrow>
            </span>
            <h1 className="mt-6 text-[2.25rem] font-bold leading-[1.1] tracking-[-0.03em] text-ink md:text-[2.75rem]">
              {title}
              <span className="text-gold-dark">.</span>
            </h1>
            <div className="mt-6 text-[0.9375rem] leading-[1.7] text-muted">{children}</div>
          </section>
        </Container>
      </main>
    </div>
  );
}
