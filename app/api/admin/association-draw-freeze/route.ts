import { NextResponse } from "next/server";

import {
  getSeasonAssociationRanks,
  validateAssociationRankBalance,
} from "../../../../lib/association-ranks";

import {
  supabaseAdmin,
} from "../../../../lib/supabase-admin";

import {
  associationCatalog,
} from "../../../../data/associations/catalog";

import {
  season4AssociationDraw,
} from "../../../../data/associations/season-4-draw";

import {
  players,
} from "../../../../data/players";

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
      ADMIN
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
    */

    if (
      body.season !== 4
    ) {
      return NextResponse.json(
        {
          error:
            "Фіксація жеребкування зараз налаштована для Сезону 4",
        },
        {
          status: 400,
        }
      );
    }

    const season = 4;

    /*
      ========================================
      ЗАФІКСОВАНІ РАНГИ
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

          frozenRanks:
            ranks.length,

          error:
            "Спочатку потрібно зафіксувати всі 48 рангів R1–R6",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      ЗАХИСТ ВІД ПОВТОРНОЇ ФІКСАЦІЇ
      ========================================
    */

    const alreadyAssigned =
      ranks.filter(
        (row) =>
          row.associationId !==
          null
      );

    if (
      alreadyAssigned.length >
      0
    ) {
      return NextResponse.json(
        {
          success: false,
          frozen: true,

          assignedPlayers:
            alreadyAssigned.length,

          error:
            `Жеребкування Сезону ${season} вже почало або завершило фіксацію`,
        },
        {
          status: 409,
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

          associations:
            season4AssociationDraw.length,

          required:
            associationCatalog.length,

          error:
            `Потрібно заповнити всі ${associationCatalog.length} Асоціацій`,
        },
        {
          status: 400,
        }
      );
    }

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

    /*
      ========================================
      ДУБЛІ АСОЦІАЦІЙ
      ========================================
    */

    if (
      new Set(
        drawAssociationIds
      ).size !==
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

    /*
      ========================================
      НЕВІДОМІ АСОЦІАЦІЇ
      ========================================
    */

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
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      RANK MAP
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
      УСІ ГРАВЦІ ЖЕРЕБКУВАННЯ
      ========================================
    */

    const allDrawPlayers =
      season4AssociationDraw.flatMap(
        (association) =>
          association.playerIds
      );

    if (
      allDrawPlayers.length !==
      48
    ) {
      return NextResponse.json(
        {
          error:
            `У жеребкуванні має бути рівно 48 гравців. Зараз: ${allDrawPlayers.length}`,
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      ДУБЛІ ГРАВЦІВ
      ========================================
    */

    const uniquePlayers =
      new Set(
        allDrawPlayers
      );

    if (
      uniquePlayers.size !==
      48
    ) {
      return NextResponse.json(
        {
          error:
            "Один або кілька гравців потрапили до двох Асоціацій",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      НЕВІДОМІ ГРАВЦІ
      ========================================
    */

    const unknownPlayers =
      allDrawPlayers.filter(
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
      ЧИ ВСІ 48 ПОТРАПИЛИ В DRAW
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
            "Не всі гравці стартового рейтингу потрапили до Асоціацій",

          missingPlayers,
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      ПЕРЕВІРКА R1–R6
      ========================================
    */

    const errors:
      string[] = [];

    for (
      const association of
      season4AssociationDraw
    ) {
      const catalogAssociation =
        associationCatalog.find(
          (item) =>
            item.id ===
            association.associationId
        );

      const associationName =
        catalogAssociation?.name ??
        association.associationId;

      if (
        association.playerIds.length !==
        6
      ) {
        errors.push(
          `${associationName}: ${association.playerIds.length} гравців замість 6`
        );

        continue;
      }

      for (
        let rank = 1;
        rank <= 6;
        rank += 1
      ) {
        const count =
          association.playerIds.filter(
            (playerId) =>
              rankMap.get(
                playerId
              )?.rank === rank
          ).length;

        if (
          count !== 1
        ) {
          errors.push(
            `${associationName}: R${rank} = ${count}`
          );
        }
      }
    }

    if (
      errors.length >
      0
    ) {
      return NextResponse.json(
        {
          success: false,
          ready: false,
          errors,
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      PLAYER -> ASSOCIATION
      ========================================
    */

    const associationByPlayer =
      new Map<
        string,
        string
      >();

    for (
      const association of
      season4AssociationDraw
    ) {
      for (
        const playerId of
        association.playerIds
      ) {
        associationByPlayer.set(
          playerId,
          association.associationId
        );
      }
    }

    /*
      ========================================
      ОДИН BULK UPSERT

      Зберігаємо старі:
      rank
      seed_position
      source_coefficient
      source_season

      Міняємо тільки:
      association_id
      ========================================
    */

    const rows =
      ranks.map(
        (row) => ({
          season:
            row.season,

          player_id:
            row.playerId,

          rank:
            row.rank,

          seed_position:
            row.seedPosition,

          source_coefficient:
            row.sourceCoefficient,

          source_season:
            row.sourceSeason,

          association_id:
            associationByPlayer.get(
              row.playerId
            ) ?? null,
        })
      );

    const {
      error:
        upsertError,
    } =
      await supabaseAdmin
        .from(
          "association_seed_ranks"
        )
        .upsert(
          rows,
          {
            onConflict:
              "season,player_id",
          }
        );

    if (upsertError) {
      throw new Error(
        upsertError.message
      );
    }

    /*
      ========================================
      КОНТРОЛЬ ПІСЛЯ ЗАПИСУ
      ========================================
    */

    const validation =
      await validateAssociationRankBalance(
        season
      );

    if (
      !validation.valid ||
      validation.associations !==
        associationCatalog.length
    ) {
      return NextResponse.json(
        {
          success: false,

          frozen: true,

          warning:
            "Дані записані, але контрольна перевірка не пройшла",

          validation,
        },
        {
          status: 500,
        }
      );
    }

    /*
      ========================================
      RESPONSE
      ========================================
    */

    const result =
      season4AssociationDraw.map(
        (association) => ({
          associationId:
            association.associationId,

          associationName:
            associationCatalog.find(
              (item) =>
                item.id ===
                association.associationId
            )?.name ??
            association.associationId,

          players:
            association.playerIds
              .map(
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
                        ? `R${seed.rank}`
                        : null,
                  };
                }
              )
              .sort(
                (a, b) => {
                  const rankA =
                    Number(
                      a.rank?.replace(
                        "R",
                        ""
                      ) ??
                        99
                    );

                  const rankB =
                    Number(
                      b.rank?.replace(
                        "R",
                        ""
                      ) ??
                        99
                    );

                  return (
                    rankA -
                    rankB
                  );
                }
              ),
        })
      );

    return NextResponse.json({
      success: true,

      frozen: true,

      season,

      associations:
        result.length,

      players: 48,

      validation,

      message:
        `Жеребкування Асоціацій Сезону ${season} успішно зафіксоване`,

      result,
    });
  } catch (error) {
    console.error(
      "ASSOCIATION DRAW FREEZE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Помилка фіксації жеребкування",
      },
      {
        status: 500,
      }
    );
  }
}