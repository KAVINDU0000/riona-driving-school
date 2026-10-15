import type { Metadata } from "next";
import Image from "next/image";
import { connection } from "next/server";
import Link from "next/link";
import PageHero from "@/components/public/PageHero";
import PublicFrame from "@/components/public/PublicFrame";
import { Container, Surface } from "@/components/landing/primitives";
import Icon from "@/components/ui/Icon";
import { getPublicPackageCatalog } from "@/lib/packages/catalog";
import { formatPackagePrice } from "@/lib/packages/format";
import { allCatalogPackages, dailyRateFor, fixedPackagesFor } from "@/lib/packages/public";
import { vehicles } from "@/data/landing";

export const metadata: Metadata = {
  title: "Vehicle Categories | Riyona Driving School",
  description: "Car, van, motorbike and three-wheeler training at Riyona Driving School, with the packages and rates for each.",
};

export default async function VehiclesPage() {
  // Rendered per request, so every price shown is read from the database when the page is requested.
  await connection();
  // Every package and rate shown here comes from the database. Nothing falls back to a fixed list.
  const allPackages = allCatalogPackages(await getPublicPackageCatalog());
  return (
    <PublicFrame>
      <PageHero
        eyebrow="Vehicle categories"
        title="Choose your vehicle"
        description="Each category has its own training. The packages and daily rates shown for a category are the ones in the school's price list."
        actions={
          <Link
            href="/packages"
            className="inline-flex items-center rounded-xl bg-white px-5 py-3 text-[0.9375rem] font-semibold text-ink ring-1 ring-line hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
          >
            All packages and prices
          </Link>
        }
      />

      <Container>
        <div className="mt-12 grid gap-8">
          {vehicles.map((vehicle) => {
            const daily = dailyRateFor(allPackages, vehicle.key);
            const packages = fixedPackagesFor(allPackages, vehicle.key);
            return (
              <section key={vehicle.key} id={vehicle.key} aria-labelledby={`${vehicle.key}-heading`} className="scroll-mt-32">
                <Surface className="grid overflow-hidden p-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                  <div className="relative aspect-[16/10] bg-page lg:aspect-auto lg:min-h-[360px]">
                    {vehicle.image && (
                      <Image
                        src={vehicle.image}
                        alt={`${vehicle.label} training`}
                        fill
                        sizes="(min-width: 1024px) 50vw, 100vw"
                        className="object-cover"
                      />
                    )}
                  </div>

                  <div className="flex flex-col gap-5 p-6 md:p-8">
                    <div>
                      <p className="text-[0.75rem] font-bold uppercase tracking-[0.12em] text-gold-ink">{vehicle.tag}</p>
                      <h2 id={`${vehicle.key}-heading`} className="mt-2 text-[1.5rem] font-bold tracking-[-0.02em] text-ink">
                        {vehicle.title}
                      </h2>
                      <p className="mt-3 text-[0.9375rem] leading-[1.7] text-muted">{vehicle.body}</p>
                    </div>

                    <ul className="grid gap-2">
                      {vehicle.points.map((point) => (
                        <li key={point} className="flex items-start gap-2 text-[0.9375rem] text-ink">
                          <Icon name="check" className="mt-1 h-4 w-4 shrink-0 text-success" />
                          {point}
                        </li>
                      ))}
                    </ul>

                    {daily && (
                      <div className="rounded-xl bg-white p-4 ring-1 ring-line">
                        <p className="text-[0.8125rem] font-semibold text-muted">Daily individual training</p>
                        <p className="mt-1 text-[1.0625rem] font-bold text-ink">{formatPackagePrice(daily)}</p>
                        {daily.detail && <p className="mt-0.5 text-[0.8125rem] text-muted">{daily.detail}</p>}
                      </div>
                    )}

                    {packages.length > 0 && (
                      <div>
                        <p className="text-[0.8125rem] font-semibold text-muted">Packages that include {vehicle.label.toLowerCase()} training</p>
                        <ul className="mt-2 grid gap-2">
                          {packages.map((option) => (
                            <li key={option.id} className="flex flex-wrap items-baseline justify-between gap-2 text-[0.9375rem]">
                              <span className="text-ink">{option.name}</span>
                              <span className="font-semibold text-ink">{formatPackagePrice(option)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-auto flex flex-wrap gap-3">
                      <Link
                        href="/signup"
                        className="inline-flex items-center rounded-xl bg-gold px-5 py-3 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
                      >
                        Apply for {vehicle.label.toLowerCase()} training
                      </Link>
                      <Link
                        href="/contact"
                        className="inline-flex items-center rounded-xl px-5 py-3 text-[0.9375rem] font-semibold text-ink ring-1 ring-line hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
                      >
                        Contact the school
                      </Link>
                    </div>
                  </div>
                </Surface>
              </section>
            );
          })}
        </div>
      </Container>
    </PublicFrame>
  );
}
