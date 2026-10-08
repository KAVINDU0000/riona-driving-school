"use client";

import Image from "next/image";
import { useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import SectionHeader from "@/components/ui/SectionHeader";
import { vehicleCategories } from "@/data/home";

export default function VehicleCategories() {
  const [activeId, setActiveId] = useState(vehicleCategories[0].id);
  const active = vehicleCategories.find((c) => c.id === activeId) ?? vehicleCategories[0];

  return (
    <section id="lessons" className="pb-16 md:pb-24">
      <div className="max-w-[1240px] mx-auto px-6">
        <SectionHeader
          eyebrow="Licence Specializations"
          title="Choose Your Way to Learn."
          description="Customized training programs tailored to all official Sri Lankan Department of Motor Traffic vehicle classifications."
        />

        {/* Class selector */}
        <div role="tablist" aria-label="Licence classes" className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {vehicleCategories.map((category) => {
            const selected = category.id === activeId;
            return (
              <button
                key={category.id}
                role="tab"
                id={`tab-${category.id}`}
                aria-selected={selected}
                aria-controls={`panel-${category.id}`}
                onClick={() => setActiveId(category.id)}
                className={`rounded-xl px-5 py-3.5 text-sm font-semibold transition-colors ${
                  selected
                    ? "bg-gold text-ink shadow-[0_8px_20px_-8px_rgba(232,164,0,0.7)]"
                    : "bg-white text-muted ring-1 ring-line hover:text-ink"
                }`}
              >
                {category.tab}
              </button>
            );
          })}
        </div>

        {/* Active class panel */}
        <div
          role="tabpanel"
          id={`panel-${active.id}`}
          aria-labelledby={`tab-${active.id}`}
          className="mt-5 rounded-2xl bg-white p-4 shadow-float md:p-5"
        >
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div className="relative aspect-[3/2] overflow-hidden rounded-xl bg-page">
              <Image
                src={active.image}
                alt={active.title}
                fill
                sizes="(max-width: 1024px) 100vw, 560px"
                className="object-cover"
              />
              <span className="absolute left-4 top-4 rounded-full bg-gold-soft px-3.5 py-2 text-xs font-semibold text-ink shadow-sm">
                {active.imageBadge}
              </span>
            </div>

            <div className="px-2 pb-4 lg:pb-0 lg:pr-6">
              <span className="inline-block rounded-full bg-gold-soft px-3 py-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gold-ink">
                {active.badge}
              </span>

              <p className="mt-5 text-[0.8125rem] text-muted">{active.kicker}</p>
              <h3 className="mt-2 text-[1.75rem] md:text-[2rem] font-bold leading-tight tracking-[-0.025em] text-ink">
                {active.title}
              </h3>

              <p className="mt-4 text-[0.875rem] leading-relaxed text-muted">{active.description}</p>

              <ul className="mt-6 space-y-3">
                {active.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-[0.8125rem] text-muted">
                    <Icon name="check-circle" className="mt-px w-4 h-4 shrink-0 text-success" strokeWidth={1.8} />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-7">
                <Button href="#contact" size="lg" icon="arrow-up-right">
                  {active.cta}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
