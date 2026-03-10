import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://domainsearcher.local", // Replace with actual production URL
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
