import { NextResponse } from "next/server";

import {
  getSeasonAssociationSquads,
} from "../../../../lib/association-squads";

import {
  getSeasonAssociationRankMap,
} from "../../../../lib/association-ranks";
import {
  getSeasonPlayerReplacements,
} from "../../../../lib/player-replacements";

/*
  ========================================
  GET
  ========================================

  Повертає склади Асоціацій.

  Сезон 2:
  історичні склади,
  рангів немає.

  Сезон 3+:
  додатково повертаємо
  зафіксований R1–R6.
*/

export async function GET(
  request: Request
) {
  try {
    const {
      searchParams,
    } = new URL(
      request.url
    );

    const season =
      Number(
        searchParams.get(
          "season"
        )
      );

    /*
      ========================================
      VALIDATION
      ========================================
    */

    if (
      !Number.isInteger(
        season
      ) ||
      season < 2 ||
      season > 4
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Невірний сезон",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      СКЛАДИ
      ========================================
    */

    const associations =
      await getSeasonAssociationSquads(
        season
      );

    /*
      ========================================
      РАНГИ
      ========================================

      Для Сезону 2 рангів
      ще не використовували.

      Для Сезону 3+ беремо
      snapshot R1–R6.
    */

    const rankMap =
      season >= 3
        ? await getSeasonAssociationRankMap(
            season
          )
        : new Map();
/*
  ========================================
  УСПАДКУВАННЯ РАНГІВ ПІСЛЯ ЗАМІНИ
  ========================================
*/

if (season === 3) {
  const replacements =
    await getSeasonPlayerReplacements(
      season
    );

  for (const replacement of replacements) {
    const previousRank =
      rankMap.get(
        replacement.outgoing_player_id
      );

    if (previousRank) {
      rankMap.set(
        replacement.incoming_player_id,
        previousRank
      );
    }
  }
}
    /*
      ========================================
      RESPONSE
      ========================================
    */

    return NextResponse.json({
      success: true,

      season,

      associations:
        associations.map(
          (
            association
          ) => ({
            id:
              association.id,

            name:
              association.name,

            /*
              Залишаємо старий
              players для сумісності
              з існуючою формою.
            */

            players: [
              ...association.players,
            ],

            /*
              Новий формат.

              Він дозволить формі
              автоматично знайти:

              R1 vs R1
              R2 vs R2
              ...
              R6 vs R6
            */

            members:
              association.players.map(
                (
                  playerId
                ) => {
                  const rankRow =
                    rankMap.get(
                      playerId
                    );

                  return {
                    playerId,

                    rank:
                      rankRow?.rank ??
                      null,
                  };
                }
              ),
          })
        ),
    });
  } catch (error) {
    console.error(
      "ASSOCIATION SQUADS API ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Помилка завантаження складів Асоціацій",
      },
      {
        status: 500,
      }
    );
  }
}