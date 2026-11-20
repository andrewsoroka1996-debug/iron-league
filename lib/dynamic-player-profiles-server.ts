import "server-only";

import { createClient } from "@supabase/supabase-js";
import { connection } from "next/server";
import { players } from "../data/players";

/** Only approved identities, never requests or auth identities, are public here. */
export type PublicPlayer = {
  id: string;
  nickname: string;
  account: string | null;
  source: "legacy" | "dynamic";
};

type NewPlayerRow = { id: string; nickname: string };
const PLAYER_TABLE = "player_profiles";
const PAGE_SIZE = 250;
const MAX_DYNAMIC_PLAYERS = 2500;

/** Independent from Discord and admin feature flags; OFF unless explicitly enabled. */
export function dynamicProfilesEnabled(): boolean {
  return process.env.IRON_LEAGUE_DYNAMIC_PLAYER_PROFILES_ENABLED === "true";
}

function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Public Supabase configuration is missing");
  // Public SELECT with RLS, not the privileged SUPABASE_SECRET_KEY.
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function nickKey(value: string): string {
  return value.normalize("NFC").trim().toLowerCase();
}

function allowedPlayerId(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 63 && value.length >= 3;
}

const legacyIds = new Set(players.map((p) => p.id.toLowerCase()));
const legacyNames = new Set(players.map((p) => nickKey(p.nickname)));

function fromDatabase(row: NewPlayerRow): PublicPlayer | null {
  if (typeof row.id !== "string" || typeof row.nickname !== "string") return null;
  if (!allowedPlayerId(row.id) || row.nickname.length < 3 || row.nickname.length > 32) return null;
  // A DB mistake may never override a source-controlled historical identity.
  if (legacyIds.has(row.id.toLowerCase()) || legacyNames.has(nickKey(row.nickname))) return null;
  return { id: row.id, nickname: row.nickname, account: null, source: "dynamic" };
}

/** Read-only list: kept outside every season/division roster and statistic. */
export async function listDynamicPlayers(): Promise<PublicPlayer[]> {
  if (!dynamicProfilesEnabled()) return [];
  await connection(); // On-demand read; never freeze newly approved profiles into a static build.
  const client = publicClient();
  const seenIds = new Set<string>();
  const result: PublicPlayer[] = [];
  for (let offset = 0; offset < MAX_DYNAMIC_PLAYERS; offset += PAGE_SIZE) {
    const { data, error } = await client.from(PLAYER_TABLE)
      .select("id,nickname")
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`Player profile list lookup failed: ${error.code || "query error"}`);
    const page = (data ?? []) as NewPlayerRow[];
    for (const row of page) {
      const player = fromDatabase(row);
      if (player && !seenIds.has(player.id)) {
        seenIds.add(player.id);
        result.push(player);
      }
    }
    if (page.length < PAGE_SIZE) break;
    if (offset + PAGE_SIZE >= MAX_DYNAMIC_PLAYERS) {
      throw new Error("Too many dynamic profiles for this list; implement pagination before raising the cap");
    }
  }
  return result.sort((a, b) => a.nickname.localeCompare(b.nickname, "uk", { sensitivity: "base" }));
}

/** Static players always win. New profiles can only resolve when enabled. */
export async function resolvePublicPlayer(playerId: string): Promise<PublicPlayer | null> {
  const legacy = players.find((p) => p.id === playerId);
  if (legacy) {
    return { id: legacy.id, nickname: legacy.nickname, account: legacy.account ?? null, source: "legacy" };
  }
  if (!dynamicProfilesEnabled() || !allowedPlayerId(playerId)) return null;
  await connection();
  try {
    const { data, error } = await publicClient().from(PLAYER_TABLE)
      .select("id,nickname")
      .eq("id", playerId)
      .maybeSingle();
    if (error) throw new Error(`Player profile lookup failed: ${error.code || "query error"}`);
    return data ? fromDatabase(data as NewPlayerRow) : null;
  } catch (error) {
    // A missing new table must not interfere with existing static profiles.
    console.error("DYNAMIC PLAYER PROFILE ERROR:", error);
    return null;
  }
}
