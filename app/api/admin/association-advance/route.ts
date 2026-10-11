import { randomUUID } from "crypto";

import { NextResponse } from "next/server";

import {
  supabaseAdmin,
} from "../../../../lib/supabase-admin";

import {
  calculateAssociationSeries,
} from "../../../../lib/association-series";

import {
  getSeasonAssociationRankMap,
} from "../../../../lib/association-ranks";

import {
  getCompetitionAssociations,
} from "../../../../data/competitions/get-competition-associations";

type AssociationStage =
  | "quarterfinal"
  | "semifinal"
  | "final"
  | "third-place";

type MatchRow = {
  id: string;

  stage:
    string | null;

  round:
    number | null;

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

  is_tiebreak:
    boolean;
};

type SeriesResult = {
  slot: number;

  seriesId: string;

  homeAssociationId:
    string;

  awayAssociationId:
    string;

  winnerId:
    string | null;

  loserId:
    string | null;

  complete:
    boolean;
};

/*
  ========================================
  SLOT ІЗ SERIES ID
  ========================================
*/

function getSlot(
  seriesId:
    string | null
) {
  if (!seriesId) {
    return null;
  }

  const match =
    seriesId.match(
      /-slot-(\d+)-/
    );

  if (!match) {
    return null;
  }

  const slot =
    Number(
      match[1]
    );

  return Number.isInteger(
    slot
  )
    ? slot
    : null;
}

/*
  ========================================
  ЗАВАНТАЖЕННЯ СТАДІЇ
  ========================================
*/

