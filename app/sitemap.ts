import type { MetadataRoute } from "next";

const SITE_URL = "https://junhoo.me";

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        { url: SITE_URL, changeFrequency: "monthly", priority: 1 },
        { url: `${SITE_URL}/publications`, changeFrequency: "monthly", priority: 0.9 },
        { url: `${SITE_URL}/template-infilling`, changeFrequency: "yearly", priority: 0.8 },
        { url: `${SITE_URL}/csf`, changeFrequency: "yearly", priority: 0.8 },
        { url: `${SITE_URL}/dsv`, changeFrequency: "yearly", priority: 0.8 },
        { url: `${SITE_URL}/any-way-meta-learning`, changeFrequency: "yearly", priority: 0.7 },
        { url: `${SITE_URL}/shot`, changeFrequency: "yearly", priority: 0.7 },
    ];
}
