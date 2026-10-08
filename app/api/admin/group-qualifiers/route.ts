import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabase-admin";

import { buildStandings } from "../../../../lib/standings";

import { getCompetitionGroups } from "../../../../data/competitions/get-competition-groups";
import { getCompetitionPlayers } from "../../../../data/competitions/get-competition-players";

import type { SeasonNumber } from "../../../../data/competitions/season-competitions";

type EuropeanCompetition =
  | "champions-league"
  | "europa-league"
  | "conference-league";

type DatabaseMatch = {
  group_name: string | null;

  home_id: string;
  away_id: string;

  home_goals: number | null;
  away_goals: number | null;

  status: string;
};

type Qualifier = {
  player_id: string;

  source_competition:
    EuropeanCompetition;

  group_name: string;

  position: number;
};

type GroupCompletion = {
  group_name: string;

  participants: number;

  expected_matches: number;

  finished_matches: number;

  complete: boolean;
};

type CompetitionResult = {
  qualifiers: Qualifier[];

  groups: GroupCompletion[];

  complete: boolean;
};

/*
  ========================================
  ЧИ ЗАВЕРШЕНА КОНКРЕТНА ГРУПА
  ========================================

  Кожна пара повинна зіграти:

  A — B
  B — A

  Тобто для N гравців:

  N × (N - 1) матчів.
*/

function isGroupComplete({
  participantIds,
  matches,
}: {
  participantIds: readonly string[];

  matches: DatabaseMatch[];
}) {
  /*
    Перевіряємо кожен
    напрямок окремо:

    A → B
    B → A
  */

  for (
    const homeId of participantIds
  ) {
    for (
      const awayId of participantIds
    ) {
      if (
        homeId === awayId
      ) {
        continue;
      }

      const matchExists =
        matches.some(
          (match) =>
            match.home_id ===
              homeId &&
            match.away_id ===
              awayId &&
            match.status ===
              "finished" &&
            match.home_goals !==
              null &&
            match.away_goals !==
              null
        );

      if (!matchExists) {
        return false;
      }
    }
  }

  return true;
}

/*
  ========================================
  ОТРИМАТИ ПОЗИЦІЇ З ГРУП
  ========================================
*/

