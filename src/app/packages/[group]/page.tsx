import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import PackageCard from "@/components/public/PackageCard";
import PageHero from "@/components/public/PageHero";
import PublicFrame from "@/components/public/PublicFrame";
import { Container } from "@/components/landing/primitives";
import { getPublicPackageCatalog } from "@/lib/packages/catalog";
import { packageGroupBySlug } from "@/lib/packages/group-routes";
import { vehicleForPackage } from "@/lib/packages/public";

export async function generateMetadata({ params }: { params: Promise<{ group: string }> }): Promise<Metadata> {
  const { group } = await params;
  const main = packageGroupBySlug(group);
  return {
    title: main ? `${main.label} | Riyona Driving School` : "Packages | Riyona Driving School",
    description: main?.note ?? "Training packages from Riyona Driving School.",
  };
}

/** The sub-packages of one main package. Prices come from the database on every request. */
export default async function PackageGroupPage({ params }: { params: Promise<{ group: string }> }) {
  const { group: slug } = await params;
  const main = packageGroupBySlug(slug);
  if (!main) notFound();

  await connection();
  const groups = await getPublicPackageCatalog();
  const options = groups.find((item) => item.label === main.label)?.options ?? [];

  return (
    <PublicFrame>
      <PageHero
        eyebrow="Training packages"
        title={main.label}
        description={main.note}
        actions={
          <Link
            href="/packages"
            className="inline-flex items-center rounded-xl bg-white px-5 py-3 text-[0.9375rem] font-semibold text-ink ring-1 ring-line hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
          >
            ← All packages
          </Link>
        }
      />

      <Container>
        {options.length === 0 ? (
          <p className="mt-12 text-[0.9375rem] text-muted">
            This package is not offered online right now. Contact the school for the current packages and fees.
          </p>
        ) : (
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8 xl:grid-cols-4">
            {options.map((option) => (
              <li key={option.id} className="flex">
                <PackageCard option={option} vehicle={vehicleForPackage(option)} group={main.slug} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </PublicFrame>
  );
}
