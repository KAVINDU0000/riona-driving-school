import Image from "next/image";
import { site } from "@/data/landing";
import { Container } from "./primitives";

const columns = [
  {
    title: "Driving Lessons",
    links: ["Car (Auto & Manual)", "Van Lessons", "Motorbike (A/L)", "Three-Wheeler"],
  },
  {
    title: "Learning Resources",
    links: ["Learner Permit Guide", "Online Practice Papers", "DMT Medical & Registration", "Road Signs & Rules"],
  },
  {
    title: "Contact",
    links: [site.phone, "Colombo & Western Province"],
  },
];

export default function Footer() {
  return (
    <footer id="contact" className="border-t border-line bg-white/60 pt-14 pb-8 backdrop-blur">
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
              <span className="text-[0.9375rem] font-bold tracking-[0.02em] text-ink">RIYONA DRIVING ACADEMY</span>
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
                {col.links.map((l) => (
                  <li key={l} className="text-[0.8125rem] text-muted">
                    {l}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-[0.75rem] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Riyona Driving Academy. All rights reserved.</p>
          <div className="flex gap-5">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Sitemap</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
