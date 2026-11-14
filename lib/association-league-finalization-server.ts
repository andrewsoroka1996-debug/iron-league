import "server-only";

import { createHash } from "node:crypto";
import { cache } from "react";
import { supabaseAdmin } from "./supabase-admin";
import type {
  AssociationLeagueResult,
  AssociationLeagueRow,
} from "./association-league";

export type FinalizableAssociationSeason = 3 | 4;

export type AssociationLeagueFinalization = {
  season: FinalizableAssociationSeason;
  associationId: string;
  associationName: string;
  memberIds: string[];
  leaguePoints: number;
  rows: AssociationLeagueRow[];
  finalizedAt: string;
};

const TABLE = "association_league_finalizations";

/* Read only: absence of an explicit snapshot means NO trophy. */
export const getAssociationLeagueFinalization = cache(
  async (season: FinalizableAssociationSeason): Promise<AssociationLeagueFinalization | null> => {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("season,association_id,association_name,member_ids,league_points,frozen_rows,finalized_at")
      .eq("season", season)
      .maybeSingle();

    if (error) {
      throw new Error(`Не вдалося прочитати фіналізацію Ліги асоціацій: ${error.message}`);
    }
    if (!data) return null;

    if (
      !Array.isArray(data.member_ids) ||
      data.member_ids.some((id: unknown) => typeof id !== "string") ||
      !Array.isArray(data.frozen_rows) ||
      data.frozen_rows.length !== 8
    ) {
      throw new Error(`Пошкоджений snapshot Ліги асоціацій сезону ${season}`);
    }

    const championRow = (data.frozen_rows as AssociationLeagueRow[]).find(
      (row) => row.associationId === data.association_id && row.leaguePlace === 1
    );
    const savedMembers = data.member_ids as string[];
    if (
      !championRow || championRow.members.length !== savedMembers.length ||
      championRow.members.some((member, index) => member.playerId !== savedMembers[index])
    ) {
      throw new Error(`Snapshot Ліги асоціацій сезону ${season} не відповідає чемпіону`);
    }

    return {
      season,
      associationId: data.association_id as string,
      associationName: data.association_name as string,
      memberIds: data.member_ids as string[],
      leaguePoints: Number(data.league_points),
      rows: data.frozen_rows as AssociationLeagueRow[],
      finalizedAt: data.finalized_at as string,
    };
  }
);

export function getAssociationPreviewHash(
  league: AssociationLeagueResult,
  unresolvedMatches: number,
  recordedMatches: number
): string {
  return createHash("sha256")
    .update(JSON.stringify({
      season: league.season,
      cupComplete: league.cupComplete,
      rows: league.rows,
      unresolvedMatches,
      recordedMatches,
    }))
    .digest("hex");
}

export async function insertAssociationLeagueFinalization(
  snapshot: AssociationLeagueFinalization & { previewHash: string }
): Promise<void> {
  const { error } = await supabaseAdmin.from(TABLE).insert({
    season: snapshot.season,
    association_id: snapshot.associationId,
    association_name: snapshot.associationName,
    member_ids: snapshot.memberIds,
    league_points: snapshot.leaguePoints,
    frozen_rows: snapshot.rows,
    preview_hash: snapshot.previewHash,
  });

  if (error) {
    // Primary-key conflict is intentional: NEVER overwrite a finalized result.
    if (error.code === "23505") {
      throw new Error("Лігу асоціацій цього сезону вже фіналізовано. Перезапис заборонено.");
    }
    throw new Error(`Не вдалося зберегти фіналізацію: ${error.message}`);
  }
}

export const ASSOCIATION_COEFFICIENT_COMPETITIONS = [
  "division",
  "division-1-cup",
  "division-2-cup",
  "division-3-cup",
  "champions-league",
  "europa-league",
  "european-super-cup",
] as const;

/*
  All existing calendar rows must be administratively resolved.
  This CANNOT prove that every planned fixture was entered into the calendar,
  so a separate manual confirmation is required before writing a snapshot.
*/
export async function getAssociationFinalizationMatchStatus(
  season: FinalizableAssociationSeason
): Promise<{ recorded: number; unresolved: number }> {
  const PAGE = 1000;
  let offset = 0;
  let recorded = 0;
  let unresolved = 0;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("matches")
      .select("id,competition,division,status,home_goals,away_goals")
      .eq("season", season)
      .in("competition", [...ASSOCIATION_COEFFICIENT_COMPETITIONS])
      .order("id", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(`Перевірка матчів: ${error.message}`);
    const batch = data ?? [];
    for (const match of batch) {
      // The 4th division does not contribute to Association League coefficients.
      if (match.competition === "division" && match.division === 4) continue;
      recorded++;
      const finished =
        match.status === "finished" &&
        Number.isInteger(match.home_goals) &&
        Number.isInteger(match.away_goals);
      const closedUnplayed =
        match.status === "closed_unplayed" &&
        match.home_goals === null &&
        match.away_goals === null;
      if (!finished && !closedUnplayed) unresolved++;
    }
    if (batch.length < PAGE) break;
    offset += PAGE;
  }
  return { recorded, unresolved };
}
