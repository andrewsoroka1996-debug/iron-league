
import type { MetadataRoute } from "next";

const SITE_URL = "https://ironleague.com.ua";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    // Головна сторінка
    "/",

    // Дивізіони
    "/divisions",
    "/divisions/1",
    "/divisions/2",
    "/divisions/3",
    "/divisions/4",

    // Турніри
    "/tournaments/associations",
    "/tournaments/champions-league",
    "/tournaments/conference-league",
    "/tournaments/coop-cup",
    "/tournaments/division-cups",
    "/tournaments/europa-league",
    "/tournaments/european-super-cup",
    "/tournaments/qualification",

    // Матчі та гравці
    "/matches",
    "/players",

    // Статистика
    "/coefficients",

    // Новини
    "/news",

    // Історія Iron League
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
