"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { faqs, site } from "@/data/home";

export default function FAQ() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section id="faq" className="pb-20 md:pb-28">
      <div className="max-w-[1240px] mx-auto px-6">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.4fr] lg:gap-16">
          {/* Intro */}
          <div>
            <p className="eyebrow">Here To Help</p>
            <h2 className="mt-4 text-[1.875rem] md:text-[2.5rem] font-bold leading-[1.14] tracking-[-0.025em] text-ink">
              A little clarity before your first drive.
            </h2>
            <p className="mt-5 max-w-[22rem] text-[0.875rem] leading-relaxed text-muted">
              Find answers to the questions learners ask most. Need something else? Talk to Riyona.
            </p>

            <a
              href={site.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-ink shadow-card hover:shadow-float transition-shadow"
            >
              Ask on WhatsApp
              <Icon name="chat" className="w-4 h-4" />
            </a>
          </div>

          {/* Accordion */}
          <div className="space-y-4">
            {faqs.map((faq) => {
              const open = openId === faq.id;
              return (
                <div key={faq.id} className="rounded-2xl bg-white shadow-card">
                  <h3>
                    <button
                      onClick={() => setOpenId(open ? null : faq.id)}
                      aria-expanded={open}
                      aria-controls={`answer-${faq.id}`}
                      className="flex w-full items-center justify-between gap-6 px-7 py-6 text-left"
                    >
                      <span className="text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink">
                        {faq.question}
                      </span>
                      <Icon
                        name={open ? "minus" : "plus"}
                        className="w-5 h-5 shrink-0 text-muted"
                        strokeWidth={1.8}
                      />
                    </button>
                  </h3>

                  {open && (
                    <div id={`answer-${faq.id}`} className="px-7 pb-6">
                      <p className="border-t border-line pt-5 text-[0.8125rem] leading-relaxed text-muted">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
