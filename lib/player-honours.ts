import { supabase } from "./supabase";

import {
  calculateStandings,
  type LeagueMatch,
} from "./calculateStandings";

import { calculateAssociationSeries } from "./association-series";

import { season1 } from "../data/seasons/season-1";
import { season2 } from "../data/seasons/season-2";
import { season3 } from "../data/seasons/season-3";
import { season4 } from "../data/seasons/season-4";

import { getCompetitionAssociations } from "../data/competitions/get-competition-associations";

import type { SeasonNumber } from "../data/competitions/season-competitions";

type DivisionNumber =
  | 1
  | 2
  | 3
  | 4;

type TrophyMatch = {
  id: string;

  season: number;

  competition: string;

  division: number | null;

  stage: string | null;

  round: number | null;

  leg: number | null;

  participant_type: string;

  home_id: string;
  away_id: string;

  home_goals: number | null;
  away_goals: number | null;

  status: string;

  series_id: string | null;

  series_home_id: string | null;
  series_away_id: string | null;

  is_tiebreak: boolean;
};

type CoopTeam = {
  id: string;

  season: number;

  name: string;

  player_1_id: string;
  player_2_id: string;
};

export type PlayerHonour = {
  key: string;

  season: number;

  competition: string;

  title: string;

  category:
    | "division"
    | "cup"
    | "europe"
    | "super-cup"
    | "association"
    | "coop";
};

/*
  ========================================
  ДИВІЗІОНИ СЕЗОНУ
  ========================================
*/

function getAvailableDivisions(
  season: SeasonNumber
): DivisionNumber[] {
  if (season === 1) {
    return [
      1,
      2,
      3,
    ];
  }

  return [
    1,
    2,
    3,
    4,
  ];
}

/*
  ========================================
  СКЛАД ДИВІЗІОНУ
  ========================================
*/

function getDivisionPlayers(
  season: SeasonNumber,
  division: DivisionNumber
): readonly string[] {
  if (season === 1) {
    if (division === 1) {
      return season1.division1.players;
    }

    if (division === 2) {
      return season1.division2.players;
    }

    if (division === 3) {
      return season1.division3.players;
    }

    return [];
  }

  if (season === 2) {
    if (division === 1) {
      return season2.division1.players;
    }

    if (division === 2) {
      return season2.division2.players;
    }

    if (division === 3) {
      return season2.division3.players;
    }

    return season2.division4.players;
  }

  if (season === 3) {
    if (division === 1) {
      return season3.division1.players;
    }

    if (division === 2) {
      return season3.division2.players;
    }

    if (division === 3) {
      return season3.division3.players;
    }

    return season3.division4.players;
  }

  if (division === 1) {
    return season4.division1.players;
  }

  if (division === 2) {
    return season4.division2.players;
  }

  if (division === 3) {
    return season4.division3.players;
  }

  return season4.division4.players;
}

/*
  ========================================
  НАЗВА ТУРНІРУ
  ========================================
*/

function getCompetitionTitle(
  competition: string
) {
  if (
    competition ===
    "champions-league"
  ) {
    return "Ліга чемпіонів";
  }

  if (
    competition ===
    "europa-league"
  ) {
    return "Ліга Європи";
  }

  if (
    competition ===
    "conference-league"
  ) {
    return "Ліга конференцій";
  }

  if (
    competition ===
    "european-super-cup"
  ) {
    return "Суперкубок Європи";
  }

  if (
    competition ===
    "iron-coop-cup"
  ) {
    return "Iron Co-op Cup";
  }

  if (
    competition ===
    "associations-cup"
  ) {
    return "Кубок асоціацій";
  }

  const divisionCup =
    competition.match(
      /^division-(\d)-cup$/
    );

  if (divisionCup) {
    return `Кубок ${divisionCup[1]} Дивізіону`;
  }

  return competition;
}

/*
  ========================================
  КАТЕГОРІЯ ТРОФЕЮ
  ========================================
*/

