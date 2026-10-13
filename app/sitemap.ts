
import type { MetadataRoute } from "next";

import { players } from "../data/players";
import { supabase } from "../lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE_URL = "https://ironleague.com.ua";

/*
  ========================================
  ОСНОВНІ ПУБЛІЧНІ СТОРІНКИ
  ========================================
*/

const staticRoutes = [
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

  // Історія
  "/history",
  "/history/season-1",
  "/history/season-2",
  "/history/season-3",
  "/history/season-4",
];

/*
  ========================================
  ГЕНЕРАЦІЯ SITEMAP
  ========================================
*/

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  /*
    1. Основні сторінки
  */

  const staticPages: MetadataRoute.Sitemap =
    staticRoutes.map((route) => ({
      url: `${SITE_URL}${route}`,
    }));

  /*
    2. Профілі гравців

    Використовуємо справжні ID
    з data/players.ts.
  */

  const playerIds = [
    ...new Set(
      players
        .map((player) => player.id)
        .filter((id) => id.trim().length > 0)
    ),
  ];

  const playerPages: MetadataRoute.Sitemap =
    playerIds.map((id) => ({
      url: `${SITE_URL}/players/${encodeURIComponent(id)}`,
    }));

  /*
    3. Опубліковані новини

    Чернетки не включаємо.
  */

  const { data, error } = await supabase
    .from("news")
    .select("slug")
    .eq("published", true);

  if (error) {
    console.error(
      "SITEMAP NEWS ERROR:",
      error.message
    );
  }

  const newsSlugs = [
    ...new Set(
      (data ?? [])
        .map((item) => item.slug)
        .filter(
          (slug): slug is string =>
            typeof slug === "string" &&
            slug.trim().length > 0
        )
    ),
  ];

  const newsPages: MetadataRoute.Sitemap =
    newsSlugs.map((slug) => ({
      url: `${SITE_URL}/news/${encodeURIComponent(slug)}`,
    }));

  /*
    4. Повна карта сайту
  */

  return [
    ...staticPages,
    ...playerPages,
    ...newsPages,
  ];
}
