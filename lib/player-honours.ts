import "server-only";

import { season1 } from "../data/seasons/season-1";
import { season2 } from "../data/seasons/season-2";
import { season3 } from "../data/seasons/season-3";
import { season4 } from "../data/seasons/season-4";

import type { SeasonNumber } from "../data/competitions/season-competitions";

import { getCompetitionAssociations } from "../data/competitions/get-competition-associations";

import { supabaseAdmin } from "./supabase-admin";
import { buildStandings } from "./standings";
import { calculateAssociationSeries } from "./association-series";

type DivisionNumber =
  | 1
  | 2
  | 3
  | 4;

export type PlayerHonourCategory =
  | "division"
  | "cup"
  | "europe"
  | "super-cup"
  | "association"
  | "coop";

export type PlayerHonour = {
  key: string;

  season: SeasonNumber;

  category:
    PlayerHonourCategory;

  title: string;
};

type MatchRow = {
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

type CoopTeamRow = {
  id: string;

  name: string;

  season: number;

  player_1_id: string;
  player_2_id: string;
};

const seasons: SeasonNumber[] = [
  1,
  2,
  3,
  4,
];

/*
  ========================================
  УЧАСНИКИ ДИВІЗІОНІВ
  ========================================
*/

function getDivisionPlayers(
  season: SeasonNumber,
  division: DivisionNumber
): readonly string[] {
  /*
    СЕЗОН 1
    Було 3 дивізіони.
  */

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

  /*
    СЕЗОН 2
  */

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

  /*
    СЕЗОН 3
  */

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

  /*
    СЕЗОН 4
  */

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
  ЧИ МАТЧ ЗАВЕРШЕНО
  ========================================
*/

function isFinished(
  match: MatchRow
) {
  return (
    match.status === "finished" &&
    match.home_goals !== null &&
    match.away_goals !== null
  );
}

/*
  ========================================
  ДОДАВАННЯ ТРОФЕЮ
  ========================================

  Захищаємося від випадкового
  дублювання одного трофею.
*/

function addHonour(
  honours: PlayerHonour[],
  honour: PlayerHonour
) {
  const alreadyExists =
    honours.some(
      (item) =>
        item.key === honour.key
    );

  if (!alreadyExists) {
    honours.push(honour);
  }
}

/*
  ========================================
  ПЕРЕМОЖЕЦЬ ОДНОМАТЧЕВОГО ФІНАЛУ
  ========================================
*/

function getSingleMatchWinner(
  match: MatchRow | undefined
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

  return null;
}

/*
  ========================================
  ПЕРЕМОЖЕЦЬ СЕРІЇ
  ========================================

  Використовується для турнірів,
  де фінал може складатися
  з кількох матчів.
*/

function getSeriesWinner(
  matches: MatchRow[]
) {
  if (matches.length === 0) {
    return null;
  }

  const first =
    matches[0];

  const participantA =
    first.series_home_id ??
    first.home_id;

  const participantB =
    first.series_away_id ??
    first.away_id;

  if (
    !participantA ||
    !participantB
  ) {
    return null;
  }

  let goalsA = 0;
  let goalsB = 0;

  let finishedMatches = 0;

  for (const match of matches) {
    if (!isFinished(match)) {
      continue;
    }

    /*
      A вдома
    */

    if (
      match.home_id ===
        participantA &&
      match.away_id ===
        participantB
    ) {
      goalsA +=
        match.home_goals!;

      goalsB +=
        match.away_goals!;

      finishedMatches += 1;

      continue;
    }

    /*
      B вдома
    */

    if (
      match.home_id ===
        participantB &&
      match.away_id ===
        participantA
    ) {
      goalsA +=
        match.away_goals!;

      goalsB +=
        match.home_goals!;

      finishedMatches += 1;
    }
  }

  if (finishedMatches === 0) {
    return null;
  }

  if (goalsA > goalsB) {
    return participantA;
  }

  if (goalsB > goalsA) {
    return participantB;
  }

  return null;
}

/*
  ========================================
  ПЕРЕМОЖЕЦЬ ФІНАЛУ
  ========================================

  Один матч:
  переможець за рахунком.

  Декілька матчів:
  переможець за сумою.
*/

function getFinalWinner(
  matches: MatchRow[]
) {
  const finished =
    matches.filter(
      isFinished
    );

  if (finished.length === 0) {
    return null;
  }

  if (finished.length === 1) {
    return getSingleMatchWinner(
      finished[0]
    );
  }

  return getSeriesWinner(
    finished
  );
}

/*
  ========================================
  ЗАВАНТАЖЕННЯ ВСІХ МАТЧІВ
  ========================================

  ВАЖЛИВО:

  Supabase може обмежувати кількість
  рядків одного запиту.

  Тому не робимо один запит на всю
  таблицю matches, а читаємо її
  сторінками по 1000 рядків.

  Це потрібно, щоб старі матчі
  та старі трофеї не зникали,
  коли база росте.
*/

async function getAllMatches(): Promise<
  MatchRow[]
> {
  const PAGE_SIZE = 1000;

  const allMatches:
    MatchRow[] = [];

  let from = 0;

  while (true) {
    const {
      data,
      error,
    } = await supabaseAdmin
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
      )
      .in(
        "season",
        [1, 2, 3, 4]
      )
      .order(
        "id",
        {
          ascending: true,
        }
      )
      .range(
        from,
        from +
          PAGE_SIZE -
          1
      );

    if (error) {
      throw error;
    }

    const batch =
      (data ??
        []) as MatchRow[];

    allMatches.push(
      ...batch
    );

    /*
      Якщо повернулося менше
      ніж PAGE_SIZE —
      це остання сторінка.
    */

    if (
      batch.length <
      PAGE_SIZE
    ) {
      break;
    }

    from += PAGE_SIZE;
  }

  return allMatches;
}

/*
  ========================================
  ОСНОВНА ФУНКЦІЯ
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

  let matches:
    MatchRow[] = [];

  try {
    matches =
      await getAllMatches();
  } catch (error) {
    console.error(
      "PLAYER HONOURS MATCHES ERROR:",
      error
    );

    return [];
  }

  /*
    ========================================
    1. ЧЕМПІОНИ ДИВІЗІОНІВ
    ========================================

    Чемпіон визначається автоматично
    з турнірної таблиці.

    Трофей присвоюємо тільки після
    завершення всього дивізіону.

    Для двоколового чемпіонату:

    N * (N - 1)

    16 учасників:
    16 * 15 = 240 матчів.
  */

  for (const season of seasons) {
    const divisions:
      DivisionNumber[] =
      season === 1
        ? [1, 2, 3]
        : [1, 2, 3, 4];

    for (
      const division of
        divisions
    ) {
      const participantIds =
        getDivisionPlayers(
          season,
          division
        );

      if (
        participantIds.length <
        2
      ) {
        continue;
      }

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

      const expectedMatches =
        participantIds.length *
        (
          participantIds.length -
          1
        );

      /*
        Сезон ще не завершено.
      */

      if (
        divisionMatches.length <
        expectedMatches
      ) {
        continue;
      }

      /*
  Для архівних Сезонів 1–2
  допускаємо історично
  незіграні матчі.

  Для Сезонів 3–4 чемпіон
  визначається тільки після
  завершення всього календаря.
*/

const isArchiveSeason =
  season === 1 ||
  season === 2;

const allFinished =
  divisionMatches.every(
    isFinished
  );

if (
  !isArchiveSeason &&
  !allFinished
) {
  continue;
}

      const standings =
        buildStandings({
          participantIds,

          matches:
            divisionMatches.map(
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
            "division-qualification",
        });

      const championId =
        standings[0]?.playerId;

      if (
        championId ===
        playerId
      ) {
        addHonour(
          honours,
          {
            key:
              `season-${season}-division-${division}`,

            season,

            category:
              "division",

            title:
              `${division} Дивізіон`,
          }
        );
      }
    }
  }

  /*
    ========================================
    2. КУБКИ ДИВІЗІОНІВ
    ========================================
  */

  const divisionCups = [
    {
      competition:
        "division-1-cup",

      title:
        "Кубок 1 Дивізіону",
    },

    {
      competition:
        "division-2-cup",

      title:
        "Кубок 2 Дивізіону",
    },

    {
      competition:
        "division-3-cup",

      title:
        "Кубок 3 Дивізіону",
    },

    {
      competition:
        "division-4-cup",

      title:
        "Кубок 4 Дивізіону",
    },
  ];

  for (const season of seasons) {
    for (
      const cup of
        divisionCups
    ) {
      const finalMatches =
        matches.filter(
          (match) =>
            match.season ===
              season &&
            match.competition ===
              cup.competition &&
            match.stage ===
              "final"
        );

      const winnerId =
        getFinalWinner(
          finalMatches
        );

      if (
        winnerId !==
        playerId
      ) {
        continue;
      }

      addHonour(
        honours,
        {
          key:
            `season-${season}-${cup.competition}`,

          season,

          category:
            "cup",

          title:
            cup.title,
        }
      );
    }
  }

  /*
    ========================================
    3. ЄВРОКУБКИ
    ========================================
  */

  const europeanCups = [
    {
      competition:
        "champions-league",

      title:
        "Ліга чемпіонів",
    },

    {
      competition:
        "europa-league",

      title:
        "Ліга Європи",
    },

    {
      competition:
        "conference-league",

      title:
        "Ліга конференцій",
    },
  ];

  for (const season of seasons) {
    for (
      const cup of
        europeanCups
    ) {
      const finalMatches =
        matches.filter(
          (match) =>
            match.season ===
              season &&
            match.competition ===
              cup.competition &&
            match.stage ===
              "final"
        );

      const winnerId =
        getFinalWinner(
          finalMatches
        );

      if (
        winnerId !==
        playerId
      ) {
        continue;
      }

      addHonour(
        honours,
        {
          key:
            `season-${season}-${cup.competition}`,

          season,

          category:
            "europe",

          title:
            cup.title,
        }
      );
    }
  }

  /*
    ========================================
    4. СУПЕРКУБОК ЄВРОПИ
    ========================================
  */

  for (const season of seasons) {
    const finalMatches =
      matches.filter(
        (match) =>
          match.season ===
            season &&
          match.competition ===
            "european-super-cup" &&
          match.stage ===
            "final"
      );

    const winnerId =
      getFinalWinner(
        finalMatches
      );

    if (
      winnerId !==
      playerId
    ) {
      continue;
    }

    addHonour(
      honours,
      {
        key:
          `season-${season}-european-super-cup`,

        season,

        category:
          "super-cup",

        title:
          "Суперкубок Європи",
      }
    );
  }

  /*
    ========================================
    5. КУБОК АСОЦІАЦІЙ
    ========================================

    Переможцем є асоціація.

    Трофей отримує кожен гравець,
    який входить до складу
    асоціації-переможця.
  */

  for (const season of seasons) {
    const finalMatches =
      matches.filter(
        (match) =>
          match.season ===
            season &&
          match.competition ===
            "associations-cup" &&
          match.stage ===
            "final" &&
          match.series_id !==
            null
      );

    if (
      finalMatches.length ===
      0
    ) {
      continue;
    }

    /*
      Групуємо матчі фіналу
      по series_id.
    */

    const seriesMap =
      new Map<
        string,
        MatchRow[]
      >();

    for (
      const match of
        finalMatches
    ) {
      if (!match.series_id) {
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
      const [
        seriesId,
        seriesMatches,
      ] of seriesMap
    ) {
      const first =
        seriesMatches[0];

      const homeAssociationId =
        first
          ?.series_home_id;

      const awayAssociationId =
        first
          ?.series_away_id;

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
        string | null = null;

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
          getCompetitionAssociations({
            season,

            competition:
              "associations-cup",
          });

        const championAssociation =
          associations.find(
            (association) =>
              association.id ===
              winnerAssociationId
          );

        if (
          !championAssociation
        ) {
          continue;
        }

        if (
          !championAssociation
            .players
            .includes(
              playerId
            )
        ) {
          continue;
        }

        addHonour(
          honours,
          {
            key:
              `season-${season}-associations-cup-${seriesId}`,

            season,

            category:
              "association",

            title:
              "Кубок асоціацій",
          }
        );
      } catch {
        /*
          У цьому сезоні
          Кубка асоціацій
          може не бути.
        */
      }
    }
  }

  /*
    ========================================
    6. IRON CO-OP CUP
    ========================================

    Переможцем є команда з 2 гравців.

    Трофей отримують обидва
    члени команди-переможця.
  */

  const {
    data: coopTeamsData,
    error: coopTeamsError,
  } = await supabaseAdmin
    .from("coop_teams")
    .select(
      `
        id,
        name,
        season,
        player_1_id,
        player_2_id
      `
    );

  if (coopTeamsError) {
    console.error(
      "PLAYER HONOURS COOP TEAMS ERROR:",
      coopTeamsError
    );
  }

  const coopTeams =
    (coopTeamsData ??
      []) as CoopTeamRow[];

  for (const season of seasons) {
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

    const winnerTeamRef =
      getFinalWinner(
        finalMatches
      );

    if (!winnerTeamRef) {
      continue;
    }

    /*
      У matches команда може
      зберігатися як через ID,
      так і через name.

      Підтримуємо обидва варіанти.
    */

    const winnerTeam =
      coopTeams.find(
        (team) =>
          team.season ===
            season &&
          (
            team.id ===
              winnerTeamRef ||
            team.name ===
              winnerTeamRef
          )
      );

    if (!winnerTeam) {
      continue;
    }

    const playerWon =
      winnerTeam.player_1_id ===
        playerId ||
      winnerTeam.player_2_id ===
        playerId;

    if (!playerWon) {
      continue;
    }

    addHonour(
      honours,
      {
        key:
          `season-${season}-iron-coop-cup`,

        season,

        category:
          "coop",

        title:
          "Iron Co-op Cup",
      }
    );
  }

  /*
    ========================================
    СОРТУВАННЯ
    ========================================

    Нові сезони зверху.

    Усередині сезону —
    за назвою трофею.
  */

  honours.sort(
    (a, b) => {
      if (
        a.season !==
        b.season
      ) {
        return (
          b.season -
          a.season
        );
      }

      return a.title.localeCompare(
        b.title,
        "uk"
      );
    }
  );

  return honours;
}