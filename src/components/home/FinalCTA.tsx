"use client";

import { Button } from "@/components/ui/Button";

export function FinalCTA() {
  return (
    <section id="contact" className="py-16 md:py-24 bg-gray-900 text-white">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left - Content */}
          <div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Your First Lesson Starts Here.
            </h2>
            <p className="text-lg text-gray-300 mb-8">
              Join thousands of successful drivers who chose Riyona Academy.
              Take the first step toward becoming a confident, safe driver
              today.
            </p>

            {/* Benefits List */}
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3">
                <span className="text-yellow-400 font-bold">✓</span>
                <span>Professional, patient instructors</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-yellow-400 font-bold">✓</span>
                <span>Flexible scheduling to suit you</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-yellow-400 font-bold">✓</span>
                <span>Proven success rate and support</span>
              </li>
            </ul>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" variant="primary">
                Book a Lesson
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => (window.location.href = "tel:+94123456789")}
                className="border-white text-white hover:bg-white/10"
              >
                📞 Talk to Riyona
              </Button>
            </div>
          </div>

          {/* Right - Contact Info */}
          <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700">
            <h3 className="text-2xl font-bold mb-8">Get In Touch</h3>

            {/* Contact Items */}
            <div className="space-y-6">
              <div>
                <p className="text-gray-400 text-sm mb-2">Phone</p>
                <a
                  href="tel:+94123456789"
                  className="text-xl font-bold text-yellow-400 hover:text-yellow-300 transition-colors"
                >
                  +94 (0) 123 456 789
                </a>
              </div>

              <div>
                <p className="text-gray-400 text-sm mb-2">WhatsApp</p>
                <a
                  href="https://wa.me/94123456789"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xl font-bold text-yellow-400 hover:text-yellow-300 transition-colors"
                >
                  Message Us
                </a>
              </div>

              <div>
                <p className="text-gray-400 text-sm mb-2">Location</p>
                <p className="text-lg font-bold text-white">
                  Colombo, Sri Lanka
                </p>
              </div>

              <div className="pt-6 border-t border-gray-700">
                <p className="text-gray-400 text-sm mb-4">Response Time</p>
                <p className="text-white font-semibold">
                  We respond within 2 hours during business hours
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
