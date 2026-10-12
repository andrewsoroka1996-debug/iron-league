import "server-only";

import { supabaseAdmin } from "./supabase-admin";

export type PlayerReplacement = {
  id: string;

  season: number;
  division: number;

  outgoing_player_id: string;
  incoming_player_id: string;

  inherit_standings: boolean;

  coop_removed_team_id:
    | string
    | null;

  coop_removed_slot:
    | number
    | null;

  created_at: string;
};

/*
  ========================================
  LOAD ALL REPLACEMENTS OF SEASON
  ========================================
*/

export async function getSeasonPlayerReplacements(
  season: number
): Promise<PlayerReplacement[]> {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from(
      "player_replacements"
    )
    .select(
      `
        id,
        season,
        division,
        outgoing_player_id,
        incoming_player_id,
        inherit_standings,
        coop_removed_team_id,
        coop_removed_slot,
        created_at
      `
    )
    .eq(
      "season",
      season
    )
    .order(
      "created_at",
      {
        ascending: true,
      }
    );

  if (error) {
    throw new Error(
      `PLAYER REPLACEMENTS ERROR: ${error.message}`
    );
  }

  return (
    data ?? []
  ) as PlayerReplacement[];
}

/*
  ========================================
  LOAD REPLACEMENTS OF DIVISION
  ========================================

  Залишаємо функцію для сумісності
  з поточним кодом.

  Пізніше поступово переведемо
  всі standings/statistics на
  getSeasonPlayerReplacements().
  ========================================
*/

export async function getDivisionReplacements(
  season: number,
  division: number
): Promise<PlayerReplacement[]> {
  const replacements =
    await getSeasonPlayerReplacements(
      season
    );

  return replacements.filter(
    (replacement) =>
      replacement.division ===
      division
  );
}

/*
  ========================================
  FINAL OWNER OF PLAYER SLOT
  ========================================

  Supports chains:

  A -> B
  B -> C

  Result:

  A -> C
  B -> C
  C -> C
  ========================================
*/

export function resolveReplacementPlayerId(
  playerId: string,
  replacements: readonly PlayerReplacement[]
): string {
  const replacementMap =
    new Map<
      string,
      string
    >();

  for (
    const replacement of replacements
  ) {
    if (
      !replacement.inherit_standings
    ) {
      continue;
    }

    replacementMap.set(
      replacement
        .outgoing_player_id,
      replacement
        .incoming_player_id
    );
  }

  let currentId =
    playerId;

  const visited =
    new Set<string>();

  while (
    replacementMap.has(
      currentId
    )
  ) {
    if (
      visited.has(
        currentId
      )
    ) {
      throw new Error(
        `PLAYER REPLACEMENT CYCLE: ${playerId}`
      );
    }

    visited.add(
      currentId
    );

    currentId =
      replacementMap.get(
        currentId
      )!;
  }

  return currentId;
}

/*
  ========================================
  CURRENT PLAYER LIST
  ========================================
*/

export function applyPlayerReplacements(
  playerIds: readonly string[],
  replacements: readonly PlayerReplacement[]
): string[] {
  const currentIds =
    playerIds.map(
      (playerId) =>
        resolveReplacementPlayerId(
          playerId,
          replacements
        )
    );

  /*
    Protection against duplicate
    active slots.
  */

  return Array.from(
    new Set(
      currentIds
    )
  );
}