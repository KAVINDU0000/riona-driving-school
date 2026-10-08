import { trustItems } from "@/data/home";

export function TrustStrip() {
  return (
    <section className="py-16 md:py-20 border-t border-gray-200" style={{ backgroundColor: '#EEF3FA' }}>
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {trustItems.map((item) => (
            <div
              key={item.id}
              className="p-6 md:p-8 text-center hover:bg-gray-50 transition-colors rounded-lg"
            >
              <div className="text-4xl mb-4">{item.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2 text-sm md:text-base">
                {item.title}
              </h3>
              <p className="text-xs md:text-sm text-gray-600 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
