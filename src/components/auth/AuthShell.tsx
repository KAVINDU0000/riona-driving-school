import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import Icon from "@/components/ui/Icon";
import { Container, Eyebrow, IconTile } from "@/components/landing/primitives";
import { site } from "@/data/landing";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  body: string;
  points: { icon: string; text: string }[];
  /** Optional card shown under the points on the left, for example a link to the application status page. */
  aside?: ReactNode;
  children: ReactNode;
  /** Extra classes for the form card, e.g. to nudge it along the row on large screens. */
  cardClassName?: string;
  /** "start" pins both columns to the top, for tall forms; "center" vertically centres them. */
  align?: "center" | "start";
  /** On large screens, use a wider form card, for long forms. The page still scrolls as a whole. */
  wideCard?: boolean;
  /** On large screens, keep the whole page fixed to the viewport with no page scrollbar. */
  fixedPage?: boolean;
  /** "soft" uses a lighter, more transparent backdrop with less yellow, for the login and sign-up pages. */
  tone?: "default" | "soft";
}

/** Shared frame for the role login pages: landing header, atmosphere, copy column and form card. */
export default function AuthShell({
  eyebrow,
  title,
  body,
  points,
  aside,
  children,
  cardClassName = "",
  align = "center",
  wideCard = false,
  fixedPage = false,
  tone = "default",
}: AuthShellProps) {
  const isSoft = tone === "soft";

  return (
    <div className={`flex min-h-screen flex-col ${fixedPage ? "lg:h-screen lg:overflow-clip" : ""}`}>
      <div className={isSoft ? "soft-atmosphere" : "page-atmosphere"} aria-hidden="true" />

      <header className="sticky top-0 z-50 pt-3 sm:pt-5">
        <div className="w-full px-4 md:px-8">
          <nav className="glass flex h-[72px] items-center gap-3 rounded-[18px] px-4 shadow-[0_12px_40px_-16px_rgb(40_60_90/0.16)] backdrop-blur-2xl sm:h-[88px] sm:gap-6 sm:px-5">
            <Link href="/" className="flex shrink-0 items-center gap-3">
              <Image
                src="/images/logo-riyona.jpg"
                alt="Riyona Driving School logo"
                width={44}
                height={44}
                className="h-11 w-11 rounded-full object-cover ring-1 ring-line"
              />
              {/* Full name only where there is room beside the back link; the logo identifies the school on phones */}
              <span className="hidden whitespace-nowrap text-[0.9375rem] font-bold tracking-[0.02em] text-ink sm:block">
                RIYONA DRIVING SCHOOL
              </span>
            </Link>

            <div className="ml-auto flex items-center gap-1">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[0.875rem] font-medium text-muted transition-colors hover:bg-page hover:text-ink"
              >
                <Icon name="arrow-left" className="h-4 w-4" />
                Back to home
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main
        className={`${isSoft ? "soft-glow" : "glow-hero"} flex-1 pt-10 pb-16 md:pt-14 md:pb-20 ${
          fixedPage ? "lg:flex lg:min-h-0 lg:flex-col lg:justify-center lg:py-8" : ""
        }`}
      >
        <Container>
          <div
            className={`grid gap-12 ${
              wideCard
                ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,540px)]"
                : "lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]"
            } lg:gap-[clamp(32px,5vw,96px)] ${
              align === "start" ? "lg:items-start" : "items-center"
            }`}
          >
            {/* Copy */}
            <div className="flex flex-col items-start">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 ${
                  isSoft ? "bg-white/60 ring-1 ring-line" : "bg-gold-soft ring-1 ring-gold/60"
                }`}
              >
                <Icon name="badge-check" className="h-4 w-4 text-gold-ink" />
                <Eyebrow className="mb-0">{eyebrow}</Eyebrow>
              </span>

              <h1 className="mt-6 text-[2.75rem] font-bold leading-[1.05] tracking-[-0.03em] text-ink md:text-[clamp(44px,4vw,68px)]">
                {title}
                <span className="text-gold-dark">.</span>
              </h1>

              <p className="mt-5 max-w-[500px] text-[0.9375rem] leading-[1.7] text-muted">{body}</p>

              <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {points.map((point) => (
                  <li key={point.text} className="glass flex items-center gap-3 rounded-2xl p-3.5 pr-5">
                    <IconTile tone="success">
                      <Icon name={point.icon} className="h-5 w-5" />
                    </IconTile>
                    <span className="text-[0.9375rem] font-semibold text-ink">{point.text}</span>
                  </li>
                ))}
              </ul>

              {aside && <div className="mt-6">{aside}</div>}
            </div>

            {/* Form card */}
            <div
              className={`${isSoft ? "glass-soft" : "glass"} rounded-[28px] p-6 shadow-[0_20px_50px_-20px_rgb(40_60_90/0.25)] md:p-10 ${cardClassName}`}
            >
              {children}

              <p className="mt-8 flex items-center justify-center gap-2 border-t border-line pt-6 text-[0.8125rem] text-muted">
                <Icon name="shield-check" className="h-4 w-4 text-success" />
                Government approved · Registered with DMT Sri Lanka
              </p>
            </div>
          </div>
        </Container>
      </main>

      <footer className="shrink-0 border-t border-line bg-white/60 py-6 backdrop-blur">
        <Container>
          <p className="text-center text-[0.8125rem] text-muted">
            © {new Date().getFullYear()} Riyona Driving School · {site.phone}
          </p>
        </Container>
      </footer>
    </div>
  );
}
