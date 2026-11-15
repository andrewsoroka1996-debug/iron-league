/**
 * Read-only, short-lived shared snapshot for player coefficient cards.
 * Uses the official coefficient engine, inheritance rules and archived identity mapping.
 * The all-time and average ranks follow /coefficients (one-based sorted positions).
 * Season 4 is deliberately excluded until its coefficient source is enabled there.
 */
import { unstable_cache } from "next/cache";
import { players } from "../data/players";
import { season1Coefficients, type ArchivedCoefficientRow } from "../data/coefficients/season-1";
import { season2Coefficients } from "../data/coefficients/season-2";
import { supabase } from "./supabase";
import { findArchivePlayerId, normalizePlayerName } from "./coefficient-player-identity";
import { buildAverageCoefficientRows } from "./coefficient-season-average";
import { calculateCoefficients, type CoefficientMatch } from "./calculate-coefficients";
import { applyInheritedCoefficientAdjustments } from "./coefficient-inheritance";
import { loadSeason3CoefficientAdjustments } from "./coefficient-adjustments-server";
import { applyPlayerReplacements, getSeasonPlayerReplacements } from "./player-replacements";

type Row = { key: string; playerId: string | null; playerName: string; total: number };
type SeasonRow = { season: number; points: number };
export type PlayerCoefficientSnapshot = {
  seasons: SeasonRow[];
  allPoints: number | null;
  allPlace: number | null;
  averagePoints: number | null;
  averagePlace: number | null;
  participatedSeasons: number;
};

const COEFFICIENT_COMPETITIONS = [
  "division", "division-1-cup", "division-2-cup", "division-3-cup",
  "champions-league", "europa-league", "european-super-cup",
];

function archiveRows(rows: readonly ArchivedCoefficientRow[]): Row[] {
  return rows.map((row) => {
    const playerId = findArchivePlayerId(row.playerName);
    return {
      key: playerId ? `player-${playerId}` : `archive-${normalizePlayerName(row.playerName)}`,
      playerId,
      playerName: row.playerName,
      total: row.total,
    };
  });
}

async function loadSeason3Matches(): Promise<CoefficientMatch[]> {
  const pageSize = 1000;
  const matches: CoefficientMatch[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from("matches")
      .select(`id,season,competition,division,stage,group_name,round,leg,participant_type,
        home_id,away_id,home_goals,away_goals,status,series_id,series_home_id,
        series_away_id,is_tiebreak`)
      .eq("season", 3)
      .in("competition", COEFFICIENT_COMPETITIONS)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Coefficient matches unavailable: ${error.message}`);
    const batch = (data ?? []) as CoefficientMatch[];
    matches.push(...batch);
    if (batch.length < pageSize) return matches;
  }
}

function getLatestPlayerName(playerId: string | null, fallback: string): string {
  return players.find((player) => player.id === playerId)?.nickname ?? fallback;
}

/** Computes *all* rankings once per cache window, never separately per player. */
async function computeSnapshotRows(): Promise<Record<string, PlayerCoefficientSnapshot>> {
  const [matches, replacements, adjustments] = await Promise.all([
    loadSeason3Matches(),
    getSeasonPlayerReplacements(3),
    loadSeason3CoefficientAdjustments(),
  ]);
  const resolvePlayerId = (playerId: string): string =>
    applyPlayerReplacements([playerId], replacements)[0] ?? playerId;

  const liveRows: Row[] = applyInheritedCoefficientAdjustments(
    calculateCoefficients({ season: 3, matches, resolvePlayerId }),
    adjustments,
    replacements,
  ).map((row) => ({
    key: `player-${row.playerId}`,
    playerId: row.playerId,
    playerName: getLatestPlayerName(row.playerId, row.playerId),
    total: row.total,
  }));

  const groups = [
    { season: 1, rows: archiveRows(season1Coefficients) },
    { season: 2, rows: archiveRows(season2Coefficients) },
    { season: 3, rows: liveRows },
  ];
  const allMap = new Map<string, Row>();
  const seasonMap = new Map<string, Map<number, number>>();
  for (const { season, rows } of groups) {
    for (const row of rows) {
      const current = allMap.get(row.key);
      if (current) {
        current.total += row.total;
        if (row.playerId) {
          current.playerId = row.playerId;
          current.playerName = getLatestPlayerName(row.playerId, row.playerName);
        }
      } else {
        allMap.set(row.key, {
          ...row,
          playerName: row.playerId ? getLatestPlayerName(row.playerId, row.playerName) : row.playerName,
        });
      }
      let seasonValues = seasonMap.get(row.key);
      if (!seasonValues) {
        seasonValues = new Map<number, number>();
        seasonMap.set(row.key, seasonValues);
      }
      seasonValues.set(season, (seasonValues.get(season) ?? 0) + row.total);
    }
  }
  const allRows = [...allMap.values()]
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total || a.playerName.localeCompare(b.playerName));
  const averageRows = buildAverageCoefficientRows(
    [...groups].sort((a, b) => b.season - a.season),
  );
  const allRank = new Map(allRows.map((row, index) => [row.key, index + 1]));
  const avgRank = new Map(averageRows.map((row, index) => [row.key, index + 1]));
  const avgByKey = new Map(averageRows.map((row) => [row.key, row]));
  const snapshots: Record<string, PlayerCoefficientSnapshot> = {};
  for (const row of allMap.values()) {
    if (!row.playerId) continue;
    const seasonValues = seasonMap.get(row.key);
    const average = avgByKey.get(row.key);
    snapshots[row.playerId] = {
      seasons: [...(seasonValues?.entries() ?? [])]
        .sort((a, b) => a[0] - b[0])
        .map(([season, points]) => ({ season, points })),
      allPoints: allRank.has(row.key) ? row.total : null,
      allPlace: allRank.get(row.key) ?? null,
      averagePoints: average?.total ?? null,
      averagePlace: avgRank.get(row.key) ?? null,
      participatedSeasons: average?.seasonCount ?? seasonValues?.size ?? 0,
    };
  }
  return snapshots;
}

// Short TTL limits database egress on popular profiles; updates may appear up to 60 s later.
const loadCachedSnapshots = unstable_cache(
  computeSnapshotRows,
  ["iron-league-player-coefficients-v1"],
  { revalidate: 60 },
);

export async function getPlayerCoefficientSnapshot(playerId: string): Promise<PlayerCoefficientSnapshot | null> {
  const rows = await loadCachedSnapshots();
  return rows[playerId] ?? null;
}
