import "server-only";

import { players } from "../data/players";
import { season2Coefficients } from "../data/coefficients/season-2";

import {
  getSeasonAssociationSquads,
} from "./association-squads";

import {
  calculateCoefficients,
  type CoefficientMatch,
} from "./calculate-coefficients";

import {
  calculateAssociationSeries,
} from "./association-series";

import {
  getSeasonAssociationRankMap,
  getAssociationRankLabel,
  type AssociationRankLabel,
} from "./association-ranks";

import {
  supabaseAdmin,
} from "./supabase-admin";
import {
  getSeasonPlayerReplacements,
  applyPlayerReplacements,
} from "./player-replacements";

/*
  ========================================
  TYPES
  ========================================
*/

export type AssociationLeagueSeason =
  | 2
  | 3
  | 4;

export type AssociationCupPlacement =
  | "winner"
  | "finalist"
  | "third"
  | "fourth"
  | "quarterfinalist"
  | null;

export type AssociationLeagueMember = {
  playerId: string;

  playerName: string;

  /*
    Реальний особистий
    коефіцієнт гравця.
  */

  coefficient: number;

  /*
    Скільки реально входить
    у рейтинг Асоціації.

    Сезон 3+:

    R1 = 0.
  */

  associationCoefficient: number;

  /*
    Зафіксований ранг
    на початок сезону.
  */

  rank:
    | AssociationRankLabel
    | null;
};

export type AssociationLeagueRow = {
  associationId: string;

  associationName: string;

  members:
    AssociationLeagueMember[];

  /*
    Сума внесків членів
    Асоціації.

    Сезон 3+:

    R2 + R3 + R4 + R5 + R6.
  */

  baseCoefficient: number;

  baseRank: number;

  cupPlacement:
    AssociationCupPlacement;

  cupPlacementLabel: string;

  multiplier:
    number | null;

  leaguePoints:
    number | null;

  leaguePlace:
    number | null;
};

export type AssociationLeagueResult = {
  season:
    AssociationLeagueSeason;

  cupComplete: boolean;

  rows:
    AssociationLeagueRow[];
};

type AssociationCupMatch = {
  id: string;

  stage:
    string | null;

  home_id: string;

  away_id: string;

  home_goals:
    number | null;

  away_goals:
    number | null;

  status: string;

  series_id:
    string | null;

  series_home_id:
    string | null;

  series_away_id:
    string | null;

  is_tiebreak: boolean;
};

/*
  ========================================
  ТУРНІРИ КОЕФІЦІЄНТА
  ========================================

  НЕ враховуються:

  - 4 Дивізіон
  - Кубок 4 Дивізіону
  - Ліга конференцій
  - Кубок асоціацій
  - Iron Co-op Cup
  - Кваліфікація
*/

const COEFFICIENT_COMPETITIONS = [
  "division",

  "division-1-cup",
  "division-2-cup",
  "division-3-cup",

  "champions-league",
  "europa-league",

  "european-super-cup",
];

/*
  ========================================
  МНОЖНИКИ КУБКА АСОЦІАЦІЙ
  ========================================
*/

const CUP_MULTIPLIERS = {
  winner: 2,

  finalist: 1.8,

  third: 1.7,

  fourth: 1.6,

  quarterfinalist: 1.5,
} as const;

/*
  ========================================
  ПРІОРИТЕТ КУБКА

  При однакових
  фінальних очках.
  ========================================
*/

const CUP_PRIORITY = {
  winner: 5,

  finalist: 4,

  third: 3,

  fourth: 2,

  quarterfinalist: 1,
} as const;

/*
  ========================================
  НАЗВА ГРАВЦЯ
  ========================================
*/

function getPlayerName(
  playerId: string
) {
  return (
    players.find(
      (player) =>
        player.id ===
        playerId
    )?.nickname ??
    playerId
  );
}

/*
  ========================================
  НОРМАЛІЗАЦІЯ НІКНЕЙМІВ

  Для архівного Сезону 2.
  ========================================
*/

function normalizePlayerName(
  value: string
) {
  return value
    .toLowerCase()
    .replace(
      /[^a-zа-яіїєґ0-9]/g,
      ""
    );
}

/*
  ========================================
  СТАРІ ВАРІАНТИ НІКНЕЙМІВ
  ========================================
*/

