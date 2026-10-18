import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Fixed at build time, so the date only moves when the site is redeployed (not on every request).
const BUILT = new Date();

/** Public, indexable pages only. Private ones (admin, dashboard, reset-password) are left out on purpose. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, lastModified: BUILT, changeFrequency: "weekly", priority: 1, alternates: { languages: { en: `${SITE_URL}/`, "x-default": `${SITE_URL}/` } } },
    { url: `${SITE_URL}/editor`, lastModified: BUILT, changeFrequency: "weekly", priority: 0.8, alternates: { languages: { en: `${SITE_URL}/editor`, "x-default": `${SITE_URL}/editor` } } },
    { url: `${SITE_URL}/sitemap`, lastModified: BUILT, changeFrequency: "monthly", priority: 0.3 },
  ];
}
