import type { MetadataRoute } from "next";

import { SITE_URL } from "@/app/lib/public-content";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/private/", "/login", "/DRO", "/tasks", "/papers"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
