"use client";

import { useState } from "react";
import { faqs } from "@/data/home";

export function FAQ() {
  const [openId, setOpenId] = useState<string | null>("0");

  return (
    <section id="faq" className="py-16 md:py-24" style={{ backgroundColor: '#EEF3FA' }}>
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            A little clarity before your first drive.
          </h2>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Find answers to common questions about our lessons, packages, and
            driving licence process.
          </p>
        </div>

        {/* Accordion */}
        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="border border-gray-200 rounded-lg overflow-hidden hover:border-yellow-300 transition-colors"
            >
              <button
                onClick={() => setOpenId(openId === String(idx) ? null : String(idx))}
                className="w-full px-6 md:px-8 py-5 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                aria-expanded={openId === String(idx)}
              >
                <h3 className="font-semibold text-gray-900 text-left text-sm md:text-base">
                  {faq.question}
                </h3>
                <svg
                  className={`w-5 h-5 text-yellow-500 transition-transform flex-shrink-0 ${
                    openId === String(idx) ? "rotate-180" : ""
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {/* Answer */}
              {openId === String(idx) && (
                <div className="px-6 md:px-8 py-5 bg-white border-t border-gray-200">
                  <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Still have questions? */}
        <div className="text-center mt-14">
          <p className="text-gray-700 mb-4 font-semibold">Still have questions?</p>
          <a
            href="tel:+94123456789"
            className="inline-block bg-yellow-400 text-gray-900 font-semibold py-3 px-8 rounded-lg hover:bg-yellow-500 transition-colors text-sm md:text-base"
          >
            📞 Give us a call
          </a>
        </div>
      </div>
    </section>
  );
}
