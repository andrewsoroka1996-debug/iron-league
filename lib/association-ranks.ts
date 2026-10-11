import "server-only";

import {
  supabaseAdmin,
} from "./supabase-admin";

/*
  ========================================
  TYPES
  ========================================
*/

export type AssociationRank =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6;

export type AssociationRankLabel =
  | "R1"
  | "R2"
  | "R3"
  | "R4"
  | "R5"
  | "R6";

export type SeasonSeedPlayer = {
  season: number;

  playerId: string;

  rank:
    AssociationRank;

  /*
    Місце у стартовому рейтингу
    нового сезону.

    Наприклад:
    1–8  = R1
    9–16 = R2
  */

  seedPosition:
    number | null;

  /*
    Коефіцієнт, з яким
    гравець увійшов
    у новий сезон.
  */

  sourceCoefficient:
    number;

  /*
    З якого сезону
    взято коефіцієнт.
  */

  sourceSeason:
    number | null;

  /*
    Після жеребкування
    тут зберігається
    Асоціація.
  */

  associationId:
    string | null;
};

export type RankingSourcePlayer = {
  playerId: string;

  coefficient: number;
};

/*
  ========================================
  DB ROW
  ========================================
*/

type AssociationSeedRankDatabaseRow = {
  season: number;

  player_id: string;

  rank: number;

  seed_position:
    number | null;

  source_coefficient:
    number | string | null;

  source_season:
    number | null;

  association_id:
    string | null;
};

/*
  ========================================
  CONSTANTS
  ========================================
*/

export const ASSOCIATION_PLAYER_COUNT =
  48;

export const ASSOCIATION_COUNT =
  8;

export const ASSOCIATION_RANK_COUNT =
  6;

export const PLAYERS_PER_RANK =
  8;

/*
  ========================================
  RANK LABEL
  ========================================
*/

export function getAssociationRankLabel(
  rank: AssociationRank
):
  AssociationRankLabel {
  return `R${rank}` as AssociationRankLabel;
}

/*
  ========================================
  POSITION -> RANK
  ========================================

  1–8   -> R1
  9–16  -> R2
  17–24 -> R3
  25–32 -> R4
  33–40 -> R5
  41–48 -> R6
*/

export function getAssociationRankFromPosition(
  position: number
):
  AssociationRank {
  if (
    !Number.isInteger(position) ||
    position < 1 ||
    position >
      ASSOCIATION_PLAYER_COUNT
  ) {
    throw new Error(
      `Некоректне місце у рейтингу: ${position}`
    );
  }

  return Math.ceil(
    position /
      PLAYERS_PER_RANK
  ) as AssociationRank;
}

/*
  ========================================
  DB -> NORMALIZED
  ========================================
*/

function normalizeDatabaseRow(
  row:
    AssociationSeedRankDatabaseRow
):
  SeasonSeedPlayer {
  const rank =
    Number(
      row.rank
    ) as AssociationRank;

  if (
    rank < 1 ||
    rank > 6
  ) {
    throw new Error(
      `Некоректний ранг гравця ${row.player_id}: ${row.rank}`
    );
  }

  return {
    season:
      row.season,

    playerId:
      row.player_id,

    rank,

    seedPosition:
      row.seed_position,

    sourceCoefficient:
      Number(
        row.source_coefficient ??
          0
      ),

    sourceSeason:
      row.source_season,

    associationId:
      row.association_id,
  };
}

/*
  ========================================
  LOAD SEASON RANKS
  ========================================
*/

export async function getSeasonAssociationRanks(
  season: number
):
  Promise<SeasonSeedPlayer[]> {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "association_seed_ranks"
      )
      .select(`
        season,
        player_id,
        rank,
        seed_position,
        source_coefficient,
        source_season,
        association_id
      `)
      .eq(
        "season",
        season
      )
      .order(
        "rank",
        {
          ascending:
            true,
        }
      )
      .order(
        "seed_position",
        {
          ascending:
            true,
          nullsFirst:
            false,
        }
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return (
    (data ??
      []) as AssociationSeedRankDatabaseRow[]
  ).map(
    normalizeDatabaseRow
  );
}

/*
  ========================================
  PLAYER -> RANK MAP
  ========================================

  Зручно для Ліги Асоціацій:

  map.get("gadyuka-88")
  -> { rank: 1, ... }
*/

export async function getSeasonAssociationRankMap(
  season: number
) {
  const rows =
    await getSeasonAssociationRanks(
      season
    );

  return new Map(
    rows.map(
      (row) => [
        row.playerId,
        row,
      ]
    )
  );
}

