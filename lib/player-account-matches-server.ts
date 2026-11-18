import "server-only";

import { players } from "../data/players";
import { supabase } from "./supabase";
import {
  groupDirectPlayerMatches,
  type PlayerAccountMatch,
  type PlayerMatchGroup,
} from "./player-account-match-groups";

/**
 * Read-only Season 4 source for direct matches.
 * Does not update results, submit applications, or authorize player actions.
 * Co-op and association-role participation need their own membership mapping.
 * Keep this service disconnected from the public page until the owner-check and
 * PLAYER_ACCOUNTS_ENABLED server feature gate have been implemented.
 */
export async function loadSeason4DirectPlayerMatchGroups(
  playerId: string,
): Promise<PlayerMatchGroup[]> {
  // The ID is interpolated into a PostgREST OR filter: allow only safe ID characters.
  if (!/^[A-Za-z0-9_-]+$/.test(playerId) ||
      !players.some((player) => player.id === playerId)) {
    throw new Error("Unknown or invalid player profile.");
  }
  // The existing public match calendar uses the same columns and id pagination.
  const pageSize = 500;
  const matches: PlayerAccountMatch[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("matches")
      .select(`
        id, season, competition, division, stage, group_name, round, leg,
        participant_type, home_id, away_id, home_goals, away_goals, status, played_at
      `)
      .eq("season", 4)
      .or(`home_id.eq.${playerId},away_id.eq.${playerId}`)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`Unable to load complete Season 4 match list: ${error.message}`);
    }
    const page = (data ?? []) as PlayerAccountMatch[];
    matches.push(...page);
    if (page.length < pageSize) break;
  }

  return groupDirectPlayerMatches(matches, playerId, 4);
}
