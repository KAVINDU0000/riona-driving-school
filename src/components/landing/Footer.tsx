import Image from "next/image";
import Link from "next/link";
import { site } from "@/data/landing";
import { publicContact } from "@/data/public";
import { Container } from "./primitives";

/** Every link goes to a page that exists. Pages that do not exist yet (privacy, terms) are not listed. */
const columns = [
  {
    title: "Training",
    links: [
      { label: "Packages and pricing", href: "/packages" },
      { label: "Daily individual training", href: "/packages/daily-rates" },
      { label: "Trial preparation", href: "/packages/trial-preparation" },
      { label: "Vehicle categories", href: "/vehicles" },
    ],
  },
  {
    title: "School",
    links: [
      { label: "About the school", href: "/about" },
      { label: "Cash discount", href: "/cash-discount" },
      { label: "Apply now", href: "/signup" },
      { label: "Sign in", href: "/login" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-line bg-white/60 pt-14 pb-8 backdrop-blur">
      <Container>
        <div className="grid gap-10 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/images/logo-riyona.jpg"
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover ring-1 ring-line"
              />
              <span className="text-[0.9375rem] font-bold tracking-[0.02em] text-ink">RIYONA DRIVING SCHOOL</span>
            </div>
            <p className="max-w-[300px] text-[0.8125rem] leading-[1.7] text-muted">
              Sri Lanka&apos;s trusted driving academy. Independent, safety-first driver training, with DMT-approved
              instructors and dual-control vehicles.
            </p>
            <span className="inline-flex w-fit rounded-full bg-gold-soft px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gold-ink">
              DMT Approved · Werahera
            </span>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-[0.75rem] font-bold uppercase tracking-[0.12em] text-ink">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[0.8125rem] text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="text-[0.75rem] font-bold uppercase tracking-[0.12em] text-ink">Contact</p>
            <ul className="mt-4 space-y-2.5 text-[0.8125rem] text-muted">
              <li>
                <a href={site.phoneHref} className="hover:text-ink">
                  {site.phone}
                </a>
              </li>
              <li>
                <a href={publicContact.whatsapp} target="_blank" rel="noopener noreferrer" className="hover:text-ink">
                  WhatsApp
                </a>
              </li>
              <li>{publicContact.address}</li>
              <li>
                <Link href="/contact" className="hover:text-ink">
                  Contact page
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-[0.75rem] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Riyona Driving School. All rights reserved.</p>
        </div>
      </Container>
    </footer>
  );
}