/*
  ========================================
  ONE PLAYER
  ========================================
*/

export async function getPlayerAssociationRank(
  season: number,
  playerId: string
) {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "association_seed_ranks"
      )
      .select(`
        season,
        player_id,
        rank,
        seed_position,
        source_coefficient,
        source_season,
        association_id
      `)
      .eq(
        "season",
        season
      )
      .eq(
        "player_id",
        playerId
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      error.message
    );
  }

  if (!data) {
    return null;
  }

  return normalizeDatabaseRow(
    data as AssociationSeedRankDatabaseRow
  );
}

/*
  ========================================
  FILTER ACTIVE PLAYERS
  ========================================

  ranking =
  фінальна таблиця попереднього сезону
  у правильному порядку.

  activePlayerIds =
  гравці, які заявилися
  на новий сезон.

  Результат:
  попередній рейтинг,
  але без неактивних гравців.
*/

export function filterRankingToActivePlayers(
  ranking:
    readonly RankingSourcePlayer[],

  activePlayerIds:
    readonly string[]
):
  RankingSourcePlayer[] {
  const active =
    new Set(
      activePlayerIds
    );

  const seen =
    new Set<string>();

  const result:
    RankingSourcePlayer[] =
    [];

  for (
    const row of ranking
  ) {
    if (
      !active.has(
        row.playerId
      )
    ) {
      continue;
    }

    if (
      seen.has(
        row.playerId
      )
    ) {
      continue;
    }

    seen.add(
      row.playerId
    );

    result.push({
      playerId:
        row.playerId,

      coefficient:
        row.coefficient,
    });
  }

  return result;
}

/*
  ========================================
  PREPARE NEW SEASON FROM REGISTRATION
  ========================================

  Джерело учасників нового сезону —
  офіційний опублікований список.

  Порядок:

  1. Беремо активних гравців,
     які вже були у попередньому
     рейтингу.

  2. Зберігаємо їх порядок
     із фінальної таблиці
     коефіцієнтів попереднього сезону.

  3. Новачків, яких у старому
     рейтингу немає, ставимо
     після всіх старих гравців.

  4. Порядок новачків між собою —
     такий самий, як у
     опублікованому списку.

  5. Далі buildAssociationRankSnapshot()
     автоматично розділить:

     1–8   -> R1
     9–16  -> R2
     17–24 -> R3
     25–32 -> R4
     33–40 -> R5
     41–48 -> R6
*/

export type NewSeasonRankPreparation = {
  orderedPlayers:
    RankingSourcePlayer[];

  returningPlayerIds:
    string[];

  newcomerPlayerIds:
    string[];
};

