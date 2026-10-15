import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/public/PageHero";
import PublicFrame from "@/components/public/PublicFrame";
import { Container, IconTile, Surface } from "@/components/landing/primitives";
import Icon from "@/components/ui/Icon";
import { site } from "@/data/landing";
import { publicContact } from "@/data/public";

export const metadata: Metadata = {
  title: "Contact and Location | Riyona Driving School",
  description: "Phone, WhatsApp and address for Riyona Driving School.",
};

/**
 * Only the contact details the project holds are shown. Opening hours, email and a map are left out until the school
 * supplies verified details. There is no contact form, because the project has no place to store or deliver messages.
 */
export default function ContactPage() {
  return (
    <PublicFrame>
      <PageHero
        eyebrow="Contact"
        title="Contact the school"
        description="Call or message us on WhatsApp. To start a registration request, apply online. The school reviews each application."
        actions={
          <Link
            href="/signup"
            className="inline-flex items-center rounded-xl bg-gold px-5 py-3 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
          >
            Apply now
          </Link>
        }
      />

      <Container>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <Surface className="flex flex-col gap-4 p-6">
            <IconTile>
              <Icon name="phone" className="h-5 w-5" />
            </IconTile>
            <div>
              <h2 className="text-[1.0625rem] font-bold text-ink">Phone</h2>
              <a href={site.phoneHref} className="mt-2 inline-block text-[1rem] font-semibold text-ink underline-offset-4 hover:underline">
                {site.phone}
              </a>
            </div>
          </Surface>

          <Surface className="flex flex-col gap-4 p-6">
            <IconTile tone="success">
              <Icon name="chat" className="h-5 w-5" />
            </IconTile>
            <div>
              <h2 className="text-[1.0625rem] font-bold text-ink">WhatsApp</h2>
              <a
                href={publicContact.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-[1rem] font-semibold text-ink underline-offset-4 hover:underline"
              >
                Message us on WhatsApp
              </a>
            </div>
          </Surface>

          <Surface className="flex flex-col gap-4 p-6">
            <IconTile>
              <Icon name="map-pin" className="h-5 w-5" />
            </IconTile>
            <div>
              <h2 className="text-[1.0625rem] font-bold text-ink">Address</h2>
              <p className="mt-2 text-[1rem] font-semibold text-ink">{publicContact.address}</p>
            </div>
          </Surface>
        </div>
      </Container>
    </PublicFrame>
  );
}