const ARCHIVE_PLAYER_ALIASES:
  Record<
    string,
    string
  > = {
  taraasykunl:
    "taraaasyk-unl",

  holyholy28:
    "holy",

  deyl:
    "deyl",

  vdodessaua:
    "d-odessaua",

  cahb14:
    "canb14",

  "6abobha":
    "6abovha",

  voidex:
    "v0id-ex",

  nostress23:
    "no-stress23",

  awpfun:
    "awp-fun",
};

/*
  ========================================
  ПОШУК ID ГРАВЦЯ
  В АРХІВНІЙ ТАБЛИЦІ
  ========================================
*/

function findArchivePlayerId(
  playerName: string
) {
  const normalized =
    normalizePlayerName(
      playerName
    );

  const direct =
    players.find(
      (player) =>
        normalizePlayerName(
          player.nickname
        ) === normalized ||
        normalizePlayerName(
          player.id
        ) === normalized
    );

  if (direct) {
    return direct.id;
  }

  return (
    ARCHIVE_PLAYER_ALIASES[
      normalized
    ] ?? null
  );
}

/*
  ========================================
  СЕЗОН 2

  АРХІВНІ КОЕФІЦІЄНТИ
  ========================================
*/

function getSeason2CoefficientMap() {
  const map =
    new Map<
      string,
      number
    >();

  for (
    const row of
    season2Coefficients
  ) {
    const playerId =
      findArchivePlayerId(
        row.playerName
      );

    if (!playerId) {
      continue;
    }

    map.set(
      playerId,
      row.total
    );
  }

  return map;
}

/*
  ========================================
  LIVE-СЕЗОНИ

  Сезон 3 та наступні
  ========================================
*/

type LiveAssociationLeagueSeason =
  Exclude<
    AssociationLeagueSeason,
    2
  >;

/*
  ========================================
  LIVE-МАТЧІ ДЛЯ
  КОЕФІЦІЄНТІВ
  ========================================
*/

async function loadLiveCoefficientMatches(
  season:
    LiveAssociationLeagueSeason
) {
  const PAGE_SIZE =
    1000;

  const matches:
    CoefficientMatch[] =
    [];

  let from = 0;

  while (true) {
    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from("matches")
        .select(`
          id,
          season,
          competition,
          division,
          stage,
          group_name,
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
        `)
        .eq(
          "season",
          season
        )
        .in(
          "competition",
          COEFFICIENT_COMPETITIONS
        )
        .order(
          "id",
          {
            ascending:
              true,
          }
        )
        .range(
          from,
          from +
            PAGE_SIZE -
            1
        );

    if (error) {
      throw new Error(
        error.message
      );
    }

    const batch =
      (data ??
        []) as CoefficientMatch[];

    matches.push(
      ...batch
    );

    if (
      batch.length <
      PAGE_SIZE
    ) {
      break;
    }

    from +=
      PAGE_SIZE;
  }

  return matches;
}

/*
  ========================================
  LIVE-КОЕФІЦІЄНТИ

  СЕЗОН 3+
  ========================================
*/

async function getLiveCoefficientMap(
  season: LiveAssociationLeagueSeason,
  resolvePlayerId: (playerId: string) => string
) {
  const matches =
    await loadLiveCoefficientMatches(
      season
    );

  /*
    calculateCoefficients
    вже є єдиним калькулятором
    особистих коефіцієнтів.

    Тут ми передаємо
    реальний номер сезону.

    Type cast потрібен лише
    для сумісності з поточним
    TypeScript-типом функції.
  */

  const rows =
  calculateCoefficients(
    ({
      season,
      matches,
      resolvePlayerId,
    } as unknown) as Parameters<
      typeof calculateCoefficients
    >[0]
  );

  const map =
    new Map<
      string,
      number
    >();

  for (
    const row of rows
  ) {
    map.set(
      row.playerId,
      row.total
    );
  }

  return map;
}

/*
  ========================================
  МАТЧІ КУБКА АСОЦІАЦІЙ
  ========================================
*/

