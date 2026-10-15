import Image from "next/image";
import AccountMenu from "@/components/auth/AccountMenu";
import Icon from "@/components/ui/Icon";
import Link from "next/link";
import { DesktopNav, MobileNav } from "@/components/public/PublicNav";
import { site } from "@/data/landing";
/** Floating glass navigation surface that spans the full viewport width. `hideApply` removes the Apply now button. */
export default function Navbar({ hideApply = false }: { hideApply?: boolean }) {
  return (
    <header className="sticky top-0 z-50 pt-5">
      <div className="w-full px-4 md:px-8">
        <nav className="glass flex h-[88px] items-center gap-6 rounded-[18px] px-5 shadow-[0_12px_40px_-16px_rgb(40_60_90/0.16)] backdrop-blur-2xl">
          <a href="#home" className="flex shrink-0 items-center gap-3">
            <Image
              src="/images/logo-riyona.jpg"
              alt="Riyona Driving School logo"
              width={44}
              height={44}
              className="h-11 w-11 rounded-full object-cover ring-1 ring-line"
            />
            <span className="whitespace-nowrap text-[0.9375rem] font-bold tracking-[0.02em] text-ink">
              RIYONA DRIVING SCHOOL
            </span>
          </a>

          <DesktopNav />

          <div className="ml-auto hidden items-center gap-4 lg:flex">
            <a href={site.phoneHref} className="flex items-center gap-2 text-[0.875rem] font-medium text-ink">
              <Icon name="phone" className="h-4 w-4" />
              {site.phone}
            </a>
            {!hideApply && (
              <Link
                href="/signup"
                className="inline-flex items-center rounded-xl px-4 py-2.5 text-[0.875rem] font-semibold text-ink ring-1 ring-line transition-colors hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
              >
                Apply now
              </Link>
            )}
            <a
              href={site.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-[0.875rem] font-semibold text-ink shadow-[0_8px_20px_-10px_rgba(232,164,0,0.8)] transition-colors hover:bg-gold-dark"
            >
              WhatsApp
              <Icon name="chat" className="h-4 w-4" />
            </a>
            <AccountMenu />
          </div>

          {/* Compact menu for smaller screens, no client JS needed */}
          <details className="group ml-auto lg:hidden">
            <summary className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-xl text-ink hover:bg-page">
              <span className="sr-only">Open menu</span>
              <Icon name="grid" className="h-5 w-5" />
            </summary>
            <div className="absolute left-4 right-4 top-[104px] space-y-1 rounded-2xl border border-white/60 bg-white/95 p-3 shadow-float backdrop-blur-xl md:left-10 md:right-10">
              <MobileNav />
              <a
                href={site.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block rounded-xl bg-gold px-5 py-3 text-center text-sm font-semibold text-ink"
              >
                WhatsApp
              </a>
              {!hideApply && (
                <Link href="/signup" className="mt-2 block rounded-xl px-5 py-3 text-center text-sm font-semibold text-ink ring-1 ring-line">
                  Apply now
                </Link>
              )}
              <div className="flex justify-center pt-2">
                <AccountMenu />
              </div>
            </div>
          </details>
        </nav>
      </div>
    </header>
  );
}