export function prepareAssociationRanksFromRegistration({
  previousRanking,
  registeredPlayerIds,
}: {
  /*
    Фінальна таблиця коефіцієнтів
    попереднього сезону.

    ВАЖЛИВО:
    вона вже повинна бути
    у правильному порядку:

    найкращий -> найгірший.
  */

  previousRanking:
    readonly RankingSourcePlayer[];

  /*
    Офіційно опублікований
    список учасників
    нового сезону.
  */

  registeredPlayerIds:
    readonly string[];
}):
  NewSeasonRankPreparation {

  /*
    ----------------------------------------
    ПОВИННО БУТИ РІВНО 48
    ----------------------------------------
  */

  if (
    registeredPlayerIds.length !==
    ASSOCIATION_PLAYER_COUNT
  ) {
    throw new Error(
      `У списку нового сезону має бути рівно ${ASSOCIATION_PLAYER_COUNT} гравців. Зараз: ${registeredPlayerIds.length}`
    );
  }

  /*
    ----------------------------------------
    ДУБЛІКАТИ У РЕЄСТРАЦІЇ
    ----------------------------------------
  */

  const uniqueRegistered =
    new Set(
      registeredPlayerIds
    );

  if (
    uniqueRegistered.size !==
    ASSOCIATION_PLAYER_COUNT
  ) {
    throw new Error(
      "У списку учасників нового сезону є дублікати"
    );
  }

  /*
    ----------------------------------------
    СТАРІ АКТИВНІ ГРАВЦІ
    ----------------------------------------
  */

  const returningPlayers:
    RankingSourcePlayer[] =
    [];

  const returningPlayerIds:
    string[] =
    [];

  const added =
    new Set<string>();

  for (
    const row of
    previousRanking
  ) {
    /*
      Гравець не заявився
      у новий сезон.
    */

    if (
      !uniqueRegistered.has(
        row.playerId
      )
    ) {
      continue;
    }

    /*
      Захист від дублю
      у старому рейтингу.
    */

    if (
      added.has(
        row.playerId
      )
    ) {
      continue;
    }

    returningPlayers.push({
      playerId:
        row.playerId,

      coefficient:
        row.coefficient,
    });

    returningPlayerIds.push(
      row.playerId
    );

    added.add(
      row.playerId
    );
  }

  /*
    ----------------------------------------
    НОВАЧКИ
    ----------------------------------------

    Гравець є в офіційному
    списку нового сезону,
    але його немає
    у рейтингу попереднього.

    Він автоматично йде
    після старих гравців.

    coefficient = 0 означає лише,
    що історичного коефіцієнта
    в нього немає.

    Позицію визначає НЕ число 0,
    а те, що новачки додаються
    після returningPlayers.
  */

  const newcomers:
    RankingSourcePlayer[] =
    [];

  const newcomerPlayerIds:
    string[] =
    [];

  for (
    const playerId of
    registeredPlayerIds
  ) {
    if (
      added.has(
        playerId
      )
    ) {
      continue;
    }

    newcomers.push({
      playerId,

      coefficient: 0,
    });

    newcomerPlayerIds.push(
      playerId
    );

    added.add(
      playerId
    );
  }

  /*
    ----------------------------------------
    ПІДСУМКОВІ 48
    ----------------------------------------
  */

  const orderedPlayers = [
    ...returningPlayers,
    ...newcomers,
  ];

  if (
    orderedPlayers.length !==
    ASSOCIATION_PLAYER_COUNT
  ) {
    throw new Error(
      `Не вдалося сформувати повний стартовий рейтинг. Гравців: ${orderedPlayers.length}`
    );
  }

  return {
    orderedPlayers,

    returningPlayerIds,

    newcomerPlayerIds,
  };
}

/*
  ========================================
  FREEZE FROM REGISTRATION
  ========================================

  Повний універсальний запуск:

  попередній рейтинг
  +
  список нового сезону
  =
  зафіксовані R1–R6.
*/

export async function freezeAssociationRanksFromRegistration({
  season,
  sourceSeason,
  previousRanking,
  registeredPlayerIds,
}: {
  /*
    Новий сезон.

    Наприклад:
    4
  */

  season: number;

  /*
    Попередній сезон,
    з якого беремо коефіцієнти.

    Наприклад:
    3
  */

  sourceSeason: number;

  previousRanking:
    readonly RankingSourcePlayer[];

  registeredPlayerIds:
    readonly string[];
}) {
  const preparation =
    prepareAssociationRanksFromRegistration({
      previousRanking,

      registeredPlayerIds,
    });

  const snapshot =
    await freezeAssociationRanks({
      season,

      sourceSeason,

      orderedPlayers:
        preparation.orderedPlayers,
    });

  return {
    snapshot,

    returningPlayerIds:
      preparation.returningPlayerIds,

    newcomerPlayerIds:
      preparation.newcomerPlayerIds,

    returningPlayers:
      preparation.returningPlayerIds
        .length,

    newcomers:
      preparation.newcomerPlayerIds
        .length,
  };
}

/*
  ========================================
  BUILD SNAPSHOT
  ========================================

  orderedPlayers повинні
  вже бути відсортовані:

  найкращий -> перший
  найгірший -> останній.

  Функція автоматично
  роздає R1–R6.
*/

export function buildAssociationRankSnapshot({
  season,
  sourceSeason,
  orderedPlayers,
}: {
  season: number;

  sourceSeason: number;

  orderedPlayers:
    readonly RankingSourcePlayer[];
}):
  SeasonSeedPlayer[] {
  if (
    orderedPlayers.length !==
    ASSOCIATION_PLAYER_COUNT
  ) {
    throw new Error(
      `Для формування рангів потрібно рівно ${ASSOCIATION_PLAYER_COUNT} активних гравців. Зараз: ${orderedPlayers.length}`
    );
  }

  const uniquePlayers =
    new Set(
      orderedPlayers.map(
        (player) =>
          player.playerId
      )
    );

  if (
    uniquePlayers.size !==
    ASSOCIATION_PLAYER_COUNT
  ) {
    throw new Error(
      "У стартовому рейтингу є дублікати гравців"
    );
  }

  return orderedPlayers.map(
    (
      player,
      index
    ) => {
      const seedPosition =
        index + 1;

      return {
        season,

        playerId:
          player.playerId,

        rank:
          getAssociationRankFromPosition(
            seedPosition
          ),

        seedPosition,

        sourceCoefficient:
          player.coefficient,

        sourceSeason,

        /*
          До жеребкування
          Асоціація ще
          не визначена.
        */

        associationId:
          null,
      };
    }
  );
}

