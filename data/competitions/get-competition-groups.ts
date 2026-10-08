import { season1ChampionsLeague } from "../seasons/season-1-champions-league";
import { season1EuropaLeague } from "../seasons/season-1-europa-league";

import { season2ChampionsLeague } from "../seasons/season-2-champions-league";
import { season2EuropaLeague } from "../seasons/season-2-europa-league";

import { season3 } from "../seasons/season-3";

type SeasonNumber = 1 | 2 | 3 | 4;

export function getCompetitionGroups({
  season,
  competition,
}: {
  season: SeasonNumber;
  competition: string;
}): string[] {
  /*
    ========================================
    СЕЗОН 1
    ========================================
  */

  if (season === 1) {
    if (
      competition ===
      "champions-league"
    ) {
      return Object.keys(
        season1ChampionsLeague.groups
      );
    }

    if (
      competition ===
      "europa-league"
    ) {
      return Object.keys(
        season1EuropaLeague.groups
      );
    }

    return [];
  }

  /*
    ========================================
    СЕЗОН 2
    ========================================
  */

  if (season === 2) {
    if (
      competition ===
      "champions-league"
    ) {
      return Object.keys(
        season2ChampionsLeague.groups
      );
    }

    if (
      competition ===
      "europa-league"
    ) {
      return Object.keys(
        season2EuropaLeague.groups
      );
    }

    return [];
  }

  /*
    ========================================
    СЕЗОН 3
    ========================================
  */

  if (season === 3) {
    if (
      competition ===
      "champions-league"
    ) {
      return Object.keys(
        season3.championsLeague.groups
      );
    }

    if (
      competition ===
      "europa-league"
    ) {
      return Object.keys(
        season3.europaLeague.groups
      );
    }

    if (
      competition ===
      "conference-league"
    ) {
      return Object.keys(
        season3.conferenceLeague.groups
      );
    }

    return [];
  }

  /*
    ========================================
    СЕЗОН 4
    ========================================

    Групи ще не сформовані.
  */

  return [];
}