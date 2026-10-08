export type TwoLegMatch = {
  id: string;

  home_id: string;
  away_id: string;

  home_goals: number | null;
  away_goals: number | null;

  status: string;

  leg: number | null;
};

export type TwoLegSide = {
  id: string;

  goals: number;

  leg1Goals: number | null;
  leg2Goals: number | null;
};

export type TwoLegSeriesResult = {
  matchesPlayed: number;

  complete: boolean;

  home: TwoLegSide;
  away: TwoLegSide;

  aggregateHomeGoals: number;
  aggregateAwayGoals: number;

  winner:
    | "home"
    | "away"
    | null;

  needsDecider: boolean;

  status:
    | "not-started"
    | "in-progress"
    | "home-winner"
    | "away-winner"
    | "aggregate-draw";
};

export function calculateTwoLegSeries({
  seriesHomeId,
  seriesAwayId,
  matches,
}: {
  seriesHomeId: string;
  seriesAwayId: string;
  matches: TwoLegMatch[];
}): TwoLegSeriesResult {
  /*
    ========================================
    ПОЧАТКОВІ ДАНІ
    ========================================
  */

  const home: TwoLegSide = {
    id: seriesHomeId,

    goals: 0,

    leg1Goals: null,
    leg2Goals: null,
  };

  const away: TwoLegSide = {
    id: seriesAwayId,

    goals: 0,

    leg1Goals: null,
    leg2Goals: null,
  };

  /*
    ========================================
    ЗНАХОДИМО 1-Й І 2-Й МАТЧ
    ========================================
  */

  const leg1 =
    matches.find(
      (match) =>
        match.leg === 1
    ) ?? null;

  const leg2 =
    matches.find(
      (match) =>
        match.leg === 2
    ) ?? null;

  let matchesPlayed = 0;

  /*
    ========================================
    ПЕРШИЙ МАТЧ
    ========================================

    Очікувана структура:

    A — B
  */

  if (
    leg1 &&
    leg1.status === "finished" &&
    leg1.home_goals !== null &&
    leg1.away_goals !== null
  ) {
    matchesPlayed += 1;

    /*
      Визначаємо голи не просто
      за home/away матчу, а за
      учасниками всієї серії.
    */

    if (
      leg1.home_id ===
        seriesHomeId &&
      leg1.away_id ===
        seriesAwayId
    ) {
      home.leg1Goals =
        leg1.home_goals;

      away.leg1Goals =
        leg1.away_goals;
    } else if (
      leg1.home_id ===
        seriesAwayId &&
      leg1.away_id ===
        seriesHomeId
    ) {
      home.leg1Goals =
        leg1.away_goals;

      away.leg1Goals =
        leg1.home_goals;
    }
  }

  /*
    ========================================
    ДРУГИЙ МАТЧ
    ========================================

    Зазвичай:

    B — A

    Але функція працюватиме
    навіть якщо порядок інший.
  */

  if (
    leg2 &&
    leg2.status === "finished" &&
    leg2.home_goals !== null &&
    leg2.away_goals !== null
  ) {
    matchesPlayed += 1;

    if (
      leg2.home_id ===
        seriesHomeId &&
      leg2.away_id ===
        seriesAwayId
    ) {
      home.leg2Goals =
        leg2.home_goals;

      away.leg2Goals =
        leg2.away_goals;
    } else if (
      leg2.home_id ===
        seriesAwayId &&
      leg2.away_id ===
        seriesHomeId
    ) {
      home.leg2Goals =
        leg2.away_goals;

      away.leg2Goals =
        leg2.home_goals;
    }
  }

  /*
    ========================================
    ЗАГАЛЬНИЙ РАХУНОК
    ========================================
  */

  home.goals =
    (home.leg1Goals ?? 0) +
    (home.leg2Goals ?? 0);

  away.goals =
    (away.leg1Goals ?? 0) +
    (away.leg2Goals ?? 0);

  const complete =
    matchesPlayed === 2;

  /*
    ========================================
    ЖОДНОГО МАТЧУ
    ========================================
  */

  if (matchesPlayed === 0) {
    return {
      matchesPlayed,

      complete: false,

      home,
      away,

      aggregateHomeGoals:
        home.goals,

      aggregateAwayGoals:
        away.goals,

      winner: null,

      needsDecider: false,

      status:
        "not-started",
    };
  }

  /*
    ========================================
    ЗІГРАНО ТІЛЬКИ ОДИН МАТЧ
    ========================================
  */

  if (!complete) {
    return {
      matchesPlayed,

      complete: false,

      home,
      away,

      aggregateHomeGoals:
        home.goals,

      aggregateAwayGoals:
        away.goals,

      winner: null,

      needsDecider: false,

      status:
        "in-progress",
    };
  }

  /*
    ========================================
    ПЕРЕМОЖЕЦЬ ЗА СУМОЮ
    ========================================
  */

  if (
    home.goals >
    away.goals
  ) {
    return {
      matchesPlayed,

      complete: true,

      home,
      away,

      aggregateHomeGoals:
        home.goals,

      aggregateAwayGoals:
        away.goals,

      winner:
        "home",

      needsDecider: false,

      status:
        "home-winner",
    };
  }

  if (
    away.goals >
    home.goals
  ) {
    return {
      matchesPlayed,

      complete: true,

      home,
      away,

      aggregateHomeGoals:
        home.goals,

      aggregateAwayGoals:
        away.goals,

      winner:
        "away",

      needsDecider: false,

      status:
        "away-winner",
    };
  }

  /*
    ========================================
    РІВНІСТЬ ЗА СУМОЮ
    ========================================

    Тут ми НЕ вигадуємо правило.

    Далі окремо визначимо,
    як саме Iron League
    вирішує рівність:

    - додатковий час
    - пенальті
    - окремий матч
    - інше правило
  */

  return {
    matchesPlayed,

    complete: true,

    home,
    away,

    aggregateHomeGoals:
      home.goals,

    aggregateAwayGoals:
      away.goals,

    winner: null,

    needsDecider: true,

    status:
      "aggregate-draw",
  };
}