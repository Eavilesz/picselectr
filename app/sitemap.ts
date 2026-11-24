import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Add new public pages here as the site grows
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
