import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicFrame from "@/components/public/PublicFrame";
import RoadSignCategoryContent from "@/components/public/RoadSignCategoryContent";
import { SIGN_CATEGORIES } from "@/data/road-rules";

function categoryById(id: string) {
  return SIGN_CATEGORIES.find((category) => category.id === id) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: id } = await params;
  const category = categoryById(id);
  return {
    title: category
      ? `${category.title} | Road Signs | Riyona Driving School`
      : "Road Signs | Riyona Driving School",
    description: category?.intro ?? "Road signs and road rules in Sri Lanka.",
  };
}

/** Every sign in one category. The category is taken from the link, and unknown categories show a not-found page. */
export default async function RoadSignCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: id } = await params;
  const category = categoryById(id);
  if (!category) notFound();

  return (
    <PublicFrame>
      <RoadSignCategoryContent category={category} />
    </PublicFrame>
  );
}
