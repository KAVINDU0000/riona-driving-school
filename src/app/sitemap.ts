import type { MetadataRoute } from "next";
import { SIGN_CATEGORIES } from "@/data/road-rules";

const SITE_URL = "https://riyonadrivingschool.com.lk";

/** The public pages a visitor can find from search. Sign-in, payment and account pages are left out on purpose. */
const PUBLIC_PAGES = ["", "/about", "/packages", "/vehicles", "/practice-papers", "/road-signs", "/contact", "/cash-discount", "/signup"];

export default function sitemap(): MetadataRoute.Sitemap {
  const categoryPages = SIGN_CATEGORIES.map((category) => `/road-signs/${category.id}`);
  return [...PUBLIC_PAGES, ...categoryPages].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
  }));
}
