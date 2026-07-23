import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://bookflow.app", lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: "https://bookflow.app/pricing", lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: "https://bookflow.app/login", lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: "https://bookflow.app/signup", lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ];
}
