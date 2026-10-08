import { season1 } from "../seasons/season-1";
import { season2 } from "../seasons/season-2";
import { season3 } from "../seasons/season-3";

import { season1Qualification } from "../seasons/season-1-qualification";
import { season2Qualification } from "../seasons/season-2-qualification";
import { season3Qualification } from "../seasons/season-3-qualification";

import { season1ChampionsLeague } from "../seasons/season-1-champions-league";
import { season1EuropaLeague } from "../seasons/season-1-europa-league";

import { season2ChampionsLeague } from "../seasons/season-2-champions-league";
import { season2EuropaLeague } from "../seasons/season-2-europa-league";

type SeasonNumber = 1 | 2 | 3 | 4;

function unique(ids: readonly string[]) {
  return [...new Set(ids)];
}

function flattenGroups(
  groups: Record<
    string,
    readonly string[]
  >
) {
  return unique(
    Object.values(groups).flat()
  );
}

export function getCompetitionPlayers({
  season,
  competition,
  groupName,
}: {
  season: SeasonNumber;
  competition: string;
  groupName?: string | null;
}) {
  /*
    ========================================
    КВАЛІФІКАЦІЇ
    ========================================
  */

  if (
    competition ===
    "season-qualification"
  ) {
    if (season === 1) {
      return [
        ...season1Qualification.participants,
      ];
    }

    if (season === 2) {
      return [
        ...season2Qualification.participants,
      ];
    }

    if (season === 3) {
      return [
        ...season3Qualification.participants,
      ];
    }

    return [];
  }

  /*
    ========================================
    СЕЗОН 1
    ========================================
  */

  if (season === 1) {
    if (
      competition === "division-1" ||
      competition === "division-1-cup"
    ) {
      return [...season1.division1.players];
    }

    if (
      competition === "division-2" ||
      competition === "division-2-cup"
    ) {
      return [...season1.division2.players];
    }

    if (
      competition === "division-3" ||
      competition === "division-3-cup"
    ) {
      return [...season1.division3.players];
    }

    if (
      competition ===
      "champions-league"
    ) {
      if (
        groupName &&
        groupName in
          season1ChampionsLeague.groups
      ) {
        const group =
          groupName as keyof typeof season1ChampionsLeague.groups;

        return [
          ...season1ChampionsLeague
            .groups[group],
        ];
      }

      return flattenGroups(
        season1ChampionsLeague.groups
      );
    }

    if (
      competition ===
      "europa-league"
    ) {
      if (
        groupName &&
        groupName in
          season1EuropaLeague.groups
      ) {
        const group =
          groupName as keyof typeof season1EuropaLeague.groups;

        return [
          ...season1EuropaLeague
            .groups[group],
        ];
      }

      return flattenGroups(
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
      competition === "division-1" ||
      competition === "division-1-cup"
    ) {
      return [...season2.division1.players];
    }

    if (
      competition === "division-2" ||
      competition === "division-2-cup"
    ) {
      return [...season2.division2.players];
    }

    if (
      competition === "division-3" ||
      competition === "division-3-cup"
    ) {
      return [...season2.division3.players];
    }

    if (
      competition === "division-4"
    ) {
      return [...season2.division4.players];
    }

    if (
      competition ===
      "champions-league"
    ) {
      if (
        groupName &&
        groupName in
          season2ChampionsLeague.groups
      ) {
        const group =
          groupName as keyof typeof season2ChampionsLeague.groups;

        return [
          ...season2ChampionsLeague
            .groups[group],
        ];
      }

      return flattenGroups(
        season2ChampionsLeague.groups
      );
    }

    if (
      competition ===
      "europa-league"
    ) {
      if (
        groupName &&
        groupName in
          season2EuropaLeague.groups
      ) {
        const group =
          groupName as keyof typeof season2EuropaLeague.groups;

        return [
          ...season2EuropaLeague
            .groups[group],
        ];
      }

      return flattenGroups(
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
      competition === "division-1" ||
      competition === "division-1-cup"
    ) {
      return [
        ...season3.division1.players,
      ];
    }

    if (
      competition === "division-2" ||
      competition === "division-2-cup"
    ) {
      return [
        ...season3.division2.players,
      ];
    }

    if (
      competition === "division-3" ||
      competition === "division-3-cup"
    ) {
      return [
        ...season3.division3.players,
      ];
    }

    if (
      competition === "division-4" ||
      competition === "division-4-cup"
    ) {
      return [
        ...season3.division4.players,
      ];
    }

    if (
      competition ===
      "champions-league"
    ) {
      if (
        groupName &&
        groupName in
          season3.championsLeague.groups
      ) {
        const group =
          groupName as keyof typeof season3.championsLeague.groups;

        return [
          ...season3.championsLeague
            .groups[group],
        ];
      }

      return flattenGroups(
        season3.championsLeague.groups
      );
    }

    if (
      competition ===
      "europa-league"
    ) {
      if (
        groupName &&
        groupName in
          season3.europaLeague.groups
      ) {
        const group =
          groupName as keyof typeof season3.europaLeague.groups;

        return [
          ...season3.europaLeague
            .groups[group],
        ];
      }

      return flattenGroups(
        season3.europaLeague.groups
      );
    }

    if (
      competition ===
      "conference-league"
    ) {
      if (
        groupName &&
        groupName in
          season3.conferenceLeague.groups
      ) {
        const group =
          groupName as keyof typeof season3.conferenceLeague.groups;

        return [
          ...season3.conferenceLeague
            .groups[group],
        ];
      }

      return flattenGroups(
        season3.conferenceLeague.groups
      );
    }

    return [];
  }

  /*
    ========================================
    СЕЗОН 4
    ========================================

    Поки структура ще не готова.
  */

  return [];
}