function getCategory(
  competition: string
): PlayerHonour["category"] {
  if (
    competition ===
    "european-super-cup"
  ) {
    return "super-cup";
  }

  if (
    competition ===
      "champions-league" ||
    competition ===
      "europa-league" ||
    competition ===
      "conference-league"
  ) {
    return "europe";
  }

  if (
    competition ===
    "iron-coop-cup"
  ) {
    return "coop";
  }

  if (
    competition ===
    "associations-cup"
  ) {
    return "association";
  }

  return "cup";
}

/*
  ========================================
  ЧИ МАТЧ ЗАВЕРШЕНИЙ
  ========================================
*/

function isFinished(
  match: TrophyMatch
) {
  return (
    match.status ===
      "finished" &&
    match.home_goals !==
      null &&
    match.away_goals !==
      null
  );
}

/*
  ========================================
  ПЕРЕМОЖЕЦЬ ОДНОГО МАТЧУ
  ========================================
*/

function getSingleMatchWinner(
  match:
    | TrophyMatch
    | undefined
) {
  if (
    !match ||
    !isFinished(match)
  ) {
    return null;
  }

  if (
    match.home_goals! >
    match.away_goals!
  ) {
    return match.home_id;
  }

  if (
    match.away_goals! >
    match.home_goals!
  ) {
    return match.away_id;
  }

  /*
    Якщо рахунок нічийний,
    автоматично трофей
    не присвоюємо.
  */

  return null;
}

/*
  ========================================
  ДВОМАТЧЕВИЙ ФІНАЛ
  ========================================
*/

function getTwoLegWinner(
  matches: TrophyMatch[]
) {
  const finished =
    matches
      .filter(isFinished)
      .sort(
        (a, b) =>
          (a.leg ?? 0) -
          (b.leg ?? 0)
      );

  if (
    finished.length < 2
  ) {
    return null;
  }

  const first =
    finished[0];

  const teamA =
    first.series_home_id ??
    first.home_id;

  const teamB =
    first.series_away_id ??
    first.away_id;

  if (
    !teamA ||
    !teamB
  ) {
    return null;
  }

  let goalsA = 0;
  let goalsB = 0;

  for (
    const match of finished
  ) {
    if (
      match.home_id ===
        teamA &&
      match.away_id ===
        teamB
    ) {
      goalsA +=
        match.home_goals!;

      goalsB +=
        match.away_goals!;

      continue;
    }

    if (
      match.home_id ===
        teamB &&
      match.away_id ===
        teamA
    ) {
      goalsA +=
        match.away_goals!;

      goalsB +=
        match.home_goals!;
    }
  }

  if (
    goalsA >
    goalsB
  ) {
    return teamA;
  }

  if (
    goalsB >
    goalsA
  ) {
    return teamB;
  }

  return null;
}

/*
  ========================================
  ТРОФЕЇ ГРАВЦЯ
  ========================================
*/

