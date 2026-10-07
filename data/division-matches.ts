import type { LeagueMatch } from "../lib/calculateStandings";
import { divisionSchedule } from "./division-schedule";

type SeasonNumber = 1 | 2 | 3 | 4;
type DivisionNumber = 1 | 2 | 3 | 4;

function getMatches(
  season: SeasonNumber,
  division: DivisionNumber
): LeagueMatch[] {
  return divisionSchedule[season][division].flatMap(
    (round) => round.matches
  );
}

export const divisionMatches: Record<
  SeasonNumber,
  Record<DivisionNumber, LeagueMatch[]>
> = {
  1: {
    1: getMatches(1, 1),
    2: getMatches(1, 2),
    3: getMatches(1, 3),
    4: getMatches(1, 4),
  },

  2: {
    1: getMatches(2, 1),
    2: getMatches(2, 2),
    3: getMatches(2, 3),
    4: getMatches(2, 4),
  },

  3: {
    1: getMatches(3, 1),
    2: getMatches(3, 2),
    3: getMatches(3, 3),
    4: getMatches(3, 4),
  },

  4: {
    1: getMatches(4, 1),
    2: getMatches(4, 2),
    3: getMatches(4, 3),
    4: getMatches(4, 4),
  },
};