async function loadStage(
  season: number,
  stage:
    AssociationStage
):
  Promise<
    SeriesResult[]
  > {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("matches")
      .select(`
        id,
        stage,
        round,
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
      .eq(
        "stage",
        stage
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  const matches =
    (data ??
      []) as MatchRow[];

  const seriesMap =
    new Map<
      string,
      MatchRow[]
    >();

  for (
    const match of
    matches
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
    SeriesResult[] =
    [];

  for (
    const [
      seriesId,
      seriesMatches,
    ] of seriesMap
  ) {
    const slot =
      getSlot(
        seriesId
      );

    if (
      slot === null
    ) {
      continue;
    }

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

    results.push({
      slot,

      seriesId,

      homeAssociationId,

      awayAssociationId,

      winnerId,

      loserId,

      complete:
        winnerId !==
        null,
    });
  }

  return results.sort(
    (a, b) =>
      a.slot -
      b.slot
  );
}

/*
  ========================================
  ЧИ ЗАВЕРШЕНА ВСЯ СТАДІЯ
  ========================================
*/

function stageComplete(
  series:
    SeriesResult[],
  expected:
    number
) {
  if (
    series.length <
    expected
  ) {
    return false;
  }

  for (
    let slot = 1;
    slot <= expected;
    slot += 1
  ) {
    const item =
      series.find(
        (seriesItem) =>
          seriesItem.slot ===
          slot
      );

    if (
      !item ||
      !item.complete ||
      !item.winnerId
    ) {
      return false;
    }
  }

  return true;
}

/*
  ========================================
  СТВОРЕННЯ ОДНІЄЇ СЕРІЇ
  ========================================
*/

async function createSeries({
  season,
  stage,
  slot,
  homeAssociationId,
  awayAssociationId,
}: {
  season: number;

  stage:
    AssociationStage;

  slot: number;

  homeAssociationId:
    string;

  awayAssociationId:
    string;
}) {
  /*
    ----------------------------------------
    ЗАХИСТ ВІД ДУБЛЮ
    ----------------------------------------
  */

  const existing =
    await loadStage(
      season,
      stage
    );

  const existingSlot =
    existing.find(
      (series) =>
        series.slot ===
        slot
    );

  if (existingSlot) {
    return {
      created:
        false,

      seriesId:
        existingSlot
          .seriesId,
    };
  }

  /*
    ----------------------------------------
    АСОЦІАЦІЇ
    ----------------------------------------
  */

  const associations =
    getCompetitionAssociations({
      season:
        season as 3,

      competition:
        "associations-cup",
    });

  const homeAssociation =
    associations.find(
      (association) =>
        association.id ===
        homeAssociationId
    );

  const awayAssociation =
    associations.find(
      (association) =>
        association.id ===
        awayAssociationId
    );

  if (
    !homeAssociation ||
    !awayAssociation
  ) {
    throw new Error(
      "Не знайдено склад однієї з Асоціацій"
    );
  }

  /*
    ----------------------------------------
    РАНГИ СЕЗОНУ
    ----------------------------------------
  */

  const rankMap =
    await getSeasonAssociationRankMap(
      season
    );

  const homeByRank =
    new Map<
      number,
      string
    >();

  const awayByRank =
    new Map<
      number,
      string
    >();

  for (
    const playerId of
    homeAssociation.players
  ) {
    const rank =
      rankMap.get(
        playerId
      );

    if (!rank) {
      throw new Error(
        `Не знайдено ранг гравця ${playerId}`
      );
    }

    homeByRank.set(
      rank.rank,
      playerId
    );
  }

  for (
    const playerId of
    awayAssociation.players
  ) {
    const rank =
      rankMap.get(
        playerId
      );

    if (!rank) {
      throw new Error(
        `Не знайдено ранг гравця ${playerId}`
      );
    }

    awayByRank.set(
      rank.rank,
      playerId
    );
  }

  /*
    Має бути рівно:

    R1
    R2
    R3
    R4
    R5
    R6
  */

  for (
    let rank = 1;
    rank <= 6;
    rank += 1
  ) {
    if (
      !homeByRank.has(
        rank
      )
    ) {
      throw new Error(
        `${homeAssociation.name}: немає R${rank}`
      );
    }

    if (
      !awayByRank.has(
        rank
      )
    ) {
      throw new Error(
        `${awayAssociation.name}: немає R${rank}`
      );
    }
  }

  /*
    ----------------------------------------
    SERIES ID

    ВАЖЛИВО:
    slot обов'язково є в ID,
    щоб сітка могла знайти пару.
    ----------------------------------------
  */

  const seriesId =
    `s${season}-associations-cup-${stage}-slot-${slot}-${randomUUID()}`;

  /*
    ----------------------------------------
    6 МАТЧІВ
    ----------------------------------------
  */

  const rows = [];

  for (
    let rank = 1;
    rank <= 6;
    rank += 1
  ) {
    const homePlayer =
      homeByRank.get(
        rank
      );

    const awayPlayer =
      awayByRank.get(
        rank
      );

    if (
      !homePlayer ||
      !awayPlayer
    ) {
      throw new Error(
        `Не вдалося сформувати R${rank}`
      );
    }

    rows.push({
      season,

      competition:
        "associations-cup",

      division:
        null,

      stage,

      group_name:
        null,

      /*
        round тут =
        R1 ... R6
      */

      round:
        rank,

      leg:
        1,

      participant_type:
        "player",

      home_id:
        homePlayer,

      away_id:
        awayPlayer,

      home_goals:
        null,

      away_goals:
        null,

      status:
        "scheduled",

      played_at:
        null,

      series_id:
        seriesId,

      series_home_id:
        homeAssociationId,

      series_away_id:
        awayAssociationId,

      is_tiebreak:
        false,
    });
  }

  const {
    error:
      insertError,
  } =
    await supabaseAdmin
      .from("matches")
      .insert(
        rows
      );

  if (insertError) {
    throw new Error(
      insertError.message
    );
  }

  return {
    created:
      true,

    seriesId,
  };
}

/*
  ========================================
  POST
  ========================================
*/

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as {
        password?: string;

        season?: number;
      };

    /*
      ADMIN
    */

    if (
      !process.env.ADMIN_PASSWORD ||
      body.password !==
        process.env.ADMIN_PASSWORD
    ) {
      return NextResponse.json(
        {
          error:
            "Невірний пароль адміністратора",
        },
        {
          status: 401,
        }
      );
    }

    /*
      Поки автоматизуємо
      актуальний Сезон 3.
    */

    if (
      body.season !== 3
    ) {
      return NextResponse.json(
        {
          error:
            "Автоматичне просування зараз увімкнене для Сезону 3",
        },
        {
          status: 400,
        }
      );
    }

    const season =
      3;

    const created:
      string[] = [];

    /*
      ========================================
      1/4 -> 1/2
      ========================================
    */

    const quarterfinals =
      await loadStage(
        season,
        "quarterfinal"
      );

    const quarterfinalComplete =
      stageComplete(
        quarterfinals,
        4
      );

    if (
      quarterfinalComplete
    ) {
      const qf1 =
        quarterfinals.find(
          (item) =>
            item.slot === 1
        );

      const qf2 =
        quarterfinals.find(
          (item) =>
            item.slot === 2
        );

      const qf3 =
        quarterfinals.find(
          (item) =>
            item.slot === 3
        );

      const qf4 =
        quarterfinals.find(
          (item) =>
            item.slot === 4
        );

      if (
        qf1?.winnerId &&
        qf2?.winnerId
      ) {
        const result =
          await createSeries({
            season,

            stage:
              "semifinal",

            slot:
              1,

            homeAssociationId:
              qf1.winnerId,

            awayAssociationId:
              qf2.winnerId,
          });

        if (
          result.created
        ) {
          created.push(
            "1/2 фіналу — пара №1"
          );
        }
      }

      if (
        qf3?.winnerId &&
        qf4?.winnerId
      ) {
        const result =
          await createSeries({
            season,

            stage:
              "semifinal",

            slot:
              2,

            homeAssociationId:
              qf3.winnerId,

            awayAssociationId:
              qf4.winnerId,
          });

        if (
          result.created
        ) {
          created.push(
            "1/2 фіналу — пара №2"
          );
        }
      }
    }

    /*
      ========================================
      1/2 -> ФІНАЛ + 3 МІСЦЕ
      ========================================
    */

    const semifinals =
      await loadStage(
        season,
        "semifinal"
      );

    const semifinalComplete =
      stageComplete(
        semifinals,
        2
      );

    if (
      semifinalComplete
    ) {
      const sf1 =
        semifinals.find(
          (item) =>
            item.slot === 1
        );

      const sf2 =
        semifinals.find(
          (item) =>
            item.slot === 2
        );

      /*
        ФІНАЛ
      */

      if (
        sf1?.winnerId &&
        sf2?.winnerId
      ) {
        const result =
          await createSeries({
            season,

            stage:
              "final",

            slot:
              1,

            homeAssociationId:
              sf1.winnerId,

            awayAssociationId:
              sf2.winnerId,
          });

        if (
          result.created
        ) {
          created.push(
            "Фінал"
          );
        }
      }

      /*
        3 МІСЦЕ

        Потрібне для:
        3 місце -> ×1.7
        4 місце -> ×1.6
      */

      if (
        sf1?.loserId &&
        sf2?.loserId
      ) {
        const result =
          await createSeries({
            season,

            stage:
              "third-place",

            slot:
              1,

            homeAssociationId:
              sf1.loserId,

            awayAssociationId:
              sf2.loserId,
          });

        if (
          result.created
        ) {
          created.push(
            "Матч за 3 місце"
          );
        }
      }
    }

    return NextResponse.json({
      success:
        true,

      season,

      quarterfinal_complete:
        quarterfinalComplete,

      semifinal_complete:
        semifinalComplete,

      created,

      message:
        created.length > 0
          ? `Автоматично створено: ${created.join(
              ", "
            )}`
          : "Нових стадій поки створювати не потрібно",
    });
  } catch (error) {
    console.error(
      "ASSOCIATION ADVANCE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Помилка автоматичного просування",
      },
      {
        status: 500,
      }
    );
  }
}