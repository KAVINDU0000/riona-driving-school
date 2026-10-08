import Image from "next/image";
import { footerColumns, site } from "@/data/home";

export default function Footer() {
  return (
    <footer id="contact" className="bg-white pt-16 pb-8">
      <div className="max-w-[1240px] mx-auto px-6">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr_1fr_1fr] lg:gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/images/logo.jpg"
                alt=""
                width={72}
                height={72}
                className="h-11 w-11 rounded-full object-cover ring-1 ring-line"
              />
              <span className="text-[1.0625rem] font-bold tracking-[-0.01em] text-ink">RIYONA ACADEMY</span>
            </div>

            <p className="mt-6 max-w-[20rem] text-[0.8125rem] leading-relaxed text-muted">
              Sri Lanka&rsquo;s benchmark automotive mastery and certification institution. Empowering independent,
              safety-first drivers with dual-control modern fleet training.
            </p>

            <p className="mt-6 inline-block rounded-md border border-gold px-3 py-2 font-mono text-[0.6875rem] text-gold-ink">
              DMT Official Reg: {site.registration}
            </p>
          </div>

          {/* Link columns */}
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-ink">{column.title}</h2>
              <ul className="mt-6 space-y-4">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[0.8125rem] leading-snug text-muted hover:text-ink transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Legal bar */}
        <div className="mt-14 flex flex-col gap-4 border-t border-line pt-6 md:flex-row md:items-center md:justify-between">
          <p className="text-[0.6875rem] text-muted">
            © {site.name}. All rights reserved. Government approved driver education in Sri Lanka.
          </p>

          <div className="flex items-center gap-7">
            <a href="#privacy" className="text-[0.6875rem] text-muted hover:text-ink transition-colors">
              Privacy Policy
            </a>
            <a href="#terms" className="text-[0.6875rem] text-muted hover:text-ink transition-colors">
              Terms of Use
            </a>
            <a href="#home" className="text-[0.6875rem] text-muted hover:text-ink transition-colors">
              Back to top ↑
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
