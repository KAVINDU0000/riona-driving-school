import { licenceSteps } from "@/data/home";

export function LicenceJourney() {
  return (
    <section className="py-16 md:py-24" style={{ backgroundColor: '#EEF3FA' }}>
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            Your Journey to a Driving Licence in Sri Lanka.
          </h2>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Follow these key steps to successfully obtain your Sri Lankan
            driving licence.
          </p>
        </div>

        {/* Timeline */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
          {licenceSteps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Step Card */}
              <div className="bg-white p-8 rounded-lg border border-gray-200 hover:shadow-md hover:border-yellow-300 transition-all h-full flex flex-col">
                <div className="text-5xl font-bold text-yellow-500 mb-3">
                  {step.number}
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-3 leading-snug">
                  {step.title}
                </h3>
                <p className="text-gray-600 text-sm flex-grow leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Connector Line (Desktop) */}
              {index < licenceSteps.length - 1 && (
                <div className="hidden md:block absolute top-12 -right-4 w-8 h-1 bg-gradient-to-r from-yellow-400 to-gray-200"></div>
              )}
            </div>
          ))}
        </div>

        {/* Mobile Timeline Indicator */}
        <div className="md:hidden mt-8 text-center">
          <div className="flex justify-center gap-2">
            {licenceSteps.map((step) => (
              <div
                key={step.number}
                className="w-2 h-2 rounded-full bg-yellow-400"
              ></div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
