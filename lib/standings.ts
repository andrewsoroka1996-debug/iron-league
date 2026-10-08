export type StandingsMatch = {
  home_id: string;
  away_id: string;

  home_goals: number | null;
  away_goals: number | null;

  status: string;
};

export type StandingsRow = {
  playerId: string;

  played: number;

  wins: number;
  draws: number;
  losses: number;

  goalsFor: number;
  goalsAgainst: number;

  goalDifference: number;

  points: number;
};

export type StandingsFormat =
  | "division-qualification"
  | "europe-group";

/*
  ========================================
  СТВОРЕННЯ ТАБЛИЦІ
  ========================================

  Перемога = 3
  Нічия = 1
  Поразка = 0
*/

export function calculateStandings({
  participantIds,
  matches,
}: {
  participantIds: readonly string[];

  matches: StandingsMatch[];
}): StandingsRow[] {
  const rows = new Map<
    string,
    StandingsRow
  >();

  /*
    ========================================
    ПОЧАТКОВІ РЯДКИ
    ========================================
  */

  for (
    const playerId of participantIds
  ) {
    rows.set(
      playerId,
      {
        playerId,

        played: 0,

        wins: 0,
        draws: 0,
        losses: 0,

        goalsFor: 0,
        goalsAgainst: 0,

        goalDifference: 0,

        points: 0,
      }
    );
  }

  /*
    ========================================
    МАТЧІ
    ========================================
  */

  for (const match of matches) {
    if (
      match.status !== "finished" ||
      match.home_goals === null ||
      match.away_goals === null
    ) {
      continue;
    }

    const home =
      rows.get(match.home_id);

    const away =
      rows.get(match.away_id);

    /*
      Матч не стосується
      цієї конкретної таблиці.
    */

    if (!home || !away) {
      continue;
    }

    const homeGoals =
      match.home_goals;

    const awayGoals =
      match.away_goals;

    /*
      ЗІГРАНО
    */

    home.played += 1;
    away.played += 1;

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
      ПЕРЕМОГА ГОСПОДАРЯ
    */

    if (
      homeGoals >
      awayGoals
    ) {
      home.wins += 1;
      home.points += 3;

      away.losses += 1;

      continue;
    }

    /*
      ПЕРЕМОГА ГОСТЯ
    */

    if (
      awayGoals >
      homeGoals
    ) {
      away.wins += 1;
      away.points += 3;

      home.losses += 1;

      continue;
    }

    /*
      НІЧИЯ
    */

    home.draws += 1;
    away.draws += 1;

    home.points += 1;
    away.points += 1;
  }

  /*
    ========================================
    РІЗНИЦЯ ГОЛІВ
    ========================================
  */

  const result =
    Array.from(
      rows.values()
    );

  for (const row of result) {
    row.goalDifference =
      row.goalsFor -
      row.goalsAgainst;
  }

  return result;
}

/*
  ========================================
  ОЧКИ В ОСОБИСТИХ ЗУСТРІЧАХ
  ========================================

  Використовується ТІЛЬКИ
  для двох гравців.

  Якщо вони грали декілька разів,
  враховуються всі завершені
  очні матчі між ними.
*/

function getHeadToHeadPoints({
  playerA,
  playerB,
  matches,
}: {
  playerA: string;
  playerB: string;

  matches: StandingsMatch[];
}) {
  let playerAPoints = 0;
  let playerBPoints = 0;

  for (const match of matches) {
    if (
      match.status !== "finished" ||
      match.home_goals === null ||
      match.away_goals === null
    ) {
      continue;
    }

    const isDirectMatch =
      (
        match.home_id === playerA &&
        match.away_id === playerB
      ) ||
      (
        match.home_id === playerB &&
        match.away_id === playerA
      );

    if (!isDirectMatch) {
      continue;
    }

    /*
      НІЧИЯ
    */

    if (
      match.home_goals ===
      match.away_goals
    ) {
      playerAPoints += 1;
      playerBPoints += 1;

      continue;
    }

    /*
      ПЕРЕМОЖЕЦЬ МАТЧУ
    */

    const winnerId =
      match.home_goals >
      match.away_goals
        ? match.home_id
        : match.away_id;

    if (
      winnerId === playerA
    ) {
      playerAPoints += 3;
    } else {
      playerBPoints += 3;
    }
  }

  return {
    playerAPoints,
    playerBPoints,
  };
}

/*
  ========================================
  ОСОБИСТА ЗУСТРІЧ ДВОХ ГРАВЦІВ
  ========================================

  < 0 → playerA вище
  > 0 → playerB вище
  0   → рівність
*/

function compareHeadToHead(
  playerA: StandingsRow,
  playerB: StandingsRow,
  matches: StandingsMatch[]
) {
  const {
    playerAPoints,
    playerBPoints,
  } = getHeadToHeadPoints({
    playerA:
      playerA.playerId,

    playerB:
      playerB.playerId,

    matches,
  });

  if (
    playerAPoints >
    playerBPoints
  ) {
    return -1;
  }

  if (
    playerBPoints >
    playerAPoints
  ) {
    return 1;
  }

  return 0;
}

/*
  ========================================
  ГРУПУВАННЯ ЗА ПОКАЗНИКОМ
  ========================================
*/

