import { NextResponse } from "next/server";

import {
  getSeasonAssociationRanks,
  getAssociationRankLabel,
} from "../../../../lib/association-ranks";

import {
  associationCatalog,
} from "../../../../data/associations/catalog";

import {
  season4AssociationDraw,
} from "../../../../data/associations/season-4-draw";

import {
  players,
} from "../../../../data/players";

/*
  ========================================
  PLAYER NAME
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
      Поки готуємо Сезон 4.
    */

    if (
      body.season !== 4
    ) {
      return NextResponse.json(
        {
          error:
            "Preview жеребкування зараз налаштований для Сезону 4",
        },
        {
          status: 400,
        }
      );
    }

    const season = 4;

    /*
      ========================================
      РАНГИ МАЮТЬ БУТИ ЗАФІКСОВАНІ
      ========================================
    */

    const ranks =
      await getSeasonAssociationRanks(
        season
      );

    if (
      ranks.length !== 48
    ) {
      return NextResponse.json(
        {
          success: false,

          ready: false,

          season,

          frozenRanks:
            ranks.length,

          required:
            48,

          message:
            "Спочатку потрібно зафіксувати 48 рангів R1–R6",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      8 АСОЦІАЦІЙ
      ========================================
    */

    if (
      season4AssociationDraw.length !==
      associationCatalog.length
    ) {
      return NextResponse.json(
        {
          success: false,

          ready: false,

          season,

          associationsInDraw:
            season4AssociationDraw.length,

          requiredAssociations:
            associationCatalog.length,

          expectedAssociations:
            associationCatalog,

          message:
            `У жеребкуванні повинно бути ${associationCatalog.length} Асоціацій`,
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      ASSOCIATION IDS
      ========================================
    */

    const validAssociationIds =
      new Set(
        associationCatalog.map(
          (association) =>
            association.id
        )
      );

    const drawAssociationIds =
      season4AssociationDraw.map(
        (association) =>
          association.associationId
      );

    const uniqueAssociationIds =
      new Set(
        drawAssociationIds
      );

    if (
      uniqueAssociationIds.size !==
      associationCatalog.length
    ) {
      return NextResponse.json(
        {
          error:
            "У жеребкуванні є дублікати Асоціацій",
        },
        {
          status: 400,
        }
      );
    }

    const unknownAssociations =
      drawAssociationIds.filter(
        (associationId) =>
          !validAssociationIds.has(
            associationId
          )
      );

    if (
      unknownAssociations.length >
      0
    ) {
      return NextResponse.json(
        {
          error:
            "У жеребкуванні є невідомі Асоціації",

          unknownAssociations,

          expectedAssociations:
            associationCatalog,
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      PLAYER MAP
      ========================================
    */

    const rankMap =
      new Map(
        ranks.map(
          (row) => [
            row.playerId,
            row,
          ]
        )
      );

    /*
      ========================================
      УСІ 48 ГРАВЦІВ
      ========================================
    */

    const allDrawPlayerIds =
      season4AssociationDraw.flatMap(
        (association) =>
          association.playerIds
      );

    if (
      allDrawPlayerIds.length !==
      48
    ) {
      return NextResponse.json(
        {
          error:
            `У жеребкуванні повинно бути рівно 48 призначень. Зараз: ${allDrawPlayerIds.length}`,
        },
        {
          status: 400,
        }
      );
    }

    const uniquePlayers =
      new Set(
        allDrawPlayerIds
      );

    if (
      uniquePlayers.size !==
      48
    ) {
      return NextResponse.json(
        {
          error:
            "Один або кілька гравців присутні у двох Асоціаціях",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      ЧИ ВСІ ГРАВЦІ МАЮТЬ РАНГ
      ========================================
    */

    const unknownPlayers =
      allDrawPlayerIds.filter(
        (playerId) =>
          !rankMap.has(
            playerId
          )
      );

    if (
      unknownPlayers.length >
      0
    ) {
      return NextResponse.json(
        {
          error:
            "У жеребкуванні є гравці без зафіксованого рангу",

          unknownPlayers,
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      ЧИ ВСІ 48 З RANK SNAPSHOT
      ПОТРАПИЛИ В ЖЕРЕБКУВАННЯ
      ========================================
    */

    const missingPlayers =
      ranks
        .filter(
          (row) =>
            !uniquePlayers.has(
              row.playerId
            )
        )
        .map(
          (row) =>
            row.playerId
        );

    if (
      missingPlayers.length >
      0
    ) {
      return NextResponse.json(
        {
          error:
            "Не всі учасники Сезону 4 потрапили до жеребкування",

          missingPlayers,
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      ПЕРЕВІРКА КОЖНОЇ АСОЦІАЦІЇ
      ========================================
    */

    const errors:
      string[] = [];

    const preview =
      season4AssociationDraw.map(
        (drawAssociation) => {
          const catalogAssociation =
            associationCatalog.find(
              (association) =>
                association.id ===
                drawAssociation.associationId
            );

          /*
            Має бути 6 гравців.
          */

          if (
            drawAssociation.playerIds.length !==
            6
          ) {
            errors.push(
              `${catalogAssociation?.name ?? drawAssociation.associationId}: ${drawAssociation.playerIds.length} гравців замість 6`
            );
          }

          const members =
            drawAssociation.playerIds.map(
              (playerId) => {
                const seed =
                  rankMap.get(
                    playerId
                  );

                return {
                  playerId,

                  playerName:
                    getPlayerName(
                      playerId
                    ),

                  rank:
                    seed
                      ? getAssociationRankLabel(
                          seed.rank
                        )
                      : null,

                  rankNumber:
                    seed?.rank ??
                    null,

                  seedPosition:
                    seed?.seedPosition ??
                    null,

                  coefficient:
                    seed?.sourceCoefficient ??
                    null,
                };
              }
            );

          /*
            Перевіряємо:
            1 × R1
            ...
            1 × R6
          */

          for (
            let rank = 1;
            rank <= 6;
            rank += 1
          ) {
            const count =
              members.filter(
                (member) =>
                  member.rankNumber ===
                  rank
              ).length;

            if (
              count !== 1
            ) {
              errors.push(
                `${catalogAssociation?.name ?? drawAssociation.associationId}: R${rank} = ${count}`
              );
            }
          }

          /*
            Для красивого Preview
            показуємо R1 -> R6.
          */

          members.sort(
            (a, b) =>
              (a.rankNumber ?? 99) -
              (b.rankNumber ?? 99)
          );

          return {
            associationId:
              drawAssociation.associationId,

            associationName:
              catalogAssociation?.name ??
              drawAssociation.associationId,

            members,
          };
        }
      );

    /*
      ========================================
      RESULT
      ========================================
    */

    if (
      errors.length >
      0
    ) {
      return NextResponse.json(
        {
          success: false,

          ready: false,

          readonly: true,

          season,

          errors,

          preview,
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json({
      success: true,

      ready: true,

      readonly: true,

      season,

      associations:
        preview.length,

      players:
        allDrawPlayerIds.length,

      message:
        "Жеребкування повністю валідне і готове до фіксації",

      preview,
    });
  } catch (error) {
    console.error(
      "ASSOCIATION DRAW PREVIEW ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Помилка Preview жеребкування",
      },
      {
        status: 500,
      }
    );
  }
}