import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/home/Hero";
import { TrustStrip } from "@/components/home/TrustStrip";
import { MoreThanDriving } from "@/components/home/MoreThanDriving";
import { WhyRiyona } from "@/components/home/WhyRiyona";
import { VehicleCategories } from "@/components/home/VehicleCategories";
import { TrainingPackages } from "@/components/home/TrainingPackages";
import { LearningHub } from "@/components/home/LearningHub";
import { LicenceJourney } from "@/components/home/LicenceJourney";
import { RoadSafety } from "@/components/home/RoadSafety";
import { Testimonials } from "@/components/home/Testimonials";
import { FAQ } from "@/components/home/FAQ";
import { FinalCTA } from "@/components/home/FinalCTA";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#EEF3FA' }}>
      <Navbar />

      <main className="flex-1 w-full">
        <Hero />
        <TrustStrip />
        <MoreThanDriving />
        <WhyRiyona />
        <VehicleCategories />
        <TrainingPackages />
        <LearningHub />
        <LicenceJourney />
        <RoadSafety />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}
