import { randomUUID } from "crypto";

import { NextResponse } from "next/server";

import {
  getCompetitionAssociations,
} from "../../../../data/competitions/get-competition-associations";

import {
  getSeasonAssociationRankMap,
} from "../../../../lib/association-ranks";

import {
  supabaseAdmin,
} from "../../../../lib/supabase-admin";

/*
  ========================================
  СЕЗОН 3
  1/4 ФІНАЛУ КУБКА АСОЦІАЦІЙ
  ========================================

  Франція — Бразилія
  Іспанія — Англія
  Нідерланди — Італія
  Аргентина — Португалія
*/

const QUARTERFINAL_DRAW = [
  {
    home:
      "Франція",

    away:
      "Бразилія",
  },

  {
    home:
      "Іспанія",

    away:
      "Англія",
  },

  {
    home:
      "Нідерланди",

    away:
      "Італія",
  },

  {
    home:
      "Аргентина",

    away:
      "Португалія",
  },
] as const;

/*
  ========================================
  POST
  ========================================
*/

export async function POST(
  request: Request
) {
  try {
    /*
      ========================================
      ADMIN PASSWORD
      ========================================
    */

    const body =
      (await request.json()) as {
        password?: string;
      };

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
      ========================================
      ЗАХИСТ ВІД ПОВТОРНОГО ІМПОРТУ
      ========================================

      Якщо у Сезоні 3 вже є
      хоч один матч 1/4 фіналу
      Кубка асоціацій —
      нічого не створюємо.
    */

    const {
      count:
        existingCount,

      error:
        existingError,
    } =
      await supabaseAdmin
        .from("matches")
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
          3
        )
        .eq(
          "competition",
          "associations-cup"
        )
        .eq(
          "stage",
          "quarterfinal"
        );

    if (existingError) {
      return NextResponse.json(
        {
          error:
            existingError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (
      (existingCount ?? 0) >
      0
    ) {
      return NextResponse.json(
        {
          error:
            "Чвертьфінальні матчі Сезону 3 вже існують",

          existingMatches:
            existingCount,
        },
        {
          status: 409,
        }
      );
    }

    /*
      ========================================
      АСОЦІАЦІЇ СЕЗОНУ 3
      ========================================
    */

    const associations =
      getCompetitionAssociations({
        season: 3,

        competition:
          "associations-cup",
      });

    if (
      associations.length !==
      8
    ) {
      return NextResponse.json(
        {
          error:
            `Очікувалося 8 Асоціацій, знайдено ${associations.length}`,
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      РАНГИ СЕЗОНУ 3
      ========================================
    */

    const rankMap =
      await getSeasonAssociationRankMap(
        3
      );

    if (
      rankMap.size !==
      48
    ) {
      return NextResponse.json(
        {
          error:
            `Очікувалося 48 зафіксованих рангів, знайдено ${rankMap.size}`,
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      ПОШУК АСОЦІАЦІЇ ЗА НАЗВОЮ
      ========================================
    */

    function findAssociation(
      name: string
    ) {
      return associations.find(
        (association) =>
          association.name ===
          name
      );
    }

    /*
      ========================================
      ГРАВЦІ АСОЦІАЦІЇ ПО РАНГАХ
      ========================================

      Повертає:

      R1 -> playerId
      R2 -> playerId
      ...
      R6 -> playerId
    */

    function getPlayersByRank(
      associationId: string,
      playerIds:
        readonly string[]
    ) {
      const byRank =
        new Map<
          number,
          string
        >();

      for (
        const playerId of
        playerIds
      ) {
        const seed =
          rankMap.get(
            playerId
          );

        if (!seed) {
          throw new Error(
            `Для гравця ${playerId} не знайдено ранг`
          );
        }

        /*
          Перевіряємо,
          що snapshot належить
          цій самій Асоціації.
        */

        if (
          seed.associationId &&
          seed.associationId !==
            associationId
        ) {
          throw new Error(
            `Гравець ${playerId}: Асоціація в snapshot не збігається зі складом`
          );
        }

        if (
          byRank.has(
            seed.rank
          )
        ) {
          throw new Error(
            `${associationId}: знайдено більше одного R${seed.rank}`
          );
        }

        byRank.set(
          seed.rank,
          playerId
        );
      }

      for (
        let rank = 1;
        rank <= 6;
        rank += 1
      ) {
        if (
          !byRank.has(
            rank
          )
        ) {
          throw new Error(
            `${associationId}: не знайдено R${rank}`
          );
        }
      }

      return byRank;
    }

    /*
      ========================================
      ФОРМУЄМО 24 МАТЧІ
      ========================================
    */

    const rows: {
      season: number;

      competition:
        string;

      division:
        null;

      stage:
        string;

      group_name:
        null;

      round:
        number;

      leg:
        number;

      participant_type:
        string;

      home_id:
        string;

      away_id:
        string;

      home_goals:
        null;

      away_goals:
        null;

      status:
        string;

      played_at:
        null;

      series_id:
        string;

      series_home_id:
        string;

      series_away_id:
        string;

      is_tiebreak:
        boolean;
    }[] = [];

    const createdSeries: {
      seriesId: string;

      home: string;

      away: string;
    }[] = [];

    for (
      const pairing of
      QUARTERFINAL_DRAW
    ) {
      const homeAssociation =
        findAssociation(
          pairing.home
        );

      const awayAssociation =
        findAssociation(
          pairing.away
        );

      if (
        !homeAssociation
      ) {
        return NextResponse.json(
          {
            error:
              `Не знайдено Асоціацію: ${pairing.home}`,
          },
          {
            status: 400,
          }
        );
      }

      if (
        !awayAssociation
      ) {
        return NextResponse.json(
          {
            error:
              `Не знайдено Асоціацію: ${pairing.away}`,
          },
          {
            status: 400,
          }
        );
      }

      /*
        По одному гравцю
        кожного рангу.
      */

      const homeByRank =
        getPlayersByRank(
          homeAssociation.id,
          homeAssociation.players
        );

      const awayByRank =
        getPlayersByRank(
          awayAssociation.id,
          awayAssociation.players
        );

      /*
        Одна пара Асоціацій =
        один series_id.
      */

      const seriesId =
        `s3-associations-cup-quarterfinal-${randomUUID()}`;

      createdSeries.push({
        seriesId,

        home:
          homeAssociation.name,

        away:
          awayAssociation.name,
      });

      /*
        R1 vs R1
        ...
        R6 vs R6
      */

      for (
        let rank = 1;
        rank <= 6;
        rank += 1
      ) {
        const homePlayerId =
          homeByRank.get(
            rank
          );

        const awayPlayerId =
          awayByRank.get(
            rank
          );

        if (
          !homePlayerId ||
          !awayPlayerId
        ) {
          throw new Error(
            `${homeAssociation.name} — ${awayAssociation.name}: не вдалося сформувати R${rank}`
          );
        }

        rows.push({
          season:
            3,

          competition:
            "associations-cup",

          division:
            null,

          stage:
            "quarterfinal",

          group_name:
            null,

          /*
            Тут round =
            ранг матчу:

            1 = R1
            2 = R2
            ...
            6 = R6
          */

          round:
            rank,

          leg:
            1,

          participant_type:
            "player",

          home_id:
            homePlayerId,

          away_id:
            awayPlayerId,

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
            homeAssociation.id,

          series_away_id:
            awayAssociation.id,

          is_tiebreak:
            false,
        });
      }
    }

    /*
      ========================================
      ФІНАЛЬНА ПЕРЕВІРКА
      ========================================
    */

    if (
      rows.length !==
      24
    ) {
      return NextResponse.json(
        {
          error:
            `Очікувалося 24 матчі, сформовано ${rows.length}`,
        },
        {
          status: 500,
        }
      );
    }

    /*
      ========================================
      INSERT 24 MATCHES
      ========================================
    */

    const {
      data,
      error:
        insertError,
    } =
      await supabaseAdmin
        .from("matches")
        .insert(
          rows
        )
        .select(`
          id,
          series_id,
          round,
          home_id,
          away_id,
          status
        `);

    if (insertError) {
      return NextResponse.json(
        {
          error:
            insertError.message,
        },
        {
          status: 500,
        }
      );
    }

    /*
      ========================================
      SUCCESS
      ========================================
    */

    return NextResponse.json({
      success: true,

      season:
        3,

      stage:
        "quarterfinal",

      series:
        createdSeries.length,

      matches:
        data?.length ??
        0,

      draw:
        createdSeries,

      message:
        "1/4 фіналу Кубка асоціацій Сезону 3 створено",
    });
  } catch (error) {
    console.error(
      "SEASON 3 ASSOCIATION QUARTERFINAL SEED ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Невідома помилка",
      },
      {
        status: 500,
      }
    );
  }
}