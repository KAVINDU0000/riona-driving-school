import { roadSafetyPrinciples } from "@/data/home";

export function RoadSafety() {
  return (
    <section className="py-16 md:py-24" style={{ backgroundColor: '#EEF3FA' }}>
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Good Drivers Are Built on Good Habits.
          </h2>
        </div>

        {/* Principles Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {roadSafetyPrinciples.map((principle) => (
            <div
              key={principle.title}
              className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="text-4xl mb-3">{principle.icon}</div>
              <h3 className="font-bold text-gray-900 mb-2">{principle.title}</h3>
              <p className="text-sm text-gray-600">{principle.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