async function getGroupPositions({
  season,
  competition,
  positions,
}: {
  season: SeasonNumber;

  competition:
    EuropeanCompetition;

  positions: number[];
}): Promise<CompetitionResult> {
  const groupNames =
    getCompetitionGroups({
      season,
      competition,
    });

  if (
    groupNames.length === 0
  ) {
    return {
      qualifiers: [],
      groups: [],
      complete: false,
    };
  }

  /*
    ========================================
    УСІ МАТЧІ ГРУПОВОГО ЕТАПУ
    ========================================
  */

  const {
    data,
    error,
  } = await supabaseAdmin
    .from("matches")
    .select(
      `
        group_name,
        home_id,
        away_id,
        home_goals,
        away_goals,
        status
      `
    )
    .eq(
      "season",
      season
    )
    .eq(
      "competition",
      competition
    )
    .eq(
      "stage",
      "group"
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  const matches =
    (data ?? []) as DatabaseMatch[];

  const qualifiers:
    Qualifier[] = [];

  const groups:
    GroupCompletion[] = [];

  /*
    ========================================
    КОЖНА ГРУПА ОКРЕМО
    ========================================
  */

  for (
    const groupName of groupNames
  ) {
    const participantIds =
      getCompetitionPlayers({
        season,

        competition,

        groupName,
      });

    const groupMatches =
      matches.filter(
        (match) =>
          match.group_name ===
          groupName
      );

    const finishedMatches =
      groupMatches.filter(
        (match) =>
          match.status ===
            "finished" &&
          match.home_goals !==
            null &&
          match.away_goals !==
            null
      );

    /*
      Наприклад:

      4 гравці
      4 × 3
      = 12 матчів
    */

    const expectedMatches =
      participantIds.length *
      (
        participantIds.length -
        1
      );

    const groupComplete =
      isGroupComplete({
        participantIds,
        matches:
          groupMatches,
      });

    groups.push({
      group_name:
        groupName,

      participants:
        participantIds.length,

      expected_matches:
        expectedMatches,

      finished_matches:
        finishedMatches.length,

      complete:
        groupComplete,
    });

    /*
      Якщо група ще не
      завершена — місця
      для плей-оф НЕ видаємо.
    */

    if (!groupComplete) {
      continue;
    }

    /*
      ======================================
      ФІНАЛЬНА ТАБЛИЦЯ ГРУПИ
      ======================================
    */

    const standings =
      buildStandings({
        participantIds,

        matches:
          groupMatches.map(
            (match) => ({
              home_id:
                match.home_id,

              away_id:
                match.away_id,

              home_goals:
                match.home_goals,

              away_goals:
                match.away_goals,

              status:
                match.status,
            })
          ),

        format:
          "europe-group",
      });

    /*
      ======================================
      ПОТРІБНІ МІСЦЯ
      ======================================
    */

    for (
      const position of positions
    ) {
      const row =
        standings[
          position - 1
        ];

      if (!row) {
        continue;
      }

      qualifiers.push({
        player_id:
          row.playerId,

        source_competition:
          competition,

        group_name:
          groupName,

        position,
      });
    }
  }

  /*
    Турнірний груповий етап
    завершений тільки якщо
    завершені ВСІ його групи.
  */

  const complete =
    groups.length > 0 &&
    groups.every(
      (group) =>
        group.complete
    );

  return {
    qualifiers,
    groups,
    complete,
  };
}

/*
  ==========================================
  GET
  ==========================================
*/

export async function GET(
  request: Request
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const season = Number(
      searchParams.get("season")
    );

    const competition =
      searchParams.get(
        "competition"
      ) as
        | EuropeanCompetition
        | null;

    /*
      ========================================
      СЕЗОН
      ========================================
    */

    if (
      !Number.isInteger(season) ||
      season < 1 ||
      season > 4
    ) {
      return NextResponse.json(
        {
          error:
            "Невірний сезон",
        },
        {
          status: 400,
        }
      );
    }

    const seasonNumber =
      season as SeasonNumber;

    /*
      ========================================
      ТУРНІР
      ========================================
    */

    const allowedCompetitions:
      EuropeanCompetition[] = [
        "champions-league",
        "europa-league",
        "conference-league",
      ];

    if (
      !competition ||
      !allowedCompetitions.includes(
        competition
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Невірний турнір",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ЛК у Сезонах 1–2
      не існувала.
    */

    if (
      competition ===
        "conference-league" &&
      seasonNumber < 3
    ) {
      return NextResponse.json({
        success: true,

        season:
          seasonNumber,

        competition,

        group_stage_complete:
          false,

        qualifiers: [],

        count: 0,

        details: [],

        groups: [],
      });
    }

    let qualifiers:
      Qualifier[] = [];

    let allGroups:
      GroupCompletion[] = [];

    let groupStageComplete =
      false;

    /*
      ========================================
      ЛІГА ЧЕМПІОНІВ
      ========================================

      1–2 місця ЛЧ.
    */

    if (
      competition ===
      "champions-league"
    ) {
      const champions =
        await getGroupPositions({
          season:
            seasonNumber,

          competition:
            "champions-league",

          positions:
            [1, 2],
        });

      groupStageComplete =
        champions.complete;

      allGroups =
        champions.groups;

      /*
        Учасників 1/8 видаємо
        тільки після завершення
        ВСІХ груп ЛЧ.
      */

      if (
        groupStageComplete
      ) {
        qualifiers =
          champions.qualifiers;
      }
    }

    /*
      ========================================
      ЛІГА ЄВРОПИ
      ========================================

      1–2 місце ЛЄ
      +
      3 місце ЛЧ.
    */

    if (
      competition ===
      "europa-league"
    ) {
      const europa =
        await getGroupPositions({
          season:
            seasonNumber,

          competition:
            "europa-league",

          positions:
            [1, 2],
        });

      const champions =
        await getGroupPositions({
          season:
            seasonNumber,

          competition:
            "champions-league",

          positions:
            [3],
        });

      /*
        Для 1/8 ЛЄ повинні бути
        завершені:

        - усі групи ЛЄ
        - усі групи ЛЧ
      */

      groupStageComplete =
        europa.complete &&
        champions.complete;

      allGroups = [
        ...europa.groups,
        ...champions.groups,
      ];

      if (
        groupStageComplete
      ) {
        qualifiers = [
          ...europa.qualifiers,
          ...champions.qualifiers,
        ];
      }
    }

    /*
      ========================================
      ЛІГА КОНФЕРЕНЦІЙ
      ========================================

      1–3 місця ЛК
      +
      3 місце ЛЄ.
    */

    if (
      competition ===
      "conference-league"
    ) {
      const conference =
        await getGroupPositions({
          season:
            seasonNumber,

          competition:
            "conference-league",

          positions:
            [1, 2, 3],
        });

      const europa =
        await getGroupPositions({
          season:
            seasonNumber,

          competition:
            "europa-league",

          positions:
            [3],
        });

      /*
        Для 1/8 ЛК повинні бути
        завершені:

        - усі групи ЛК
        - усі групи ЛЄ
      */

      groupStageComplete =
        conference.complete &&
        europa.complete;

      allGroups = [
        ...conference.groups,
        ...europa.groups,
      ];

      if (
        groupStageComplete
      ) {
        qualifiers = [
          ...conference.qualifiers,
          ...europa.qualifiers,
        ];
      }
    }

    /*
      ========================================
      БЕЗ ДУБЛІКАТІВ
      ========================================
    */

    const uniquePlayerIds =
      [
        ...new Set(
          qualifiers.map(
            (qualifier) =>
              qualifier.player_id
          )
        ),
      ];

    return NextResponse.json({
      success: true,

      season:
        seasonNumber,

      competition,

      group_stage_complete:
        groupStageComplete,

      qualifiers:
        uniquePlayerIds,

      count:
        uniquePlayerIds.length,

      details:
        qualifiers,

      groups:
        allGroups,
    });
  } catch (error) {
    console.error(
      "GROUP QUALIFIERS ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Помилка визначення учасників 1/8 фіналу",
      },
      {
        status: 500,
      }
    );
  }
}