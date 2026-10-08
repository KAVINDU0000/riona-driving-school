"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import SectionHeader from "@/components/ui/SectionHeader";
import { testimonials } from "@/data/home";

const PER_SLIDE = 3;
const AUTOPLAY_MS = 6000;

const slides = Array.from({ length: Math.ceil(testimonials.length / PER_SLIDE) }, (_, i) =>
  testimonials.slice(i * PER_SLIDE, i * PER_SLIDE + PER_SLIDE)
);

export default function Testimonials() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  const go = useCallback((delta: number) => {
    setIndex((current) => (current + delta + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    if (!playing || slides.length < 2) return;
    const timer = setInterval(() => go(1), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [playing, go]);

  return (
    <section className="py-16 md:py-24">
      <div className="max-w-[1240px] mx-auto px-6">
        <SectionHeader
          eyebrow="4.9 / 5 · Rated by Real Students"
          title="What Our Students Say."
          description="Read genuine reviews from learners across Nugegoda, Mount Lavinia, and Colombo who trusted Riyona to transform their very first drives."
        />

        <div className="mt-12 overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {slides.map((slide, slideIndex) => (
              <div
                key={slideIndex}
                aria-hidden={slideIndex !== index}
                className="grid w-full shrink-0 gap-5 md:grid-cols-2 lg:grid-cols-3"
              >
                {slide.map((item) => (
                  <figure key={item.id} className="flex flex-col rounded-2xl bg-white p-7 shadow-card">
                    <div className="flex gap-0.5 text-gold-dark" aria-label={`${item.rating} out of 5 stars`}>
                      {Array.from({ length: item.rating }).map((_, i) => (
                        <svg key={i} viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor" aria-hidden="true">
                          <path d="M10 1.8l2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.7-5 2.7 1-5.6-4.1-3.9 5.6-.8z" />
                        </svg>
                      ))}
                    </div>

                    <blockquote className="mt-5 text-[0.875rem] leading-relaxed text-ink">
                      &ldquo;{item.quote}&rdquo;
                    </blockquote>

                    <figcaption className="mt-auto pt-6">
                      <div className="flex items-center gap-3 border-t border-line pt-5">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-page text-xs font-bold text-muted">
                          {item.initials}
                        </span>
                        <div>
                          <p className="text-[0.8125rem] font-semibold text-ink">{item.name}</p>
                          <p className="mt-0.5 text-[0.6875rem] text-muted">{item.meta}</p>
                        </div>
                      </div>

                      <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-success/35 px-3.5 py-2 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-success">
                        <Icon name="check-circle" className="w-3.5 h-3.5" strokeWidth={1.8} />
                        DMT Verified Pass
                      </span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Carousel controls */}
        <div className="mt-10 flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Go to review set ${i + 1}`}
                aria-current={i === index}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-7 bg-gold-dark" : "w-1.5 bg-line hover:bg-muted/40"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause reviews" : "Play reviews"}
              className="grid h-11 w-11 place-items-center rounded-full bg-white text-ink shadow-card hover:shadow-float transition-shadow"
            >
              <Icon name={playing ? "pause" : "play"} className="w-[18px] h-[18px]" />
            </button>
            <button
              onClick={() => go(-1)}
              aria-label="Previous reviews"
              className="grid h-11 w-11 place-items-center rounded-full bg-white text-ink shadow-card hover:shadow-float transition-shadow"
            >
              <Icon name="arrow-left" className="w-[18px] h-[18px]" />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Next reviews"
              className="grid h-11 w-11 place-items-center rounded-full bg-white text-ink shadow-card hover:shadow-float transition-shadow"
            >
              <Icon name="arrow-right" className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
