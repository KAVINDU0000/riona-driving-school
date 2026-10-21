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
import NavFade from "@/components/landing/NavFade";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="page-atmosphere" aria-hidden="true" />
      <Navbar hideApply />

      <main className="flex-1">
        <Hero />
        <TrustStrip />
        <MoreThanDriving />
        <WhyRiyona />
        <VehicleCategories />
        <LearningHub />
        <LicenceJourney />
        <RoadSafety />
        <Testimonials />
        <FAQ />
        <NavFade />
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
