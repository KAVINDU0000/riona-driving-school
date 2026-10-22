import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import FloatingWhatsApp from "@/components/landing/FloatingWhatsApp";
import Hero from "@/components/landing/Hero";
import TrustStrip from "@/components/landing/TrustStrip";
import MoreThanDriving from "@/components/landing/MoreThanDriving";
import WhyRiyona from "@/components/landing/WhyRiyona";
import VehicleCategories from "@/components/landing/VehicleCategories";
import LearningHub from "@/components/landing/LearningHub";
import LicenceJourney from "@/components/landing/LicenceJourney";
import RoadSafety from "@/components/landing/RoadSafety";
import Testimonials from "@/components/landing/Testimonials";
import FAQ from "@/components/landing/FAQ";
import ScrollZoom from "@/components/ui/ScrollZoom";

export default function Home() {
  return (
    <div className="landing-theme flex min-h-screen flex-col">
      <div className="page-atmosphere" aria-hidden="true" />
      <Navbar hideApply />

      <main className="flex-1">
        <ScrollZoom className="overflow-x-clip">
          <div data-scroll-zoom>
            <Hero />
          </div>
          <div data-scroll-zoom>
            <TrustStrip />
          </div>
          <div data-scroll-zoom>
            <MoreThanDriving />
          </div>
          <div data-scroll-zoom>
            <WhyRiyona />
          </div>
          <div data-scroll-zoom>
            <LearningHub />
          </div>
          <div data-scroll-zoom>
            <VehicleCategories />
          </div>
          <div data-scroll-zoom>
            <LicenceJourney />
          </div>
          <div data-scroll-zoom>
            <RoadSafety />
          </div>
          <div data-scroll-zoom>
            <Testimonials />
          </div>
          <div data-scroll-zoom>
            <FAQ />
          </div>
        </ScrollZoom>
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
