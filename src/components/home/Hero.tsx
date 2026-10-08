"use client";

import Image from "next/image";
import { Button } from "@/components/ui/Button";

export function Hero() {
  const isVisible = true;

  return (
    <section className="py-12 md:py-20 lg:py-28" style={{ backgroundColor: '#EEF3FA' }}>
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div
            className={`transition-all duration-1000 ${
              isVisible ? "opacity-100" : "opacity-0 translate-y-4"
            }`}
          >
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-3 leading-tight tracking-tight">
              Drive With Confidence.
            </h1>
            <p className="text-2xl text-gray-900 font-semibold mb-6 leading-tight">
              Learn Today. Drive Tomorrow.
            </p>
            <p className="text-base text-gray-600 mb-10 max-w-lg leading-relaxed">
              Government-approved driver education with experienced instructors,
              practical lessons, and comprehensive support from learning to licence.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" variant="primary">
                📅 Book a Lesson
              </Button>
              <Button size="lg" variant="secondary">
                Explore Packages
              </Button>
            </div>
          </div>

          {/* Right Content - Hero Image Card */}
          <div
            className={`transition-all duration-1000 delay-300 ${
              isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
            }`}
          >
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
              {/* Placeholder for hero image */}
              <div className="bg-gray-300 h-80 flex items-center justify-center relative overflow-hidden">
                <Image
                  src="/images/hero-driving.svg"
                  alt="Professional driving instructor with learner"
                  width={500}
                  height={400}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>

              {/* Trust Label */}
              <div className="p-6 bg-white border-t border-gray-200">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                  <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">
                    Government Approved
                  </span>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">98%</p>
                    <p className="text-xs text-gray-600 mt-1">Pass Rate</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900">15k+</p>
                    <p className="text-xs text-gray-600 mt-1">Students</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900">100%</p>
                    <p className="text-xs text-gray-600 mt-1">Satisfaction</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
