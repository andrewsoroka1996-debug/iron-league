import "server-only";

import { supabaseAdmin } from "./supabase-admin";

type PlayerEmblemRow = {
  player_id: string;
  image_path: string;
};

const BUCKET = "player-emblems";

/**
 * Returns public emblem image URLs keyed by stable player ID.
 * Called from server components only; never exposes Supabase credentials.
 */
export async function getPlayerEmblemUrls(): Promise<Record<string, string>> {
  const { data, error } = await supabaseAdmin
    .from("player_emblems")
    .select("player_id, image_path");

  if (error) {
    console.error("PUBLIC PLAYER EMBLEMS ERROR:", error);
    return {};
  }

  const urls: Record<string, string> = {};

  for (const row of (data ?? []) as PlayerEmblemRow[]) {
    if (!row.player_id || !row.image_path) {
      continue;
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(row.image_path);

    if (publicUrlData.publicUrl) {
      urls[row.player_id] = publicUrlData.publicUrl;
    }
  }

  return urls;
}