/*
  ========================================
  CHECK IF SEASON IS ALREADY FROZEN
  ========================================
*/

export async function seasonAssociationRanksExist(
  season: number
) {
  const {
    count,
    error,
  } =
    await supabaseAdmin
      .from(
        "association_seed_ranks"
      )
      .select(
        "id",
        {
          count:
            "exact",

          head:
            true,
        }
      )
      .eq(
        "season",
        season
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return (
    count ??
    0
  ) > 0;
}

/*
  ========================================
  FREEZE NEW SEASON RANKS
  ========================================

  ВАЖЛИВО:

  ця функція не перезаписує
  вже зафіксований сезон.

  Це захист від ситуації,
  коли LIVE-рейтинг змінився
  і випадково змінив ранги.
*/

export async function freezeAssociationRanks({
  season,
  sourceSeason,
  orderedPlayers,
}: {
  season: number;

  sourceSeason: number;

  orderedPlayers:
    readonly RankingSourcePlayer[];
}) {
  const alreadyExists =
    await seasonAssociationRanksExist(
      season
    );

  if (alreadyExists) {
    throw new Error(
      `Ранги Сезону ${season} вже зафіксовані і не можуть бути автоматично перераховані`
    );
  }

  const snapshot =
    buildAssociationRankSnapshot({
      season,

      sourceSeason,

      orderedPlayers,
    });

  const rows =
    snapshot.map(
      (player) => ({
        season:
          player.season,

        player_id:
          player.playerId,

        rank:
          player.rank,

        seed_position:
          player.seedPosition,

        source_coefficient:
          player.sourceCoefficient,

        source_season:
          player.sourceSeason,

        association_id:
          null,
      })
    );

  const {
    error,
  } =
    await supabaseAdmin
      .from(
        "association_seed_ranks"
      )
      .insert(
        rows
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return snapshot;
}

/*
  ========================================
  ASSIGN ASSOCIATION AFTER DRAW
  ========================================

  Після жеребкування
  записуємо, до якої
  Асоціації потрапив гравець.

  Сам ранг при цьому
  НЕ змінюється.
*/

export async function setPlayerAssociationForSeason({
  season,
  playerId,
  associationId,
}: {
  season: number;

  playerId: string;

  associationId: string;
}) {
  const {
    error,
  } =
    await supabaseAdmin
      .from(
        "association_seed_ranks"
      )
      .update({
        association_id:
          associationId,
      })
      .eq(
        "season",
        season
      )
      .eq(
        "player_id",
        playerId
      );

  if (error) {
    throw new Error(
      error.message
    );
  }
}

/*
  ========================================
  VALIDATE DRAW
  ========================================

  Перевіряємо, що кожна
  Асоціація має:

  1 × R1
  1 × R2
  1 × R3
  1 × R4
  1 × R5
  1 × R6
*/

export async function validateAssociationRankBalance(
  season: number
) {
  const rows =
    await getSeasonAssociationRanks(
      season
    );

  const associations =
    new Map<
      string,
      SeasonSeedPlayer[]
    >();

  for (
    const row of rows
  ) {
    if (
      !row.associationId
    ) {
      continue;
    }

    const current =
      associations.get(
        row.associationId
      ) ?? [];

    current.push(
      row
    );

    associations.set(
      row.associationId,
      current
    );
  }

  const errors:
    string[] =
    [];

  for (
    const [
      associationId,
      members,
    ] of associations
  ) {
    if (
      members.length !==
      6
    ) {
      errors.push(
        `${associationId}: має ${members.length} гравців замість 6`
      );

      continue;
    }

    for (
      let rank = 1;
      rank <= 6;
      rank += 1
    ) {
      const count =
        members.filter(
          (member) =>
            member.rank ===
            rank
        ).length;

      if (
        count !== 1
      ) {
        errors.push(
          `${associationId}: R${rank} = ${count} гравців`
        );
      }
    }
  }

  return {
    valid:
      errors.length ===
      0,

    errors,

    associations:
      associations.size,
  };
}