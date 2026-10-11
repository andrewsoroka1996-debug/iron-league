import { NextResponse } from "next/server";

import {
  buildAssociationRankSnapshot,
  ASSOCIATION_PLAYER_COUNT,
} from "../../../../lib/association-ranks";

import {
  season4Registration,
} from "../../../../data/registrations/season-4";

import { players } from "../../../../data/players";

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
        player.id === playerId
    )?.nickname ??
    playerId
  );
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
      ADMIN PASSWORD
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
      Поки готуємо
      перехід Сезон 3 -> Сезон 4.
    */

    if (
      body.season !== 4
    ) {
      return NextResponse.json(
        {
          error:
            "Preview зараз налаштований для Сезону 4",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      ПЕРЕВІРКА СПИСКУ
      ========================================
    */

    if (
      season4Registration.length !==
      ASSOCIATION_PLAYER_COUNT
    ) {
      return NextResponse.json(
        {
          success: false,

          ready: false,

          season: 4,

          registered:
            season4Registration.length,

          required:
            ASSOCIATION_PLAYER_COUNT,

          message:
            `Для формування рангів потрібно 48 гравців. Зараз у стартовій таблиці: ${season4Registration.length}`,
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      ДУБЛІКАТИ
      ========================================
    */

    const ids =
      season4Registration.map(
        (row) =>
          row.playerId
      );

    const uniqueIds =
      new Set(ids);

    if (
      uniqueIds.size !==
      ASSOCIATION_PLAYER_COUNT
    ) {
      return NextResponse.json(
        {
          error:
            "У стартовій таблиці Сезону 4 є дублікати гравців",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      BUILD PREVIEW

      НІЧОГО В SUPABASE
      НЕ ЗАПИСУЄТЬСЯ.
      ========================================
    */

    const snapshot =
      buildAssociationRankSnapshot({
        season: 4,

        sourceSeason: 3,

        orderedPlayers:
          season4Registration.map(
            (row) => ({
              playerId:
                row.playerId,

              coefficient:
                row.coefficient,
            })
          ),
      });

    /*
      newcomer зберігаємо
      тільки для Preview.
    */

    const newcomerMap =
      new Map(
        season4Registration.map(
          (row) => [
            row.playerId,
            row.newcomer === true,
          ]
        )
      );

    /*
      ========================================
      ГРУПУЄМО R1–R6
      ========================================
    */

    const ranks = [
      1,
      2,
      3,
      4,
      5,
      6,
    ].map(
      (rank) => ({
        rank:
          `R${rank}`,

        players:
          snapshot
            .filter(
              (row) =>
                row.rank ===
                rank
            )
            .map(
              (row) => ({
                position:
                  row.seedPosition,

                playerId:
                  row.playerId,

                playerName:
                  getPlayerName(
                    row.playerId
                  ),

                coefficient:
                  row.sourceCoefficient,

                newcomer:
                  newcomerMap.get(
                    row.playerId
                  ) ?? false,
              })
            ),
      })
    );

    return NextResponse.json({
      success: true,

      ready: true,

      readonly: true,

      season: 4,

      sourceSeason: 3,

      players:
        snapshot.length,

      newcomers:
        season4Registration.filter(
          (row) =>
            row.newcomer === true
        ).length,

      ranks,
    });
  } catch (error) {
    console.error(
      "ASSOCIATION RANKS PREVIEW ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Помилка Preview рангів",
      },
      {
        status: 500,
      }
    );
  }
}