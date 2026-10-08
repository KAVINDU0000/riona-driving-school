"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { packages } from "@/data/home";

export function TrainingPackages() {
  const [showComparison, setShowComparison] = useState(false);

  return (
    <section id="packages" className="py-16 md:py-24" style={{ backgroundColor: '#EEF3FA' }}>
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            Everything You Need to Learn.
          </h2>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
            Choose a package that fits your needs and budget. All packages
            include professional instruction and comprehensive support.
          </p>
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="text-yellow-600 font-semibold hover:text-yellow-700 text-sm md:text-base"
          >
            {showComparison ? "↑ Hide" : "↓ Compare"} Packages
          </button>
        </div>

        {/* Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-12">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`rounded-lg transition-all flex flex-col h-full ${
                pkg.popular
                  ? "border-2 border-yellow-400 bg-yellow-50 md:scale-105 shadow-lg"
                  : "border border-gray-200 bg-white hover:shadow-md hover:border-gray-300"
              } p-8`}
            >
              {pkg.popular && (
                <div className="bg-yellow-400 text-gray-900 font-bold py-1.5 px-4 rounded-full inline-block w-fit mb-4 text-xs uppercase tracking-wide">
                  Most Popular
                </div>
              )}

              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                {pkg.name}
              </h3>
              <p className="text-gray-600 mb-6 text-sm">{pkg.description}</p>

              <div className="mb-8">
                <p className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                  {pkg.price}
                </p>
                <p className="text-gray-600 text-sm">per package</p>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-grow">
                {pkg.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="text-yellow-500 font-bold flex-shrink-0 text-lg">
                      ✓
                    </span>
                    <span className="text-gray-700 text-sm leading-relaxed">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                variant={pkg.popular ? "primary" : "secondary"}
                className="w-full"
              >
                {pkg.cta}
              </Button>
            </div>
          ))}
        </div>

        {/* Comparison Info */}
        {showComparison && (
          <div className="bg-white p-8 rounded-xl border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              Package Comparison
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-bold text-gray-900">
                      Feature
                    </th>
                    {packages.map((pkg) => (
                      <th
                        key={pkg.id}
                        className="text-center py-3 px-4 font-bold text-gray-900"
                      >
                        {pkg.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="py-3 px-4 text-gray-700">Lessons</td>
                    <td className="text-center py-3 px-4">5</td>
                    <td className="text-center py-3 px-4">10</td>
                    <td className="text-center py-3 px-4">15</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-3 px-4 text-gray-700">
                      DMT Preparation
                    </td>
                    <td className="text-center py-3 px-4">Basic</td>
                    <td className="text-center py-3 px-4">Full</td>
                    <td className="text-center py-3 px-4">Full</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-700">Exam Transport</td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4">✓</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
