"use client";

import Image from "next/image";
import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { vehicles } from "@/data/landing";
import { Container, Eyebrow, Surface } from "./primitives";

export default function VehicleCategories() {
  const [activeKey, setActiveKey] = useState(vehicles[0].key);
  const active = vehicles.find((v) => v.key === activeKey) ?? vehicles[0];

  return (
    <section id="lessons" className="py-14 md:py-[clamp(64px,7vw,120px)]">
      <Container>
        <div className="mb-10 grid gap-6 md:mb-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-end">
          <div>
            <Eyebrow>Licence Specialisations</Eyebrow>
            <h2 className="mt-3 text-[1.75rem] font-bold leading-[1.15] tracking-[-0.02em] text-ink md:text-[clamp(1.875rem,2.5vw,2.75rem)]">
              Choose Your Way to Learn.
            </h2>
          </div>
          <p className="text-[0.9375rem] leading-[1.7] text-muted">
            Customised training programmes tailored to official Sri Lankan Department of Motor Traffic
            classifications.
          </p>
        </div>

        {/* Category selector, aligned to the same container */}
        <div role="tablist" aria-label="Vehicle category" className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {vehicles.map((v) => {
            const isActive = v.key === active.key;
            return (
              <button
                key={v.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveKey(v.key)}
                className={`rounded-xl px-4 py-3.5 text-[0.9375rem] font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-gold text-ink shadow-[0_10px_24px_-14px_rgba(232,164,0,0.9)]"
                    : "border border-white/80 bg-white/85 text-muted shadow-card hover:text-ink"
                }`}
              >
                {v.label}
              </button>
            );
          })}
        </div>

        {/* Content panel: fixed image ratio on the left, details on the right */}
        <Surface className="mt-6 grid overflow-hidden p-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="relative aspect-[16/10] bg-page lg:aspect-auto lg:min-h-[400px]">
            {active.image ? (
              <Image
                key={active.key}
                src={active.image}
                alt={`${active.label} lesson`}
                fill
                sizes="(min-width: 1024px) 660px, 100vw"
                className="object-cover animate-fadeUp"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 border-r border-dashed border-line text-muted">
                <Icon name="car" className="h-8 w-8" />
                <p className="text-[0.8125rem] font-semibold">Image pending: {active.label}</p>
                <p className="text-[0.75rem]">Add /images/{active.key}.jpg to display</p>
              </div>
            )}
          </div>

          <div key={active.key} className="flex flex-col justify-center gap-5 p-8 md:p-10 animate-fadeUp">
            <span className="inline-flex w-fit rounded-full bg-gold-soft px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-gold-ink">
              {active.tag}
            </span>
            <h3 className="text-[1.5rem] font-bold leading-[1.2] tracking-[-0.01em] text-ink">{active.title}</h3>
            <p className="text-[0.9375rem] leading-[1.7] text-muted">{active.body}</p>
            <ul className="space-y-3">
              {active.points.map((p) => (
                <li key={p} className="flex items-start gap-3 text-[0.875rem] text-ink">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success-soft text-success">
                    <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.4} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
            <a
              href="#learning-hub"
              className="mt-2 inline-flex w-fit items-center gap-2 rounded-xl bg-gold px-5 py-3 text-[0.875rem] font-semibold text-ink transition-colors hover:bg-gold-dark"
            >
              Explore {active.label} Lessons
              <Icon name="arrow-right" className="h-4 w-4" strokeWidth={2} />
            </a>
          </div>
        </Surface>
      </Container>
    </section>
  );
}
