
import type { MetadataRoute } from "next";

const SITE_URL = "https://ironleague.com.ua";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "/",
    "/divisions",
    "/divisions/1",
    "/divisions/2",
    "/divisions/3",
    "/divisions/4",
    "/matches",
    "/players",
    "/coefficients",
    "/news",
    "/history",
    "/history/season-1",
    "/history/season-2",
    "/history/season-3",
    "/history/season-4",
  ];

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
  }));
}
