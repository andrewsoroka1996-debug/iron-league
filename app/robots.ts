
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api",
      ],
    },

    sitemap: "https://ironleague.com.ua/sitemap.xml",

    host: "https://ironleague.com.ua",
  };
}