export async function getPlayerHonours(
  playerId: string
): Promise<PlayerHonour[]> {
  const honours:
    PlayerHonour[] = [];

  /*
    ========================================
    ВСІ МАТЧІ
    ========================================
  */

  const {
    data: matchesData,
    error: matchesError,
  } = await supabase
    .from("matches")
    .select(
      `
        id,
        season,
        competition,
        division,
        stage,
        round,
        leg,
        participant_type,
        home_id,
        away_id,
        home_goals,
        away_goals,
        status,
        series_id,
        series_home_id,
        series_away_id,
        is_tiebreak
      `
    );

  if (matchesError) {
    console.error(
      "PLAYER HONOURS MATCHES ERROR:",
      matchesError
    );

    return [];
  }

  const matches =
    (
      matchesData ??
      []
    ) as TrophyMatch[];

  /*
    ========================================
    CO-OP КОМАНДИ
    ========================================
  */

  const {
    data: coopTeamsData,
    error: coopTeamsError,
  } = await supabase
    .from("coop_teams")
    .select(
      `
        id,
        season,
        name,
        player_1_id,
        player_2_id
      `
    );

  if (coopTeamsError) {
    console.error(
      "PLAYER HONOURS COOP ERROR:",
      coopTeamsError
    );
  }

  const coopTeams =
    (
      coopTeamsData ??
      []
    ) as CoopTeam[];

  /*
    ========================================
    1. ЧЕМПІОНИ ДИВІЗІОНІВ

    Трофей присвоюється тільки тоді,
    коли в базі є повний календар
    і всі матчі завершені.
    ========================================
  */

  const seasons:
    SeasonNumber[] = [
      1,
      2,
      3,
      4,
    ];

  for (
    const season of seasons
  ) {
    const divisions =
      getAvailableDivisions(
        season
      );

    for (
      const division of divisions
    ) {
      const playerIds =
        getDivisionPlayers(
          season,
          division
        );

      if (
        !playerIds.includes(
          playerId
        )
      ) {
        continue;
      }

      /*
        Один круг:
        кожен грає з кожним один раз.
      */

      const expectedMatches =
        (
          playerIds.length *
          (
            playerIds.length -
            1
          )
        ) / 2;

      const divisionMatches =
        matches.filter(
          (match) =>
            match.season ===
              season &&
            match.competition ===
              "division" &&
            match.division ===
              division
        );

      if (
        divisionMatches.length !==
        expectedMatches
      ) {
        continue;
      }

      if (
        !divisionMatches.every(
          isFinished
        )
      ) {
        continue;
      }

      const leagueMatches:
        LeagueMatch[] =
        divisionMatches.map(
          (match) => ({
            id: match.id,

            round:
              match.round ??
              undefined,

            home:
              match.home_id,

            away:
              match.away_id,

            homeGoals:
              match.home_goals!,

            awayGoals:
              match.away_goals!,
          })
        );

      const standings =
        calculateStandings(
          playerIds,
          leagueMatches
        );

      const champion =
        standings[0];

      if (
        champion?.playerId ===
        playerId
      ) {
        honours.push({
          key:
            `s${season}-division-${division}`,

          season,

          competition:
            `division-${division}`,

          title:
            `Чемпіон ${division} Дивізіону`,

          category:
            "division",
        });
      }
    }
  }

  /*
    ========================================
    2. ОДНОМАТЧЕВІ ФІНАЛИ

    - Кубки дивізіонів
    - ЛЧ
    - ЛЄ
    - ЛК
    - Суперкубок
    ========================================
  */

  const singleFinalCompetitions =
    [
      "champions-league",
      "europa-league",
      "conference-league",
      "european-super-cup",
      "division-1-cup",
      "division-2-cup",
      "division-3-cup",
      "division-4-cup",
    ];

  for (
    const season of seasons
  ) {
    for (
      const competition of
        singleFinalCompetitions
    ) {
      let finalMatches =
        matches.filter(
          (match) =>
            match.season ===
              season &&
            match.competition ===
              competition &&
            match.stage ===
              "final"
        );

      /*
        Суперкубок може бути
        просто одним матчем
        без stage=final.
      */

      if (
        competition ===
          "european-super-cup" &&
        finalMatches.length ===
          0
      ) {
        finalMatches =
          matches.filter(
            (match) =>
              match.season ===
                season &&
              match.competition ===
                competition
          );
      }

      if (
        finalMatches.length !==
        1
      ) {
        continue;
      }

      const winner =
        getSingleMatchWinner(
          finalMatches[0]
        );

      if (
        winner !==
        playerId
      ) {
        continue;
      }

      honours.push({
        key:
          `s${season}-${competition}`,

        season,

        competition,

        title:
          getCompetitionTitle(
            competition
          ),

        category:
          getCategory(
            competition
          ),
      });
    }
  }

  /*
    ========================================
    3. IRON CO-OP CUP

    Фінал двоматчевий.
    Трофей отримують обидва
    гравці команди-переможця.
    ========================================
  */

  for (
    const season of seasons
  ) {
    const finalMatches =
      matches.filter(
        (match) =>
          match.season ===
            season &&
          match.competition ===
            "iron-coop-cup" &&
          match.stage ===
            "final"
      );

    if (
      finalMatches.length ===
      0
    ) {
      continue;
    }

    const seriesGroups =
      new Map<
        string,
        TrophyMatch[]
      >();

    for (
      const match of finalMatches
    ) {
      const key =
        match.series_id ??
        "final";

      const current =
        seriesGroups.get(
          key
        ) ?? [];

      current.push(
        match
      );

      seriesGroups.set(
        key,
        current
      );
    }

    for (
      const seriesMatches of
        seriesGroups.values()
    ) {
      const winnerTeamId =
        getTwoLegWinner(
          seriesMatches
        );

      if (
        !winnerTeamId
      ) {
        continue;
      }

      const winningTeam =
        coopTeams.find(
          (team) =>
            team.season ===
              season &&
            (
              team.id ===
                winnerTeamId ||
              team.name ===
                winnerTeamId
            )
        );

      if (!winningTeam) {
        continue;
      }

      const playerWon =
        winningTeam.player_1_id ===
          playerId ||
        winningTeam.player_2_id ===
          playerId;

      if (!playerWon) {
        continue;
      }

      honours.push({
        key:
          `s${season}-iron-coop-cup`,

        season,

        competition:
          "iron-coop-cup",

        title:
          "Iron Co-op Cup",

        category:
          "coop",
      });
    }
  }

  /*
    ========================================
    4. КУБОК АСОЦІАЦІЙ

    Визначаємо переможця фінальної
    серії тією ж логікою, яка вже
    використовується турніром.
    ========================================
  */

  for (
    const season of seasons
  ) {
    const associationFinals =
      matches.filter(
        (match) =>
          match.season ===
            season &&
          match.competition ===
            "associations-cup" &&
          match.stage ===
            "final" &&
          Boolean(
            match.series_id
          )
      );

    if (
      associationFinals.length ===
      0
    ) {
      continue;
    }

    const seriesMap =
      new Map<
        string,
        TrophyMatch[]
      >();

    for (
      const match of
        associationFinals
    ) {
      if (
        !match.series_id
      ) {
        continue;
      }

      const current =
        seriesMap.get(
          match.series_id
        ) ?? [];

      current.push(
        match
      );

      seriesMap.set(
        match.series_id,
        current
      );
    }

    for (
      const seriesMatches of
        seriesMap.values()
    ) {
      const first =
        seriesMatches[0];

      const homeAssociationId =
        first.series_home_id;

      const awayAssociationId =
        first.series_away_id;

      if (
        !homeAssociationId ||
        !awayAssociationId
      ) {
        continue;
      }

      const summary =
        calculateAssociationSeries(
          seriesMatches.map(
            (match) => ({
              id:
                match.id,

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

              is_tiebreak:
                match.is_tiebreak,
            })
          )
        );

      let winnerAssociationId:
        | string
        | null = null;

      if (
        summary.winner ===
        "home"
      ) {
        winnerAssociationId =
          homeAssociationId;
      }

      if (
        summary.winner ===
        "away"
      ) {
        winnerAssociationId =
          awayAssociationId;
      }

      if (
        !winnerAssociationId
      ) {
        continue;
      }

      try {
        const associations =
          getCompetitionAssociations(
            {
              season,

              competition:
                "associations-cup",
            }
          );

        const championAssociation =
          associations.find(
            (association) =>
              association.id ===
              winnerAssociationId
          );

        if (
          !championAssociation ||
          !Array.isArray(
            championAssociation.players
          ) ||
          !championAssociation.players.includes(
            playerId
          )
        ) {
          continue;
        }

        honours.push({
          key:
            `s${season}-associations-cup`,

          season,

          competition:
            "associations-cup",

          title:
            "Кубок асоціацій",

          category:
            "association",
        });
      } catch {
        /*
          У сезоні немає
          коректних даних асоціацій.
        */
      }
    }
  }

  /*
    ========================================
    БЕЗ ДУБЛІВ
    ========================================
  */

  return Array.from(
    new Map(
      honours.map(
        (honour) => [
          honour.key,
          honour,
        ]
      )
    ).values()
  ).sort(
    (a, b) =>
      a.season -
      b.season
  );
}