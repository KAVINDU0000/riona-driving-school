import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import PageHero from "@/components/public/PageHero";
import PublicFrame from "@/components/public/PublicFrame";
import TrustStrip from "@/components/landing/TrustStrip";
import { Container, Surface } from "@/components/landing/primitives";
import Icon from "@/components/ui/Icon";
import { getPublicPackageCatalog } from "@/lib/packages/catalog";
import { formatPackagePrice } from "@/lib/packages/format";
import {
  allCatalogPackages,
  dailyRateFor,
  fixedPackagesFor,
} from "@/lib/packages/public";
import { site, vehicles } from "@/data/landing";

export const metadata: Metadata = {
  title: "Vehicle Categories | Riyona Driving School",
  description:
    "Car, van, motorbike and three-wheeler training at Riyona Driving School, with the packages and rates for each.",
};

const HERO_BUTTON =
  "inline-flex items-center rounded-xl bg-white px-5 py-3 text-[0.9375rem] font-semibold text-ink ring-1 ring-line hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark";

const APPLY_BUTTON =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-[0.875rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] transition-colors hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark";

const CONTACT_LINK =
  "inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-[0.8125rem] font-semibold text-ink hover:text-gold-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark";

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
          <>
            <Link href="/packages" className={HERO_BUTTON}>
              All packages and prices
            </Link>
            <a
              href={site.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className={HERO_BUTTON}
            >
              WhatsApp a question
            </a>
          </>
        }
      />

      <Container>
        <div className="mt-10">
          <TrustStrip />
        </div>

        <div className="mt-20 flex flex-col gap-3">
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-gold-ink">
            Four licence classes
          </p>
          <h2 className="text-[1.75rem] font-bold tracking-[-0.02em] text-ink md:text-[2.25rem]">
            Training for every vehicle
          </h2>
        </div>

        <ul className="mt-10 grid items-start gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {vehicles.map((vehicle, index) => {
            const daily = dailyRateFor(allPackages, vehicle.key);
            const packages = fixedPackagesFor(allPackages, vehicle.key);
            return (
              <li key={vehicle.key} id={vehicle.key} className="scroll-mt-32">
                <Surface
                  lift
                  className="group flex flex-col overflow-hidden p-0"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-page">
                    {vehicle.image && (
                      <Image
                        src={vehicle.image}
                        alt={`${vehicle.label} training`}
                        fill
                        sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[0.6875rem] font-bold text-ink backdrop-blur">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <div>
                      <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-gold-ink">
                        {vehicle.tag}
                      </p>
                      <h3 className="mt-1 text-[1.0625rem] font-bold leading-snug text-ink">
                        {vehicle.title}
                      </h3>
                      <p className="mt-1.5 line-clamp-3 text-[0.8125rem] leading-[1.6] text-muted">
                        {vehicle.body}
                      </p>
                    </div>

                    <ul className="grid gap-1.5">
                      {vehicle.points.slice(0, 2).map((point) => (
                        <li
                          key={point}
                          className="flex items-start gap-2 text-[0.8125rem] text-ink"
                        >
                          <Icon
                            name="check"
                            className="mt-0.5 h-3 w-3 shrink-0 text-success"
                          />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>

                    {(daily || packages.length > 0) && (
                      <details className="group/details mt-1 overflow-hidden rounded-2xl border border-line bg-page/60 transition-shadow open:bg-white open:shadow-card">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[0.8125rem] font-semibold text-ink transition-colors hover:text-gold-ink [&::-webkit-details-marker]:hidden">
                          Packages and rates
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-line transition-colors group-open/details:bg-gold group-open/details:ring-gold">
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              className="h-3.5 w-3.5 text-ink transition-transform duration-300 group-open/details:rotate-180"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2.2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="m6 9 6 6 6-6" />
                            </svg>
                          </span>
                        </summary>
                        <div className="group-open/details:animate-panel-in max-h-72 overflow-y-auto border-t border-line">
                          {daily && (
                            <div className="border-l-[3px] border-gold bg-gold-soft/40 px-4 py-3">
                              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted">
                                Daily individual training
                              </p>
                              <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-[0.875rem] font-bold text-ink">
                                {formatPackagePrice(daily)}
                                {daily.detail && (
                                  <span className="text-[0.75rem] font-normal text-muted">
                                    {daily.detail}
                                  </span>
                                )}
                              </p>
                            </div>
                          )}
                          {packages.length > 0 && (
                            <ul>
                              {packages.map((option) => (
                                <li
                                  key={option.id}
                                  className="flex items-start justify-between gap-4 border-t border-line px-3.5 py-2.5 first:border-t-0"
                                >
                                  <span className="min-w-0 text-[0.8125rem] leading-snug text-ink">
                                    {option.name}
                                  </span>
                                  <span className="shrink-0 whitespace-nowrap text-right text-[0.8125rem] font-bold text-ink">
                                    {formatPackagePrice(option)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </details>
                    )}

                    <div className="mt-auto flex flex-col gap-1 pt-2">
                      <Link href="/signup" className={APPLY_BUTTON}>
                        Apply
                        <span aria-hidden="true">→</span>
                      </Link>
                      <Link href="/contact" className={CONTACT_LINK}>
                        Contact the school
                      </Link>
                    </div>
                  </div>
                </Surface>
              </li>
            );
          })}
        </ul>
      </Container>
    </PublicFrame>
  );
}
