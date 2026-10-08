export type AssociationSeriesMatch = {
  id: string;

  home_id: string;
  away_id: string;

  home_goals: number | null;
  away_goals: number | null;

  status: string;

  is_tiebreak: boolean;
};

export type AssociationSeriesSide = {
  points: number;

  goalsFor: number;
  goalsAgainst: number;

  goalDifference: number;

  wins: number;
  draws: number;
  losses: number;
};

export type AssociationSeriesResult = {
  regularMatchesPlayed: number;

  home: AssociationSeriesSide;
  away: AssociationSeriesSide;

  regularComplete: boolean;

  winner:
    | "home"
    | "away"
    | null;

  needsTiebreak: boolean;

  tiebreakMatch:
    | AssociationSeriesMatch
    | null;

  status:
    | "in-progress"
    | "home-winner"
    | "away-winner"
    | "needs-tiebreak"
    | "tiebreak-pending"
    | "tiebreak-draw";
};

function emptySide(): AssociationSeriesSide {
  return {
    points: 0,

    goalsFor: 0,
    goalsAgainst: 0,

    goalDifference: 0,

    wins: 0,
    draws: 0,
    losses: 0,
  };
}

export function calculateAssociationSeries(
  matches: AssociationSeriesMatch[]
): AssociationSeriesResult {
  /*
    ========================================
    ОСНОВНІ 6 МАТЧІВ
    ========================================
  */

  const regularMatches =
    matches.filter(
      (match) =>
        !match.is_tiebreak
    );

  /*
    ========================================
    7-Й МАТЧ
    ========================================
  */

  const tiebreakMatch =
    matches.find(
      (match) =>
        match.is_tiebreak
    ) ?? null;

  const home =
    emptySide();

  const away =
    emptySide();

  let regularMatchesPlayed = 0;

  /*
    ========================================
    РАХУЄМО 6 ОСНОВНИХ МАТЧІВ
    ========================================
  */

  for (
    const match of regularMatches
  ) {
    const finished =
      match.status ===
        "finished" &&
      match.home_goals !== null &&
      match.away_goals !== null;

    if (!finished) {
      continue;
    }

    const homeGoals =
      match.home_goals as number;

    const awayGoals =
      match.away_goals as number;

    regularMatchesPlayed += 1;

    /*
      ГОЛИ
    */

    home.goalsFor +=
      homeGoals;

    home.goalsAgainst +=
      awayGoals;

    away.goalsFor +=
      awayGoals;

    away.goalsAgainst +=
      homeGoals;

    /*
      3–1–0
    */

    if (
      homeGoals >
      awayGoals
    ) {
      home.points += 3;

      home.wins += 1;
      away.losses += 1;
    } else if (
      homeGoals <
      awayGoals
    ) {
      away.points += 3;

      away.wins += 1;
      home.losses += 1;
    } else {
      home.points += 1;
      away.points += 1;

      home.draws += 1;
      away.draws += 1;
    }
  }

  /*
    ========================================
    РІЗНИЦЯ ГОЛІВ
    ========================================
  */

  home.goalDifference =
    home.goalsFor -
    home.goalsAgainst;

  away.goalDifference =
    away.goalsFor -
    away.goalsAgainst;

  /*
    Основна серія завершена
    тільки після 6 матчів.
  */

  const regularComplete =
    regularMatchesPlayed === 6;

  /*
    Якщо ще не всі 6 матчів
    зіграні — переможця немає.
  */

  if (!regularComplete) {
    return {
      regularMatchesPlayed,

      home,
      away,

      regularComplete:
        false,

      winner: null,

      needsTiebreak:
        false,

      tiebreakMatch,

      status:
        "in-progress",
    };
  }

  /*
    ========================================
    ПРАВИЛО №1 — ОЧКИ
    ========================================
  */

  if (
    home.points >
    away.points
  ) {
    return {
      regularMatchesPlayed,

      home,
      away,

      regularComplete:
        true,

      winner:
        "home",

      needsTiebreak:
        false,

      tiebreakMatch,

      status:
        "home-winner",
    };
  }

  if (
    away.points >
    home.points
  ) {
    return {
      regularMatchesPlayed,

      home,
      away,

      regularComplete:
        true,

      winner:
        "away",

      needsTiebreak:
        false,

      tiebreakMatch,

      status:
        "away-winner",
    };
  }

  /*
    ========================================
    ПРАВИЛО №2 — РІЗНИЦЯ ГОЛІВ
    ========================================
  */

  if (
    home.goalDifference >
    away.goalDifference
  ) {
    return {
      regularMatchesPlayed,

      home,
      away,

      regularComplete:
        true,

      winner:
        "home",

      needsTiebreak:
        false,

      tiebreakMatch,

      status:
        "home-winner",
    };
  }

  if (
    away.goalDifference >
    home.goalDifference
  ) {
    return {
      regularMatchesPlayed,

      home,
      away,

      regularComplete:
        true,

      winner:
        "away",

      needsTiebreak:
        false,

      tiebreakMatch,

      status:
        "away-winner",
    };
  }

  /*
    ========================================
    ПРАВИЛО №3 — 7-Й МАТЧ
    ========================================

    Очки рівні.
    Різниця голів рівна.
  */

  if (!tiebreakMatch) {
    return {
      regularMatchesPlayed,

      home,
      away,

      regularComplete:
        true,

      winner: null,

      needsTiebreak:
        true,

      tiebreakMatch:
        null,

      status:
        "needs-tiebreak",
    };
  }

  /*
    7-й матч уже створений,
    але ще не завершений.
  */

  if (
    tiebreakMatch.status !==
      "finished" ||
    tiebreakMatch.home_goals ===
      null ||
    tiebreakMatch.away_goals ===
      null
  ) {
    return {
      regularMatchesPlayed,

      home,
      away,

      regularComplete:
        true,

      winner: null,

      needsTiebreak:
        true,

      tiebreakMatch,

      status:
        "tiebreak-pending",
    };
  }

  /*
    ========================================
    РЕЗУЛЬТАТ 7-ГО МАТЧУ
    ========================================
  */

  if (
    tiebreakMatch.home_goals >
    tiebreakMatch.away_goals
  ) {
    return {
      regularMatchesPlayed,

      home,
      away,

      regularComplete:
        true,

      winner:
        "home",

      needsTiebreak:
        false,

      tiebreakMatch,

      status:
        "home-winner",
    };
  }

  if (
    tiebreakMatch.away_goals >
    tiebreakMatch.home_goals
  ) {
    return {
      regularMatchesPlayed,

      home,
      away,

      regularComplete:
        true,

      winner:
        "away",

      needsTiebreak:
        false,

      tiebreakMatch,

      status:
        "away-winner",
    };
  }

  /*
    Якщо 7-й матч чомусь
    завершився нічиєю,
    автоматично переможця
    не вигадуємо.
  */

  return {
    regularMatchesPlayed,

    home,
    away,

    regularComplete:
      true,

    winner: null,

    needsTiebreak:
      true,

    tiebreakMatch,

    status:
      "tiebreak-draw",
  };
}