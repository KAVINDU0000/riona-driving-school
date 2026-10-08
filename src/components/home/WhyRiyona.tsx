import { whyChooseRiyonaCards } from "@/data/home";

export function WhyRiyona() {
  return (
    <section className="py-16 md:py-24" style={{ backgroundColor: '#EEF3FA' }}>
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            Why Choose Riyona Driving Academy?
          </h2>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            We provide comprehensive, professional driving training with a focus
            on safety, confidence, and excellence.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {whyChooseRiyonaCards.map((card) => (
            <div
              key={card.number}
              className="bg-white p-8 rounded-lg border border-gray-200 hover:shadow-md hover:border-yellow-300 transition-all duration-300 group"
            >
              <div className="text-5xl mb-4">{card.icon}</div>
              <div className="text-sm font-bold text-yellow-500 mb-3 uppercase tracking-wide">
                {card.number}
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-3 leading-snug">
                {card.title}
              </h3>
              <p className="text-gray-600 text-sm mb-5 leading-relaxed">
                {card.description}
              </p>
              <button className="text-yellow-600 font-semibold text-sm hover:text-yellow-700 transition-colors inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                Learn more
                <span>→</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
