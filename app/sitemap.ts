import type { MetadataRoute } from "next";

import { PROJECTS, SITE_URL } from "@/app/lib/public-content";

export default function sitemap(): MetadataRoute.Sitemap {
  const projectEntries: MetadataRoute.Sitemap = PROJECTS.map((project) => ({
    url: `${SITE_URL}${project.projectLink}`,
    changeFrequency: "yearly",
    priority: project.featured ? 0.8 : 0.7,
  }));

  return [
    {
      url: SITE_URL,
      changeFrequency: "monthly",
      priority: 1,
    },
    ...projectEntries,
  ];
}
