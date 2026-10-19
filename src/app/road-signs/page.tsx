import type { Metadata } from "next";
import PublicFrame from "@/components/public/PublicFrame";
import RoadSignsContent from "@/components/public/RoadSignsContent";

export const metadata: Metadata = {
  title: "Driving Signs & Road Rules in Sri Lanka | Riyona Driving School",
  description:
    "Road sign categories, speed limits and key road rules in Sri Lanka, explained for learner drivers.",
};

export default function RoadSignsPage() {
  return (
    <PublicFrame>
      <RoadSignsContent />
    </PublicFrame>
  );
}
