import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Public pages are open to every crawler, search and AI answer engines included.
// Private or account pages are kept out of the index.
const PRIVATE = ["/admin", "/api/", "/dashboard", "/reset-password", "/landing"];

export default function robots(): MetadataRoute.Robots {
  const ai = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "PerplexityBot", "Google-Extended", "Applebot-Extended", "CCBot"];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      ...ai.map((userAgent) => ({ userAgent, allow: "/", disallow: PRIVATE })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
