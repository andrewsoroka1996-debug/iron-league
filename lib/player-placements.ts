import "server-only";
import { isDivisionCalendarMatchComplete } from "./division-calendar-completion";

import { cache } from "react";
import type { SeasonNumber } from "../data/competitions/season-competitions";
import { buildStandings } from "./standings";
import {
  getAllMatches,
  getDivisionPlayers,
  getFinalWinner,
  isFinished,
  type MatchRow,
} from "./player-honours";

export type PlayerPlacement = {
  key: string;
  season: SeasonNumber;
  kind: "silver" | "bronze" | "finalist";
  title: string;
};

type CupDefinition = { competition: string; title: string };

const cups: readonly CupDefinition[] = [
  { competition: "division-1-cup", title: "Кубок 1 Дивізіону" },
  { competition: "division-2-cup", title: "Кубок 2 Дивізіону" },
  { competition: "division-3-cup", title: "Кубок 3 Дивізіону" },
  { competition: "division-4-cup", title: "Кубок 4 Дивізіону" },
  { competition: "champions-league", title: "Ліга чемпіонів" },
  { competition: "europa-league", title: "Ліга Європи" },
  { competition: "conference-league", title: "Ліга конференцій" },
  { competition: "european-super-cup", title: "Суперкубок Європи" },
];

const seasons: readonly SeasonNumber[] = [1, 2, 3, 4];

/**
 * Only supplementary placements: no trophy, Hall of Fame, or coefficient changes.
 * Reuses the same React-cached match loader as getPlayerHonours during SSR.
 */
export const getPlayerPlacements = cache(async (playerId: string): Promise<PlayerPlacement[]> => {
  let matches: MatchRow[];
  try {
    matches = await getAllMatches();
  } catch (error) {
    console.error("PLAYER PLACEMENTS MATCHES ERROR:", error);
    return [];
  }

  const placements: PlayerPlacement[] = [];
  const found = new Set<string>();
  const add = (entry: PlayerPlacement) => {
    if (found.has(entry.key)) return;
    found.add(entry.key);
    placements.push(entry);
  };

  for (const season of seasons) {
    // The first season had three divisions. Reuse the same roster and
    // completion gates as the official champion calculation.
    for (const division of (season === 1 ? [1, 2, 3] : [1, 2, 3, 4]) as (1 | 2 | 3 | 4)[]) {
      const participantIds = getDivisionPlayers(season, division);
      if (participantIds.length < 3 || !participantIds.includes(playerId)) continue;

      const divisionMatches = matches.filter((match) =>
        match.season === season &&
        match.competition === "division" &&
        match.division === division
      );
      const expected = participantIds.length * (participantIds.length - 1);
      if (divisionMatches.length < expected) continue;
      // Historical seasons 1–2 can contain administratively unplayed fixtures.
      // Active seasons are never awarded positions before all fixtures finish.
      if (season >= 3 && !divisionMatches.every(isDivisionCalendarMatchComplete)) continue;

      const table = buildStandings({
        participantIds,
        matches: divisionMatches.map((match) => ({
          home_id: match.home_id,
          away_id: match.away_id,
          home_goals: match.home_goals,
          away_goals: match.away_goals,
          status: match.status,
        })),
        format: "division-qualification",
      });

      if (table[1]?.playerId === playerId) {
        add({
          key: `season-${season}-division-${division}-silver`,
          season,
          kind: "silver",
          title: `2-ге місце · ${division} Дивізіон`,
        });
      }
      if (table[2]?.playerId === playerId) {
        add({
          key: `season-${season}-division-${division}-bronze`,
          season,
          kind: "bronze",
          title: `3-тє місце · ${division} Дивізіон`,
        });
      }
    }

    for (const cup of cups) {
      const finalMatches = matches.filter((match) =>
        match.season === season &&
        match.competition === cup.competition &&
        match.stage === "final"
      );
      if (!finalMatches.length || !finalMatches.every(isFinished)) continue;
      const winner = getFinalWinner(finalMatches);
      if (!winner || winner === playerId) continue;

      // For a two-leg final, the stable series slots identify the finalists;
      // for a single match, use its home/away participants.
      const first = finalMatches[0];
      const participantA = first.series_home_id ?? first.home_id;
      const participantB = first.series_away_id ?? first.away_id;
      if (!participantA || !participantB || participantA === participantB) continue;
      if (winner !== participantA && winner !== participantB) continue;
      const runnerUp = winner === participantA ? participantB : participantA;
      if (runnerUp !== playerId) continue;

      add({
        key: `season-${season}-${cup.competition}-finalist`,
        season,
        kind: "finalist",
        title: `Фіналіст · ${cup.title}`,
      });
    }
  }

  return placements.sort((a, b) => b.season - a.season ||
    ({ silver: 0, bronze: 1, finalist: 2 }[a.kind] - { silver: 0, bronze: 1, finalist: 2 }[b.kind]) ||
    a.title.localeCompare(b.title, "uk"));
});
