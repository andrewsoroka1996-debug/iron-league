import { season1 } from "../data/seasons/season-1";
import { season2 } from "../data/seasons/season-2";
import { season3 } from "../data/seasons/season-3";
import { season4 } from "../data/seasons/season-4";

import { getCompetitionGroups } from "../data/competitions/get-competition-groups";
import { getCompetitionPlayers } from "../data/competitions/get-competition-players";

import { buildStandings } from "./standings";

export type SeasonNumber =
  | 1
  | 2
  | 3
  | 4;

type DivisionNumber =
  | 1
  | 2
  | 3
  | 4;

export type CoefficientMatch = {
  id: string;

  season: number;
  competition: string;

  division: number | null;

  stage: string | null;
  group_name: string | null;

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

export type CoefficientBreakdown = {
  divisionMatches: number;
  divisionPlace: number;

  divisionCupMatches: number;
  divisionCupRounds: number;
  divisionCupWinner: number;

  championsLeagueMatches: number;
  championsLeagueGroup: number;
  championsLeagueRounds: number;
  championsLeagueFinal: number;

  europaLeagueMatches: number;
  europaLeagueGroup: number;
  europaLeagueRounds: number;
  europaLeagueFinal: number;

  europeanSuperCup: number;
};

export type CoefficientRow = {
  playerId: string;

  season: SeasonNumber;

  division:
    | DivisionNumber
    | null;

  breakdown: CoefficientBreakdown;

  total: number;
};

/*
  ========================================
  ПРАВИЛА КОЕФІЦІЄНТІВ
  ========================================

  У розрахунок НЕ входять:

  - 4 Дивізіон
  - Кубок 4 Дивізіону
  - Ліга конференцій
  - Кубок асоціацій
  - Iron Co-op Cup
  - Кваліфікація
*/

const DIVISION_MATCH_POINTS = {
  1: {
    win: 4,
    draw: 2,
    loss: 0,
  },

  2: {
    win: 3,
    draw: 1,
    loss: 0,
  },

  3: {
    win: 2,
    draw: 1,
    loss: 0,
  },
} as const;

const DIVISION_PLACE_POINTS = {
  1: {
    1: 30,
    2: 25,
    3: 20,
  },

  2: {
    1: 25,
    2: 20,
    3: 15,
  },

  3: {
    1: 20,
    2: 15,
    3: 10,
  },
} as const;

const DIVISION_CUP_POINTS = {
  1: {
    matchWin: 5,
    roundAdvance: 5,
    winner: 20,
  },

  2: {
    matchWin: 4,
    roundAdvance: 4,
    winner: 15,
  },

  3: {
    matchWin: 3,
    roundAdvance: 3,
    winner: 10,
  },
} as const;

const CHAMPIONS_LEAGUE_POINTS = {
  win: 6,
  draw: 3,
  loss: 1,

  groupPlayoff: 8,
  groupThird: 4,

  roundAdvance: 6,

  finalist: 15,
  winner: 30,
} as const;

const EUROPA_LEAGUE_POINTS = {
  win: 4,
  draw: 2,
  loss: 0,

  groupPlayoff: 6,

  roundAdvance: 4,

  finalist: 10,
  winner: 20,
} as const;

const EUROPEAN_SUPER_CUP_WINNER =
  15;

/*
  ========================================
  СКЛАДИ ДИВІЗІОНІВ
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

function getPlayerDivision(
  season: SeasonNumber,
  playerId: string
): DivisionNumber | null {
  const divisions: DivisionNumber[] = [
    1,
    2,
    3,
    4,
  ];

  for (const division of divisions) {
    if (
      getDivisionPlayers(
        season,
        division
      ).includes(playerId)
    ) {
      return division;
    }
  }

  return null;
}

/*
  ========================================
  БАЗОВІ ДОПОМІЖНІ ФУНКЦІЇ
  ========================================
*/

function isFinished(
  match: CoefficientMatch
) {
  return (
    match.status === "finished" &&
    match.home_goals !== null &&
    match.away_goals !== null
  );
}

function getMatchWinner(
  match: CoefficientMatch
) {
  if (!isFinished(match)) {
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

function createBreakdown():
  CoefficientBreakdown {
  return {
    divisionMatches: 0,
    divisionPlace: 0,

    divisionCupMatches: 0,
    divisionCupRounds: 0,
    divisionCupWinner: 0,

    championsLeagueMatches: 0,
    championsLeagueGroup: 0,
    championsLeagueRounds: 0,
    championsLeagueFinal: 0,

    europaLeagueMatches: 0,
    europaLeagueGroup: 0,
    europaLeagueRounds: 0,
    europaLeagueFinal: 0,

    europeanSuperCup: 0,
  };
}

function getTotal(
  breakdown: CoefficientBreakdown
) {
  return Object.values(
    breakdown
  ).reduce(
    (sum, value) =>
      sum + value,
    0
  );
}

/*
  ========================================
  РЯДКИ ГРАВЦІВ
  ========================================
*/

function createRows(
  season: SeasonNumber,
  matches: CoefficientMatch[]
) {
  const rows =
    new Map<
      string,
      CoefficientRow
    >();

  function ensurePlayer(
    playerId: string
  ) {
    if (rows.has(playerId)) {
      return;
    }

    rows.set(playerId, {
      playerId,

      season,

      division:
        getPlayerDivision(
          season,
          playerId
        ),

      breakdown:
        createBreakdown(),

      total: 0,
    });
  }

  /*
    Гравці 1–3 дивізіонів
    повинні бути в таблиці,
    навіть якщо мають 0 балів.
  */

  for (
    const division of [
      1,
      2,
      3,
    ] as const
  ) {
    for (
      const playerId of
      getDivisionPlayers(
        season,
        division
      )
    ) {
      ensurePlayer(playerId);
    }
  }

  /*
    Також додаємо гравців,
    які виступали в турнірах,
    що дають коефіцієнт.

    Наприклад гравець 4 дивізіону
    може отримати бали в ЛЧ або ЛЄ.
  */

  const coefficientCompetitions =
    new Set([
      "division",
      "division-1-cup",
      "division-2-cup",
      "division-3-cup",
      "champions-league",
      "europa-league",
      "european-super-cup",
    ]);

  for (const match of matches) {
    if (
      !coefficientCompetitions.has(
        match.competition
      )
    ) {
      continue;
    }

    if (
      match.competition ===
        "division" &&
      match.division === 4
    ) {
      continue;
    }

    ensurePlayer(
      match.home_id
    );

    ensurePlayer(
      match.away_id
    );
  }

  return rows;
}

function addPoints(
  rows: Map<
    string,
    CoefficientRow
  >,
  playerId: string,
  field:
    keyof CoefficientBreakdown,
  points: number
) {
  const row =
    rows.get(playerId);

  if (!row) {
    return;
  }

  row.breakdown[field] +=
    points;
}

/*
  ========================================
  1. МАТЧІ ДИВІЗІОНІВ
  ========================================
*/

function addDivisionMatchPoints(
  rows: Map<
    string,
    CoefficientRow
  >,
  matches: CoefficientMatch[]
) {
  for (const match of matches) {
    if (
      match.competition !==
      "division"
    ) {
      continue;
    }

    if (
      match.division !== 1 &&
      match.division !== 2 &&
      match.division !== 3
    ) {
      continue;
    }

    if (!isFinished(match)) {
      continue;
    }

    const rules =
      DIVISION_MATCH_POINTS[
        match.division
      ];

    const homeGoals =
      match.home_goals!;

    const awayGoals =
      match.away_goals!;

    if (
      homeGoals >
      awayGoals
    ) {
      addPoints(
        rows,
        match.home_id,
        "divisionMatches",
        rules.win
      );

      addPoints(
        rows,
        match.away_id,
        "divisionMatches",
        rules.loss
      );

      continue;
    }

    if (
      awayGoals >
      homeGoals
    ) {
      addPoints(
        rows,
        match.away_id,
        "divisionMatches",
        rules.win
      );

      addPoints(
        rows,
        match.home_id,
        "divisionMatches",
        rules.loss
      );

      continue;
    }

    addPoints(
      rows,
      match.home_id,
      "divisionMatches",
      rules.draw
    );

    addPoints(
      rows,
      match.away_id,
      "divisionMatches",
      rules.draw
    );
  }
}

/*
  ========================================
  2. ПІДСУМКОВІ МІСЦЯ
  ========================================

  Сезони 1–2 архівні.

  Якщо історично кілька матчів
  не були зіграні, це не блокує
  фінальні місця.

  Для активних сезонів усі матчі
  календаря повинні бути завершені.
*/

function addDivisionPlacePoints({
  rows,
  matches,
  season,
}: {
  rows: Map<
    string,
    CoefficientRow
  >;

  matches: CoefficientMatch[];

  season: SeasonNumber;
}) {
  for (
    const division of [
      1,
      2,
      3,
    ] as const
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

    if (
      divisionMatches.length <
      expectedMatches
    ) {
      continue;
    }

    const archiveSeason =
      season === 1 ||
      season === 2;

    if (
      !archiveSeason &&
      !divisionMatches.every(
        isFinished
      )
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

    const placeRules =
      DIVISION_PLACE_POINTS[
        division
      ];

    const first =
      standings[0]
        ?.playerId;

    const second =
      standings[1]
        ?.playerId;

    const third =
      standings[2]
        ?.playerId;

    if (first) {
      addPoints(
        rows,
        first,
        "divisionPlace",
        placeRules[1]
      );
    }

    if (second) {
      addPoints(
        rows,
        second,
        "divisionPlace",
        placeRules[2]
      );
    }

    if (third) {
      addPoints(
        rows,
        third,
        "divisionPlace",
        placeRules[3]
      );
    }
  }
}

/*
  ========================================
  3. КУБКИ ДИВІЗІОНІВ
  ========================================
*/

function addDivisionCupPoints(
  rows: Map<
    string,
    CoefficientRow
  >,
  matches: CoefficientMatch[]
) {
  for (
    const division of [
      1,
      2,
      3,
    ] as const
  ) {
    const competition =
      `division-${division}-cup`;

    const cupMatches =
      matches.filter(
        (match) =>
          match.competition ===
          competition
      );

    const rules =
      DIVISION_CUP_POINTS[
        division
      ];

    for (
      const match of cupMatches
    ) {
      if (!isFinished(match)) {
        continue;
      }

      const winner =
        getMatchWinner(match);

      if (!winner) {
        continue;
      }

      /*
        Бонус за перемогу
        в кожному матчі Кубка.
      */

      addPoints(
        rows,
        winner,
        "divisionCupMatches",
        rules.matchWin
      );

      /*
        Бонус за проходження:

        1/8
        1/4
        1/2

        За фінал бонус
        проходження не додаємо.
      */

      if (
        match.stage ===
          "round-of-16" ||
        match.stage ===
          "quarterfinal" ||
        match.stage ===
          "semifinal"
      ) {
        addPoints(
          rows,
          winner,
          "divisionCupRounds",
          rules.roundAdvance
        );
      }

      /*
        Переможець Кубка.
      */

      if (
        match.stage ===
        "final"
      ) {
        addPoints(
          rows,
          winner,
          "divisionCupWinner",
          rules.winner
        );
      }
    }
  }
}

/*
  ========================================
  4. МАТЧЕВІ БАЛИ ЄВРОКУБКІВ
  ========================================
*/

function addEuropeanMatchPoints(
  rows: Map<
    string,
    CoefficientRow
  >,
  matches: CoefficientMatch[],
  competition:
    | "champions-league"
    | "europa-league"
) {
  const rules =
    competition ===
    "champions-league"
      ? CHAMPIONS_LEAGUE_POINTS
      : EUROPA_LEAGUE_POINTS;

  const field:
    keyof CoefficientBreakdown =
    competition ===
    "champions-league"
      ? "championsLeagueMatches"
      : "europaLeagueMatches";

  for (const match of matches) {
    if (
      match.competition !==
      competition ||
      !isFinished(match)
    ) {
      continue;
    }

    const homeGoals =
      match.home_goals!;

    const awayGoals =
      match.away_goals!;

    if (
      homeGoals >
      awayGoals
    ) {
      addPoints(
        rows,
        match.home_id,
        field,
        rules.win
      );

      addPoints(
        rows,
        match.away_id,
        field,
        rules.loss
      );

      continue;
    }

    if (
      awayGoals >
      homeGoals
    ) {
      addPoints(
        rows,
        match.away_id,
        field,
        rules.win
      );

      addPoints(
        rows,
        match.home_id,
        field,
        rules.loss
      );

      continue;
    }

    addPoints(
      rows,
      match.home_id,
      field,
      rules.draw
    );

    addPoints(
      rows,
      match.away_id,
      field,
      rules.draw
    );
  }
}

/*
  ========================================
  5. ВИХІД ІЗ ГРУПИ
  ========================================
*/

function addEuropeanGroupBonuses({
  rows,
  matches,
  season,
  competition,
}: {
  rows: Map<
    string,
    CoefficientRow
  >;

  matches: CoefficientMatch[];

  season: SeasonNumber;

  competition:
    | "champions-league"
    | "europa-league";
}) {
  const groupNames =
    getCompetitionGroups({
      season,
      competition,
    });

  for (
    const groupName of
    groupNames
  ) {
    const participantIds =
      getCompetitionPlayers({
        season,
        competition,
        groupName,
      });

    if (
      participantIds.length <
      2
    ) {
      continue;
    }

    const groupMatches =
      matches.filter(
        (match) =>
          match.competition ===
            competition &&
          match.stage ===
            "group" &&
          match.group_name ===
            groupName
      );

    /*
      Двоколовий формат.

      4 гравці = 12 матчів.
    */

    const expectedMatches =
      participantIds.length *
      (
        participantIds.length -
        1
      );

    if (
      groupMatches.length <
      expectedMatches
    ) {
      continue;
    }

    const archiveSeason =
      season === 1 ||
      season === 2;

    /*
      В активному сезоні
      бонус за вихід із групи
      даємо лише після повного
      завершення групи.
    */

    if (
      !archiveSeason &&
      !groupMatches.every(
        isFinished
      )
    ) {
      continue;
    }

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

    if (
      competition ===
      "champions-league"
    ) {
      const first =
        standings[0]
          ?.playerId;

      const second =
        standings[1]
          ?.playerId;

      const third =
        standings[2]
          ?.playerId;

      if (first) {
        addPoints(
          rows,
          first,
          "championsLeagueGroup",
          CHAMPIONS_LEAGUE_POINTS
            .groupPlayoff
        );
      }

      if (second) {
        addPoints(
          rows,
          second,
          "championsLeagueGroup",
          CHAMPIONS_LEAGUE_POINTS
            .groupPlayoff
        );
      }

      /*
        3 місце ЛЧ переходить
        до Ліги Європи.

        За таблицею коефіцієнтів:
        4 бали.
      */

      if (third) {
        addPoints(
          rows,
          third,
          "championsLeagueGroup",
          CHAMPIONS_LEAGUE_POINTS
            .groupThird
        );
      }

      continue;
    }

    /*
      Ліга Європи:
      перші два місця.
    */

    const first =
      standings[0]
        ?.playerId;

    const second =
      standings[1]
        ?.playerId;

    if (first) {
      addPoints(
        rows,
        first,
        "europaLeagueGroup",
        EUROPA_LEAGUE_POINTS
          .groupPlayoff
      );
    }

    if (second) {
      addPoints(
        rows,
        second,
        "europaLeagueGroup",
        EUROPA_LEAGUE_POINTS
          .groupPlayoff
      );
    }
  }
}

/*
  ========================================
  ПЕРЕМОЖЕЦЬ ДВОМАТЧЕВОЇ СЕРІЇ
  ========================================
*/

function getSeriesWinner(
  seriesMatches:
    CoefficientMatch[]
) {
  if (
    seriesMatches.length === 0
  ) {
    return null;
  }

  /*
    Серія повинна бути
    повністю завершена.
  */

  if (
    !seriesMatches.every(
      isFinished
    )
  ) {
    return null;
  }

  const first =
    seriesMatches[0];

  const participantA =
    first.series_home_id ??
    first.home_id;

  const participantB =
    first.series_away_id ??
    first.away_id;

  let goalsA = 0;
  let goalsB = 0;

  for (
    const match of
    seriesMatches
  ) {
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

      continue;
    }

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
    }
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
  6. ПРОХОДЖЕННЯ РАУНДІВ ЄВРОКУБКІВ
  ========================================
*/

function addEuropeanRoundBonuses(
  rows: Map<
    string,
    CoefficientRow
  >,
  matches: CoefficientMatch[],
  competition:
    | "champions-league"
    | "europa-league"
) {
  const stages = [
    "round-of-16",
    "quarterfinal",
    "semifinal",
  ];

  const rules =
    competition ===
    "champions-league"
      ? CHAMPIONS_LEAGUE_POINTS
      : EUROPA_LEAGUE_POINTS;

  const field:
    keyof CoefficientBreakdown =
    competition ===
    "champions-league"
      ? "championsLeagueRounds"
      : "europaLeagueRounds";

  for (const stage of stages) {
    const stageMatches =
      matches.filter(
        (match) =>
          match.competition ===
            competition &&
          match.stage ===
            stage
      );

    const seriesMap =
      new Map<
        string,
        CoefficientMatch[]
      >();

    for (
      const match of
      stageMatches
    ) {
      const key =
        match.series_id ??
        [
          competition,
          stage,
          match.round ?? 0,
          match.series_home_id ??
            match.home_id,
          match.series_away_id ??
            match.away_id,
        ].join(":");

      const current =
        seriesMap.get(key);

      if (current) {
        current.push(match);
      } else {
        seriesMap.set(
          key,
          [match]
        );
      }
    }

    for (
      const seriesMatches of
      seriesMap.values()
    ) {
      const winner =
        getSeriesWinner(
          seriesMatches
        );

      if (!winner) {
        continue;
      }

      addPoints(
        rows,
        winner,
        field,
        rules.roundAdvance
      );
    }
  }
}

/*
  ========================================
  7. ФІНАЛИ ЛЧ / ЛЄ
  ========================================

  "Фіналіст" тут означає
  гравця, який програв фінал.

  Тобто:

  переможець ЛЧ = 30
  фіналіст ЛЧ = 15

  переможець ЛЄ = 20
  фіналіст ЛЄ = 10

  Ці бонуси НЕ складаються між собою.
*/

function addEuropeanFinalBonuses(
  rows: Map<
    string,
    CoefficientRow
  >,
  matches: CoefficientMatch[],
  competition:
    | "champions-league"
    | "europa-league"
) {
  const finalMatches =
    matches.filter(
      (match) =>
        match.competition ===
          competition &&
        match.stage ===
          "final" &&
        isFinished(match)
    );

  if (
    finalMatches.length === 0
  ) {
    return;
  }

  /*
    На даний момент фінали
    ЛЧ та ЛЄ — одноматчеві.
  */

  const finalMatch =
    finalMatches[0];

  const winner =
    getMatchWinner(
      finalMatch
    );

  if (!winner) {
    return;
  }

  const loser =
    winner ===
    finalMatch.home_id
      ? finalMatch.away_id
      : finalMatch.home_id;

  if (
    competition ===
    "champions-league"
  ) {
    addPoints(
      rows,
      winner,
      "championsLeagueFinal",
      CHAMPIONS_LEAGUE_POINTS
        .winner
    );

    addPoints(
      rows,
      loser,
      "championsLeagueFinal",
      CHAMPIONS_LEAGUE_POINTS
        .finalist
    );

    return;
  }

  addPoints(
    rows,
    winner,
    "europaLeagueFinal",
    EUROPA_LEAGUE_POINTS
      .winner
  );

  addPoints(
    rows,
    loser,
    "europaLeagueFinal",
    EUROPA_LEAGUE_POINTS
      .finalist
  );
}

/*
  ========================================
  8. СУПЕРКУБОК ЄВРОПИ
  ========================================
*/

function addSuperCupPoints(
  rows: Map<
    string,
    CoefficientRow
  >,
  matches: CoefficientMatch[]
) {
  const final =
    matches.find(
      (match) =>
        match.competition ===
          "european-super-cup" &&
        match.stage ===
          "final" &&
        isFinished(match)
    );

  if (!final) {
    return;
  }

  const winner =
    getMatchWinner(final);

  if (!winner) {
    return;
  }

  addPoints(
    rows,
    winner,
    "europeanSuperCup",
    EUROPEAN_SUPER_CUP_WINNER
  );
}

/*
  ========================================
  ОСНОВНА ФУНКЦІЯ
  ========================================
*/

export function calculateCoefficients({
  season,
  matches,
}: {
  season: SeasonNumber;

  matches: CoefficientMatch[];
}): CoefficientRow[] {
  /*
    Захист:

    беремо лише матчі
    обраного сезону.
  */

  const seasonMatches =
    matches.filter(
      (match) =>
        match.season === season
    );

  const rows =
    createRows(
      season,
      seasonMatches
    );

  /*
    ДИВІЗІОНИ
  */

  addDivisionMatchPoints(
    rows,
    seasonMatches
  );

  addDivisionPlacePoints({
    rows,
    matches:
      seasonMatches,
    season,
  });

  /*
    КУБКИ ДИВІЗІОНІВ
  */

  addDivisionCupPoints(
    rows,
    seasonMatches
  );

  /*
    ЛІГА ЧЕМПІОНІВ
  */

  addEuropeanMatchPoints(
    rows,
    seasonMatches,
    "champions-league"
  );

  addEuropeanGroupBonuses({
    rows,
    matches:
      seasonMatches,
    season,
    competition:
      "champions-league",
  });

  addEuropeanRoundBonuses(
    rows,
    seasonMatches,
    "champions-league"
  );

  addEuropeanFinalBonuses(
    rows,
    seasonMatches,
    "champions-league"
  );

  /*
    ЛІГА ЄВРОПИ
  */

  addEuropeanMatchPoints(
    rows,
    seasonMatches,
    "europa-league"
  );

  addEuropeanGroupBonuses({
    rows,
    matches:
      seasonMatches,
    season,
    competition:
      "europa-league",
  });

  addEuropeanRoundBonuses(
    rows,
    seasonMatches,
    "europa-league"
  );

  addEuropeanFinalBonuses(
    rows,
    seasonMatches,
    "europa-league"
  );

  /*
    СУПЕРКУБОК
  */

  addSuperCupPoints(
    rows,
    seasonMatches
  );

  /*
    ФІНАЛЬНИЙ TOTAL
  */

  const result =
    [...rows.values()].map(
      (row) => ({
        ...row,

        total:
          getTotal(
            row.breakdown
          ),
      })
    );

  /*
    Сортування:

    1. Коефіцієнт
    2. ID як стабільний
       додатковий критерій
  */

  result.sort(
    (a, b) =>
      b.total -
        a.total ||
      a.playerId.localeCompare(
        b.playerId
      )
  );

  return result;
}