function groupByNumber(
  rows: StandingsRow[],
  getter: (
    row: StandingsRow
  ) => number
) {
  const groups =
    new Map<
      number,
      StandingsRow[]
    >();

  for (const row of rows) {
    const value =
      getter(row);

    const group =
      groups.get(value) ?? [];

    group.push(row);

    groups.set(
      value,
      group
    );
  }

  return Array.from(
    groups.entries()
  )
    .sort(
      ([valueA], [valueB]) =>
        valueB - valueA
    )
    .map(
      ([, group]) =>
        group
    );
}

/*
  ========================================
  ДИВІЗІОНИ / КВАЛІФІКАЦІЯ
  ========================================

  1. Очки
  2. Різниця голів
  3. Забиті голи
  4. Особисті зустрічі

  Особисті зустрічі —
  тільки якщо залишилось
  рівно 2 гравці.
*/

function sortDivisionStandings({
  rows,
  matches,
}: {
  rows: StandingsRow[];
  matches: StandingsMatch[];
}) {
  const result:
    StandingsRow[] = [];

  /*
    1. ОЧКИ
  */

  const pointsGroups =
    groupByNumber(
      rows,
      (row) =>
        row.points
    );

  for (
    const pointsGroup of pointsGroups
  ) {
    /*
      2. РІЗНИЦЯ ГОЛІВ
    */

    const differenceGroups =
      groupByNumber(
        pointsGroup,
        (row) =>
          row.goalDifference
      );

    for (
      const differenceGroup
      of differenceGroups
    ) {
      /*
        3. ЗАБИТІ ГОЛИ
      */

      const goalsGroups =
        groupByNumber(
          differenceGroup,
          (row) =>
            row.goalsFor
        );

      for (
        const goalsGroup
        of goalsGroups
      ) {
        /*
          4. ОСОБИСТІ ЗУСТРІЧІ

          Тільки 2 гравці.
        */

        if (
          goalsGroup.length === 2
        ) {
          const sorted =
            [...goalsGroup].sort(
              (
                playerA,
                playerB
              ) =>
                compareHeadToHead(
                  playerA,
                  playerB,
                  matches
                )
            );

          result.push(
            ...sorted
          );
        } else {
          /*
            Якщо однакові всі
            показники мають
            3+ гравців —
            особисті зустрічі
            не застосовуємо.
          */

          result.push(
            ...goalsGroup
          );
        }
      }
    }
  }

  return result;
}

/*
  ========================================
  ГРУПИ ЛЧ / ЛЄ / ЛК
  ========================================

  1. Очки
  2. Різниця голів
  3. Особисті зустрічі
  4. Забиті голи

  Особисті зустрічі —
  тільки якщо після перших
  двох критеріїв залишилось
  рівно 2 гравці.
*/

function sortEuropeanGroupStandings({
  rows,
  matches,
}: {
  rows: StandingsRow[];
  matches: StandingsMatch[];
}) {
  const result:
    StandingsRow[] = [];

  /*
    1. ОЧКИ
  */

  const pointsGroups =
    groupByNumber(
      rows,
      (row) =>
        row.points
    );

  for (
    const pointsGroup of pointsGroups
  ) {
    /*
      2. РІЗНИЦЯ ГОЛІВ
    */

    const differenceGroups =
      groupByNumber(
        pointsGroup,
        (row) =>
          row.goalDifference
      );

    for (
      const differenceGroup
      of differenceGroups
    ) {
      /*
        Якщо залишилося рівно
        два гравці —
        застосовуємо
        особисті зустрічі.
      */

      if (
        differenceGroup.length === 2
      ) {
        const [
          playerA,
          playerB,
        ] =
          differenceGroup;

        const headToHeadResult =
          compareHeadToHead(
            playerA,
            playerB,
            matches
          );

        /*
          Особисті зустрічі
          визначили порядок.
        */

        if (
          headToHeadResult !== 0
        ) {
          result.push(
            ...[
              ...differenceGroup,
            ].sort(
              () =>
                headToHeadResult
            )
          );

          continue;
        }

        /*
          Особисті зустрічі
          теж рівні.

          4. ЗАБИТІ ГОЛИ
        */

        result.push(
          ...[
            ...differenceGroup,
          ].sort(
            (
              rowA,
              rowB
            ) =>
              rowB.goalsFor -
              rowA.goalsFor
          )
        );

        continue;
      }

      /*
        Якщо тут 3+ гравців —
        особисті зустрічі
        пропускаємо.

        Переходимо до
        забитих голів.
      */

      result.push(
        ...[
          ...differenceGroup,
        ].sort(
          (
            rowA,
            rowB
          ) =>
            rowB.goalsFor -
            rowA.goalsFor
        )
      );
    }
  }

  return result;
}

/*
  ========================================
  ФІНАЛЬНЕ СОРТУВАННЯ
  ========================================
*/

export function sortStandings({
  rows,
  matches,
  format,
}: {
  rows: StandingsRow[];

  matches: StandingsMatch[];

  format: StandingsFormat;
}): StandingsRow[] {
  if (
    format ===
    "division-qualification"
  ) {
    return sortDivisionStandings({
      rows,
      matches,
    });
  }

  return sortEuropeanGroupStandings({
    rows,
    matches,
  });
}

/*
  ========================================
  ПІДРАХУНОК + СОРТУВАННЯ
  ========================================

  Зручна функція для сторінок.
*/

export function buildStandings({
  participantIds,
  matches,
  format,
}: {
  participantIds:
    readonly string[];

  matches: StandingsMatch[];

  format: StandingsFormat;
}) {
  const rows =
    calculateStandings({
      participantIds,
      matches,
    });

  return sortStandings({
    rows,
    matches,
    format,
  });
}