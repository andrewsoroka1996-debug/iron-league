import type { LeagueMatch } from "../lib/calculateStandings";

type SeasonNumber = 1 | 2 | 3 | 4;
type DivisionNumber = 1 | 2 | 3 | 4;

export const divisionMatches: Record<
  SeasonNumber,
  Record<DivisionNumber, LeagueMatch[]>
> = {
  1: {
    1: [],
    2: [],
    3: [],
    4: [],
  },

  2: {
    1: [],
    2: [],
    3: [],
    4: [],
  },

  3: {
    1: [],
    2: [],
    3: [],
    4: [],
  },

  4: {
    1: [],
    2: [],
    3: [],
    4: [],
  },
};