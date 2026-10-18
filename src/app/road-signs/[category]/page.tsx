import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHero from "@/components/public/PageHero";
import PublicFrame from "@/components/public/PublicFrame";
import { Container } from "@/components/landing/primitives";
import { CategorySignGrid } from "@/components/public/RoadSignParts";
import { SIGN_CATEGORIES } from "@/data/road-rules";
import { categoryTitleWithEnglish } from "@/data/road-signs-categories-si";

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

const WHITE_BUTTON =
  "inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-[0.9375rem] font-semibold text-ink ring-1 ring-line hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark";

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
      <PageHero
        eyebrow={`Category ${Number(category.number)}`}
        title={categoryTitleWithEnglish(category.id, category.title)}
        description={category.intro}
        actions={
          <Link href="/road-signs" className={WHITE_BUTTON}>
            ← All categories
          </Link>
        }
      />

      <Container>
        <p className="mt-12 text-[0.875rem] font-semibold text-muted">
          {category.signs.length}{" "}
          {category.signs.length === 1 ? "entry" : "entries"} in this category
        </p>
        <CategorySignGrid category={category} />
      </Container>
    </PublicFrame>
  );
}
