"use client";

import Image from "next/image";
import { moreThanDrivingItems } from "@/data/home";
import { useInView } from "@/hooks/useInView";

export function MoreThanDriving() {
  const { ref, isVisible } = useInView();

  return (
    <section id="about" className="py-16 md:py-24" style={{ backgroundColor: '#EEF3FA' }}>
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div ref={ref}>
            <p className="text-sm font-semibold text-yellow-500 uppercase tracking-wider mb-2">
              Driver Training
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
              More Than A Driving Lesson.
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Our comprehensive training goes beyond basic driving. We focus on
              developing the skills and mindset needed for safe, confident
              driving in all conditions.
            </p>

            {/* Numbered Items */}
            <div className="space-y-6">
              {moreThanDrivingItems.map((item, index) => (
                <div
                  key={item.number}
                  className={`transition-all duration-500 ${
                    isVisible
                      ? "opacity-100 translate-x-0"
                      : "opacity-0 -translate-x-8"
                  }`}
                  style={{
                    transitionDelay: `${index * 100}ms`,
                  }}
                >
                  <div className="flex gap-6">
                    <div className="text-3xl font-bold text-yellow-400 flex-shrink-0">
                      {item.number}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">
                        {item.title}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Image */}
          <div
            className={`transition-all duration-1000 ${
              isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
            }`}
          >
            <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200">
              <Image
                src="/images/more-than-driving.svg"
                alt="Professional driving instructor with student"
                width={500}
                height={500}
                className="w-full h-auto object-cover"
              />
            </div>

            {/* Info Label */}
            <div className="mt-4 flex items-center gap-3 bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-sm text-green-700">
                Practical training in real-world conditions
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
