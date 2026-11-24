import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Public pages are open to search engines and AI crawlers alike. The admin
// and the API stay out; client links (/select, /gallery) are crawlable only
// so link previews work, and each of those pages sets noindex itself.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/events", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
