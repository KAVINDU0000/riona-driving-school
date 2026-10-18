import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "@/components/public/ContactForm";
import PageHero from "@/components/public/PageHero";
import PublicFrame from "@/components/public/PublicFrame";
import { Container, IconTile, Surface } from "@/components/landing/primitives";
import Icon from "@/components/ui/Icon";
import { site, vehicles } from "@/data/landing";
import { publicContact } from "@/data/public";

export const metadata: Metadata = {
  title: "Contact and Location | Riyona Driving School",
  description: "Phone, WhatsApp, address and map location for Riyona Driving School, with a contact form that opens WhatsApp.",
};

/*
 * Only the contact details the project holds are shown: phone, WhatsApp, the address and the map location. Opening
 * hours and email are left out until the school supplies verified details. The form has no server endpoint, because
 * the project has no place to store or deliver messages, so it opens WhatsApp instead.
 */

const CONTACT_CARD = "flex h-full flex-col gap-4 p-6";

export default function ContactPage() {
  const vehicleOptions = vehicles.map(({ key, label }) => ({ key, label }));

  return (
    <PublicFrame>
      <PageHero
        eyebrow="Contact"
        title="Contact Riyona Driving School"
        description="Call or message us on WhatsApp, or send a short message below and our team receives it on WhatsApp. To start a registration request, apply online."
        actions={
          <>
            <a
              href={site.phoneHref}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-[0.9375rem] font-semibold text-ink ring-1 ring-line hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
            >
              <Icon name="phone" className="h-4 w-4" />
              Call {site.phone}
            </a>
            <Link
              href="/signup"
              className="inline-flex items-center rounded-xl bg-gold px-5 py-3 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
            >
              Apply now
            </Link>
          </>
        }
      />

      <Container>
        <ul className="mt-12 grid gap-6 md:grid-cols-3">
          <li>
            <Surface className={CONTACT_CARD}>
              <IconTile>
                <Icon name="phone" className="h-5 w-5" />
              </IconTile>
              <div className="mt-auto">
                <h2 className="text-[1.0625rem] font-bold text-ink">Phone</h2>
                <a href={site.phoneHref} className="mt-2 inline-block text-[0.9375rem] font-semibold text-ink underline-offset-4 hover:underline">
                  {site.phone}
                </a>
              </div>
            </Surface>
          </li>

          <li>
            <Surface className={CONTACT_CARD}>
              <IconTile tone="success">
                <Icon name="chat" className="h-5 w-5" />
              </IconTile>
              <div className="mt-auto">
                <h2 className="text-[1.0625rem] font-bold text-ink">WhatsApp</h2>
                <a
                  href={publicContact.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-[0.9375rem] font-semibold text-ink underline-offset-4 hover:underline"
                >
                  Message us on WhatsApp
                </a>
              </div>
            </Surface>
          </li>

          <li>
            <Surface className={CONTACT_CARD}>
              <IconTile>
                <Icon name="map-pin" className="h-5 w-5" />
              </IconTile>
              <div className="mt-auto">
                <h2 className="text-[1.0625rem] font-bold text-ink">Address</h2>
                <p className="mt-2 text-[0.9375rem] font-semibold text-ink">{publicContact.address}</p>
              </div>
            </Surface>
          </li>
        </ul>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <Surface className="p-6 md:p-8">
            <h2 className="text-[1.5rem] font-bold tracking-[-0.02em] text-ink">Send us a message</h2>
            <p className="mt-2 text-[0.9375rem] leading-[1.7] text-muted">
              Fill in the form and our team receives it on WhatsApp. They reply there.
            </p>
            <div className="mt-6">
              <ContactForm vehicles={vehicleOptions} />
            </div>
          </Surface>

          <Surface className="flex flex-col gap-5 p-6 md:p-8">
            <div className="flex items-start gap-4">
              <IconTile>
                <Icon name="map-pin" className="h-5 w-5" />
              </IconTile>
              <div>
                <h2 className="text-[1.25rem] font-bold text-ink">Find us</h2>
                <p className="mt-1 text-[0.9375rem] text-muted">
                  Plus Code <span className="font-semibold text-ink">{publicContact.plusCode}</span>, {publicContact.locality}
                </p>
              </div>
            </div>

            <iframe
              title="Map showing Riyona Driving School, Homagama"
              src={publicContact.mapsEmbed}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-[320px] w-full rounded-xl border border-line md:h-[380px]"
            />

            <a
              href={publicContact.mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-[0.9375rem] font-semibold text-ink ring-1 ring-line hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
            >
              <Icon name="external-link" className="h-4 w-4" />
              Open in Google Maps
            </a>
          </Surface>
        </div>
      </Container>
    </PublicFrame>
  );
}
