"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { vehicleCategories } from "@/data/home";

export function VehicleCategories() {
  const [activeCategory, setActiveCategory] = useState("car");
  const category = vehicleCategories.find((c) => c.id === activeCategory)!;

  return (
    <section id="lessons" className="py-16 md:py-24" style={{ backgroundColor: '#EEF3FA' }}>
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Choose Your Way to Learn.
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select the vehicle category that suits your needs and begin your
            journey to becoming a confident driver.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-3 justify-center mb-12">
          {vehicleCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeCategory === cat.id
                  ? "bg-yellow-400 text-gray-900 shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {cat.title}
            </button>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <div className="order-2 md:order-1">
            <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200">
              <Image
                key={category.id}
                src={category.image}
                alt={category.title}
                width={500}
                height={400}
                className="w-full h-auto object-cover animate-fade-in"
                onError={(e) => {
                  e.currentTarget.src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 400'%3E%3Crect fill='%23e5e7eb' width='500' height='400'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%236b7280' font-size='20' font-family='sans-serif'%3E" +
                    category.title +
                    "%3C/text%3E%3C/svg%3E";
                }}
              />
            </div>
          </div>

          {/* Info */}
          <div className="order-1 md:order-2">
            <p className="text-sm font-semibold text-yellow-500 uppercase tracking-wider mb-2">
              {category.subtitle}
            </p>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {category.title}
            </h3>
            <p className="text-lg text-gray-600 mb-8">{category.description}</p>

            {/* Features */}
            <div className="mb-8">
              <h4 className="font-bold text-gray-900 mb-4">What you&apos;ll learn:</h4>
              <ul className="space-y-3">
                {category.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="text-yellow-400 font-bold flex-shrink-0 mt-1">
                      ✓
                    </span>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button size="lg" variant="primary">
              {category.cta}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
