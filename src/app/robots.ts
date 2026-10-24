import type { MetadataRoute } from "next";

const SITE_URL = "https://riyonadrivingschool.com.lk";

/** Lets search engines index the public pages. The portals and API are private and are kept out of search. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/portal/", "/api/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
