"use client";

import Image from "next/image";
import { learningResources } from "@/data/home";

export function LearningHub() {
  const featured = learningResources.find((r) => r.featured);
  const others = learningResources.filter((r) => !r.featured);

  return (
    <section id="learning" className="py-16 md:py-24" style={{ backgroundColor: '#EEF3FA' }}>
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Digital Learning Hub
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Access comprehensive learning materials and resources to support
            your driving education journey.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Featured Resource */}
          {featured && (
            <div className="md:col-span-2 rounded-2xl overflow-hidden shadow-lg border border-gray-200 hover:shadow-xl transition-shadow bg-gradient-to-br from-blue-50 to-indigo-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 md:p-12">
                <div>
                  <div className="text-4xl mb-4">{featured.icon}</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {featured.title}
                  </h3>
                  <p className="text-gray-700 mb-6">{featured.description}</p>
                  <button className="bg-yellow-400 text-gray-900 font-bold py-3 px-6 rounded-lg hover:bg-yellow-500 transition-colors inline-block">
                    Access Now
                  </button>
                </div>
                <div className="rounded-xl overflow-hidden bg-gray-200 h-64 md:h-auto flex items-center justify-center">
                  {featured.image && (
                    <Image
                      src={featured.image}
                      alt={featured.title}
                      width={300}
                      height={300}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'%3E%3Crect fill='%23e5e7eb' width='300' height='300'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%236b7280' font-size='18' font-family='sans-serif'%3E" +
                          featured.title +
                          "%3C/text%3E%3C/svg%3E";
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Other Resources */}
          <div className="space-y-4">
            {others.map((resource) => (
              <div
                key={resource.id}
                className="p-6 bg-gray-50 rounded-xl border border-gray-200 hover:border-yellow-200 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="text-3xl mb-3">{resource.icon}</div>
                <h4 className="font-bold text-gray-900 mb-2 group-hover:text-yellow-600 transition-colors">
                  {resource.title}
                </h4>
                <p className="text-sm text-gray-600">{resource.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