async function loadAssociationCupMatches(
  season:
    AssociationLeagueSeason
) {
  const PAGE_SIZE =
    1000;

  const matches:
    AssociationCupMatch[] =
    [];

  let from = 0;

  while (true) {
    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from("matches")
        .select(`
          id,
          stage,
          home_id,
          away_id,
          home_goals,
          away_goals,
          status,
          series_id,
          series_home_id,
          series_away_id,
          is_tiebreak
        `)
        .eq(
          "season",
          season
        )
        .eq(
          "competition",
          "associations-cup"
        )
        .order(
          "id",
          {
            ascending:
              true,
          }
        )
        .range(
          from,
          from +
            PAGE_SIZE -
            1
        );

    if (error) {
      throw new Error(
        error.message
      );
    }

    const batch =
      (data ??
        []) as AssociationCupMatch[];

    matches.push(
      ...batch
    );

    if (
      batch.length <
      PAGE_SIZE
    ) {
      break;
    }

    from +=
      PAGE_SIZE;
  }

  return matches;
}

/*
  ========================================
  РЕЗУЛЬТАТ СЕРІЇ
  ========================================
*/

type AssociationSeriesResult = {
  homeAssociationId:
    string;

  awayAssociationId:
    string;

  winnerId:
    string;

  loserId:
    string;
};

