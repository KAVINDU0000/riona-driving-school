"use client";

import Image from "next/image";
import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { navLinks, site } from "@/data/home";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [active, setActive] = useState(navLinks[0].href);

  return (
    <header className="sticky top-0 z-50 px-4 pt-4 md:px-8 md:pt-6">
      <div className="max-w-[1424px] mx-auto rounded-2xl bg-white/90 backdrop-blur-xl shadow-float">
        <nav className="flex items-center gap-4 px-4 py-3 md:px-6">
          {/* Brand */}
          <a href="#home" className="flex items-center gap-3 shrink-0">
            <Image
              src="/images/logo.jpg"
              alt=""
              width={72}
              height={72}
              className="h-9 w-9 rounded-full object-cover ring-1 ring-line"
            />
            <span className="text-[0.9375rem] font-bold tracking-[-0.01em] text-ink whitespace-nowrap">
              RIYONA DRIVING ACADEMY
            </span>
          </a>

          {/* Primary navigation */}
          <ul className="hidden xl:flex items-center gap-1 ml-4">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setActive(link.href)}
                  className={`block rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                    active === link.href
                      ? "bg-gold-soft text-ink ring-1 ring-gold"
                      : "text-muted hover:text-ink hover:bg-page"
                  }`}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          {/* Contact actions */}
          <div className="hidden lg:flex items-center gap-4 ml-auto">
            <a
              href={site.phoneHref}
              className="flex items-center gap-2 text-sm font-medium text-ink hover:text-gold-ink transition-colors"
            >
              <span>{site.phone}</span>
              <Icon name="phone" className="w-4 h-4" />
            </a>

            <a
              href={site.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-ink hover:bg-gold-dark transition-colors"
            >
              WhatsApp
              <Icon name="chat" className="w-4 h-4" />
            </a>

            <a
              href="#portal"
              aria-label="Student portal"
              className="grid h-9 w-9 place-items-center rounded-full bg-page text-muted ring-1 ring-line hover:text-ink transition-colors"
            >
              <Icon name="user" className="w-[18px] h-[18px]" />
            </a>
          </div>

          {/* Mobile toggle */}
          <button
            className="ml-auto grid h-10 w-10 place-items-center rounded-xl text-ink xl:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={mobileMenuOpen ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"}
              />
            </svg>
          </button>
        </nav>

        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-line px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => {
                  setActive(link.href);
                  setMobileMenuOpen(false);
                }}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted hover:bg-page hover:text-ink"
              >
                {link.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-3">
              <a
                href={site.phoneHref}
                className="flex items-center gap-2 px-3 text-sm font-medium text-ink"
              >
                <Icon name="phone" className="w-4 h-4" />
                {site.phone}
              </a>
              <a
                href={site.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-ink"
              >
                WhatsApp
                <Icon name="chat" className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
