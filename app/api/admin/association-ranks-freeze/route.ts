import { NextResponse } from "next/server";

import {
  ASSOCIATION_PLAYER_COUNT,
  freezeAssociationRanks,
  getAssociationRankLabel,
  seasonAssociationRanksExist,
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
      ========================================
      ADMIN PASSWORD
      ========================================
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
      ========================================
      СЕЗОН
      ========================================

      Поки налаштовуємо
      перехід:

      Сезон 3 -> Сезон 4
    */

    if (
      body.season !== 4
    ) {
      return NextResponse.json(
        {
          error:
            "Фіксація рангів зараз налаштована для Сезону 4",
        },
        {
          status: 400,
        }
      );
    }

    const season = 4;

    const sourceSeason = 3;

    /*
      ========================================
      ЧИ ВЖЕ ЗАФІКСОВАНО
      ========================================
    */

    const alreadyExists =
      await seasonAssociationRanksExist(
        season
      );

    if (alreadyExists) {
      return NextResponse.json(
        {
          success: false,

          season,

          frozen: true,

          error:
            `Ранги Сезону ${season} вже зафіксовані`,
        },
        {
          status: 409,
        }
      );
    }

    /*
      ========================================
      КІЛЬКІСТЬ УЧАСНИКІВ
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

          season,

          registered:
            season4Registration.length,

          required:
            ASSOCIATION_PLAYER_COUNT,

          error:
            `Для фіксації потрібно рівно ${ASSOCIATION_PLAYER_COUNT} гравців. Зараз: ${season4Registration.length}`,
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

    const playerIds =
      season4Registration.map(
        (row) =>
          row.playerId
      );

    const uniquePlayerIds =
      new Set(
        playerIds
      );

    if (
      uniquePlayerIds.size !==
      ASSOCIATION_PLAYER_COUNT
    ) {
      return NextResponse.json(
        {
          error:
            "У стартовій таблиці є дублікати гравців",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      НЕВІДОМІ PLAYER ID
      ========================================

      Перед фіксацією всі гравці
      повинні вже існувати
      у data/players.
    */

    const knownPlayerIds =
      new Set(
        players.map(
          (player) =>
            player.id
        )
      );

    const unknownPlayerIds =
      playerIds.filter(
        (playerId) =>
          !knownPlayerIds.has(
            playerId
          )
      );

    if (
      unknownPlayerIds.length >
      0
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "У реєстрації є невідомі player ID",

          unknownPlayerIds,
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      ПІДГОТОВКА РЕЙТИНГУ
      ========================================

      Порядок беремо ТОЧНО
      з опублікованої стартової
      таблиці.

      Нічого тут не сортуємо.
    */

    const orderedPlayers =
      season4Registration.map(
        (row) => ({
          playerId:
            row.playerId,

          coefficient:
            row.coefficient,
        })
      );

    /*
      ========================================
      ФІКСУЄМО SNAPSHOT
      ========================================

      ПІСЛЯ ЦЬОГО:

      1–8   = R1
      9–16  = R2
      17–24 = R3
      25–32 = R4
      33–40 = R5
      41–48 = R6

      association_id поки null.

      Його заповнимо
      після жеребкування.
    */

    const snapshot =
      await freezeAssociationRanks({
        season,

        sourceSeason,

        orderedPlayers,
      });

    /*
      ========================================
      ВІДПОВІДЬ
      ========================================
    */

    const ranks =
      [1, 2, 3, 4, 5, 6].map(
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

                  rank:
                    getAssociationRankLabel(
                      row.rank
                    ),

                  associationId:
                    row.associationId,
                })
              ),
        })
      );

    return NextResponse.json({
      success: true,

      frozen: true,

      season,

      sourceSeason,

      players:
        snapshot.length,

      message:
        `Ранги Сезону ${season} успішно зафіксовані`,

      ranks,
    });
  } catch (error) {
    console.error(
      "ASSOCIATION RANKS FREEZE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Помилка фіксації рангів",
      },
      {
        status: 500,
      }
    );
  }
}