function getStageSeriesResults(
  matches:
    AssociationCupMatch[],

  stage: string
):
  AssociationSeriesResult[] {
  const stageMatches =
    matches.filter(
      (match) =>
        match.stage ===
          stage &&
        match.series_id
    );

  const seriesMap =
    new Map<
      string,
      AssociationCupMatch[]
    >();

  for (
    const match of
    stageMatches
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

  const results:
    AssociationSeriesResult[] =
    [];

  for (
    const seriesMatches of
    seriesMap.values()
  ) {
    const first =
      seriesMatches[0];

    const homeAssociationId =
      first?.series_home_id;

    const awayAssociationId =
      first?.series_away_id;

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

    let winnerId:
      string | null =
      null;

    let loserId:
      string | null =
      null;

    if (
      summary.winner ===
      "home"
    ) {
      winnerId =
        homeAssociationId;

      loserId =
        awayAssociationId;
    }

    if (
      summary.winner ===
      "away"
    ) {
      winnerId =
        awayAssociationId;

      loserId =
        homeAssociationId;
    }

    if (
      !winnerId ||
      !loserId
    ) {
      continue;
    }

    results.push({
      homeAssociationId,

      awayAssociationId,

      winnerId,

      loserId,
    });
  }

  return results;
}

/*
  ========================================
  РЕЗУЛЬТАТИ КУБКА
  ========================================
*/

function getCupPlacements(
  matches:
    AssociationCupMatch[]
) {
  const placements =
    new Map<
      string,
      AssociationCupPlacement
    >();

  /*
    Виліт у 1/4
  */

  const quarterfinals =
    getStageSeriesResults(
      matches,
      "quarterfinal"
    );

  for (
    const series of
    quarterfinals
  ) {
    placements.set(
      series.loserId,
      "quarterfinalist"
    );
  }

  /*
    3–4 місце
  */

  const thirdPlace =
    getStageSeriesResults(
      matches,
      "third-place"
    );

  for (
    const series of
    thirdPlace
  ) {
    placements.set(
      series.winnerId,
      "third"
    );

    placements.set(
      series.loserId,
      "fourth"
    );
  }

  /*
    Фінал
  */

  const final =
    getStageSeriesResults(
      matches,
      "final"
    );

  for (
    const series of
    final
  ) {
    placements.set(
      series.winnerId,
      "winner"
    );

    placements.set(
      series.loserId,
      "finalist"
    );
  }

  return placements;
}

/*
  ========================================
  НАЗВА РЕЗУЛЬТАТУ КУБКА
  ========================================
*/

function getCupPlacementLabel(
  placement:
    AssociationCupPlacement
) {
  if (
    placement ===
    "winner"
  ) {
    return "Переможець Кубка";
  }

  if (
    placement ===
    "finalist"
  ) {
    return "Фіналіст";
  }

  if (
    placement ===
    "third"
  ) {
    return "3 місце";
  }

  if (
    placement ===
    "fourth"
  ) {
    return "4 місце";
  }

  if (
    placement ===
    "quarterfinalist"
  ) {
    return "Виліт у 1/4";
  }

  return "Місце ще не визначено";
}

/*
  ========================================
  МНОЖНИК
  ========================================
*/

function getMultiplier(
  placement:
    AssociationCupPlacement
) {
  if (!placement) {
    return null;
  }

  return (
    CUP_MULTIPLIERS[
      placement
    ]
  );
}

/*
  ========================================
  ПРІОРИТЕТ
  ========================================
*/

function getCupPriority(
  placement:
    AssociationCupPlacement
) {
  if (!placement) {
    return 0;
  }

  return (
    CUP_PRIORITY[
      placement
    ]
  );
}

/*
  ========================================
  БАЗОВІ МІСЦЯ
  ========================================
*/

function assignBaseRanks(
  rows:
    AssociationLeagueRow[]
) {
  const sorted =
    [...rows].sort(
      (a, b) =>
        b.baseCoefficient -
        a.baseCoefficient
    );

  let previous:
    AssociationLeagueRow
    | null =
    null;

  let previousRank =
    0;

  return sorted.map(
    (
      row,
      index
    ) => {
      let rank =
        index + 1;

      if (
        previous &&
        row.baseCoefficient ===
          previous.baseCoefficient
      ) {
        rank =
          previousRank;
      }

      const result = {
        ...row,

        baseRank:
          rank,
      };

      previous =
        result;

      previousRank =
        rank;

      return result;
    }
  );
}

/*
  ========================================
  ФІНАЛЬНІ МІСЦЯ
  ========================================
*/

function assignLeagueRanks(
  rows:
    AssociationLeagueRow[]
) {
  const sorted =
    [...rows].sort(
      (a, b) => {
        const pointsA =
          a.leaguePoints ??
          0;

        const pointsB =
          b.leaguePoints ??
          0;

        if (
          pointsB !==
          pointsA
        ) {
          return (
            pointsB -
            pointsA
          );
        }

        return (
          getCupPriority(
            b.cupPlacement
          ) -
          getCupPriority(
            a.cupPlacement
          )
        );
      }
    );

  let previous:
    AssociationLeagueRow
    | null =
    null;

  let previousRank =
    0;

  return sorted.map(
    (
      row,
      index
    ) => {
      let rank =
        index + 1;

      if (
        previous &&
        row.leaguePoints ===
          previous.leaguePoints &&
        getCupPriority(
          row.cupPlacement
        ) ===
          getCupPriority(
            previous.cupPlacement
          )
      ) {
        rank =
          previousRank;
      }

      const result = {
        ...row,

        leaguePlace:
          rank,
      };

      previous =
        result;

      previousRank =
        rank;

      return result;
    }
  );
}

/*
  ========================================
  ОСНОВНА ФУНКЦІЯ
  ========================================
*/

export async function getAssociationLeague(
  season:
    AssociationLeagueSeason
):
  Promise<AssociationLeagueResult> {
  /*
    ========================================
    СКЛАДИ АСОЦІАЦІЙ
    ========================================
  */

  const associations =
    await getSeasonAssociationSquads(
      season
    );

  /*
    ========================================
    КОЕФІЦІЄНТИ
    ========================================

    Сезон 2:
    архівна таблиця.

    Сезон 3+:
    live-коефіцієнти.
  */

  const replacements =
  season >= 3
    ? await getSeasonPlayerReplacements(season)
    : [];

const resolvePlayerId = (
  playerId: string
): string =>
  applyPlayerReplacements(
    [playerId],
    replacements
  )[0] ?? playerId;

const coefficientMap =
  season === 2
    ? getSeason2CoefficientMap()
    : await getLiveCoefficientMap(
        season,
        resolvePlayerId
      );

  /*
    ========================================
    РАНГИ
    ========================================

    Сезон 2:
    рангів немає.

    Сезон 3+:
    snapshot із
    association_seed_ranks.
  */

  const rankMap =
    season >= 3
      ? await getSeasonAssociationRankMap(
          season
        )
      : new Map();

      /*
  ========================================
  УСПАДКУВАННЯ РАНГУ ТА ОЧОК
  ПІСЛЯ ГЛОБАЛЬНОЇ ЗАМІНИ
  ========================================
*/

const effectiveCoefficientMap =
  new Map<string, number>();

for (const [playerId, points] of coefficientMap) {
  const currentPlayerId =
    applyPlayerReplacements(
      [playerId],
      replacements
    )[0] ?? playerId;

  effectiveCoefficientMap.set(
    currentPlayerId,
    (effectiveCoefficientMap.get(currentPlayerId) ?? 0) +
      points
  );
}

const effectiveRankMap = new Map(rankMap);

for (const [playerId, rankInfo] of rankMap) {
  const currentPlayerId =
    applyPlayerReplacements(
      [playerId],
      replacements
    )[0] ?? playerId;

  if (!effectiveRankMap.has(currentPlayerId)) {
    effectiveRankMap.set(
      currentPlayerId,
      rankInfo
    );
  }
}

  /*
    ========================================
    КУБОК
    ========================================
  */

  const cupMatches =
    await loadAssociationCupMatches(
      season
    );

  const placements =
    getCupPlacements(
      cupMatches
    );

  /*
    ========================================
    ТАБЛИЦЯ АСОЦІАЦІЙ
    ========================================
  */

  let rows:
    AssociationLeagueRow[] =
    associations.map(
      (association) => {
        const members:
          AssociationLeagueMember[] =
          association.players.map(
            (playerId) => {
              const coefficient =
  effectiveCoefficientMap.get(
    playerId
  ) ?? 0;

              /*
                Сезон 3+:

                беремо
                зафіксований
                ранг R1–R6.
              */

              const seed =
  season >= 3
    ? effectiveRankMap.get(
        playerId
      )
    : null;

              const rank =
                seed
                  ? getAssociationRankLabel(
                      seed.rank
                    )
                  : null;

              /*
                Головне правило:

                Сезон 3+
                R1 має вагу 0
                у рейтингу Асоціації.

                Сам особистий
                коефіцієнт R1
                при цьому
                не змінюється.
              */

              const associationCoefficient =
                season >= 3 &&
                seed?.rank ===
                  1
                  ? 0
                  : coefficient;

              return {
                playerId,

                playerName:
                  getPlayerName(
                    playerId
                  ),

                coefficient,

                associationCoefficient,

                rank,
              };
            }
          );

        /*
          ==================================
          БАЗОВИЙ РЕЙТИНГ
          ==================================
        */

        const baseCoefficient =
          members.reduce(
            (
              sum,
              member
            ) =>
              sum +
              member
                .associationCoefficient,
            0
          );

        /*
          ==================================
          КУБОК
          ==================================
        */

        const cupPlacement =
          placements.get(
            association.id
          ) ?? null;

        const multiplier =
          getMultiplier(
            cupPlacement
          );

        /*
          ==================================
          ЛІГА АСОЦІАЦІЙ
          ==================================
        */

        let leaguePoints:
          number | null =
          null;

        if (
          multiplier !==
          null
        ) {
          const multiplierTenths =
            Math.round(
              multiplier *
                10
            );

          /*
            Не округлюємо.

            Наприклад:

            686 × 1.7
            =
            1166.2
          */

          leaguePoints =
            (
              baseCoefficient *
              multiplierTenths
            ) /
            10;
        }

        return {
          associationId:
            association.id,

          associationName:
            association.name,

          members,

          baseCoefficient,

          baseRank: 0,

          cupPlacement,

          cupPlacementLabel:
            getCupPlacementLabel(
              cupPlacement
            ),

          multiplier,

          leaguePoints,

          leaguePlace:
            null,
        };
      }
    );

  /*
    ========================================
    БАЗОВИЙ РЕЙТИНГ
    ========================================
  */

  rows =
    assignBaseRanks(
      rows
    );

  /*
    ========================================
    ЧИ ЗАВЕРШЕНО КУБОК
    ========================================
  */

  const cupComplete =
    rows.length > 0 &&
    rows.every(
      (row) =>
        row.cupPlacement !==
        null
    );

  /*
    ========================================
    ФІНАЛЬНИЙ РЕЙТИНГ
    ========================================
  */

  if (cupComplete) {
    rows =
      assignLeagueRanks(
        rows
      );
  } else {
    rows.sort(
      (a, b) =>
        a.baseRank -
        b.baseRank
    );
  }

  return {
    season,

    cupComplete,

    rows,
  };
}