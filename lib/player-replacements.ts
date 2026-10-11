import "server-only";

import { supabaseAdmin } from "./supabase-admin";

export type PlayerReplacement = {
  id: string;

  season: number;
  division: number;

  outgoing_player_id: string;
  incoming_player_id: string;

  inherit_standings: boolean;

  created_at: string;
};

/*
  ========================================
  LOAD DIVISION REPLACEMENTS
  ========================================
*/

export async function getDivisionReplacements(
  season: number,
  division: number
): Promise<PlayerReplacement[]> {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("player_replacements")
    .select(
      `
        id,
        season,
        division,
        outgoing_player_id,
        incoming_player_id,
        inherit_standings,
        created_at
      `
    )
    .eq(
      "season",
      season
    )
    .eq(
      "division",
      division
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
  FINAL OWNER OF TOURNAMENT SLOT
  ========================================

  Supports replacement chains:

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
      replacement.outgoing_player_id,
      replacement.incoming_player_id
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
  CURRENT DIVISION ROSTER
  ========================================

  Base roster:

  A
  X
  Y

  After:

  A -> B

  Current roster:

  B
  X
  Y
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
    Protection against accidental
    duplicate active slots.
  */

  return Array.from(
    new Set(
      currentIds
    )
  );
}