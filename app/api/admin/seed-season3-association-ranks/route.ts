import { NextResponse } from "next/server";

import {
  getCompetitionAssociations,
} from "../../../../data/competitions/get-competition-associations";

import {
  supabaseAdmin,
} from "../../../../lib/supabase-admin";

/*
  ========================================
  ФАКТИЧНІ R1 СЕЗОНУ 3
  ========================================

  Не прив'язуємося до ID
  Асоціацій типу fra / france.

  Просто перевіряємо, що
  перший гравець кожної
  Асоціації є одним із
  восьми реальних R1.
*/

const SEASON_3_R1_PLAYERS =
  new Set<string>([
    "gadyuka-88",
    "19lenya19",
    "mykhaok",
    "no-stress23",
    "parabellum",
    "proevolution10",
    "andrew-sm",
    "volodyabes",
  ]);

/*
  ========================================
  POST

  Одноразова міграція
  фактичних рангів Сезону 3.

  Порядок у складі:

  index 0 -> R1
  index 1 -> R2
  index 2 -> R3
  index 3 -> R4
  index 4 -> R5
  index 5 -> R6
  ========================================
*/

export async function POST(
  request: Request
) {
  try {
    /*
      ========================================
      ПАРОЛЬ
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
      ЧИ ВЖЕ Є РАНГИ СЕЗОНУ 3
      ========================================
    */

    const {
      count,
      error: countError,
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
          3
        );

    if (countError) {
      return NextResponse.json(
        {
          error:
            countError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (
      (count ?? 0) >
      0
    ) {
      return NextResponse.json(
        {
          error:
            "Ранги Сезону 3 вже зафіксовані",

          existingRows:
            count,
        },
        {
          status: 409,
        }
      );
    }

    /*
      ========================================
      СКЛАДИ АСОЦІАЦІЙ СЕЗОНУ 3
      ========================================
    */

    const associations =
      getCompetitionAssociations({
        season: 3,

        competition:
          "associations-cup",
      });

    /*
      Має бути:

      8 Асоціацій
      ×
      6 гравців
      =
      48 гравців
    */

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
      ПЕРЕВІРКА КОЖНОЇ АСОЦІАЦІЇ
      ========================================
    */

    const actualR1Players =
      new Set<string>();

    for (
      const association of
      associations
    ) {
      /*
        У кожній Асоціації
        повинно бути 6 гравців.
      */

      if (
        association.players
          .length !==
        6
      ) {
        return NextResponse.json(
          {
            error:
              `${association.name}: повинно бути 6 гравців, зараз ${association.players.length}`,

            associationId:
              association.id,
          },
          {
            status: 400,
          }
        );
      }

      /*
        Перший гравець
        у масиві повинен
        бути R1.
      */

      const actualR1 =
        association.players[0];

      if (
        !actualR1 ||
        !SEASON_3_R1_PLAYERS.has(
          actualR1
        )
      ) {
        return NextResponse.json(
          {
            error:
              `Неправильний R1 у складі ${association.name}`,

            associationId:
              association.id,

            actualR1:
              actualR1 ??
              null,

            expected:
              Array.from(
                SEASON_3_R1_PLAYERS
              ),
          },
          {
            status: 400,
          }
        );
      }

      /*
        Один і той самий R1
        не може бути у двох
        Асоціаціях.
      */

      if (
        actualR1Players.has(
          actualR1
        )
      ) {
        return NextResponse.json(
          {
            error:
              `R1 ${actualR1} зустрічається більше одного разу`,
          },
          {
            status: 400,
          }
        );
      }

      actualR1Players.add(
        actualR1
      );
    }

    /*
      ========================================
      ПЕРЕВІРКА ВСІХ 8 R1
      ========================================
    */

    if (
      actualR1Players.size !==
      8
    ) {
      return NextResponse.json(
        {
          error:
            `Знайдено ${actualR1Players.size} R1 замість 8`,
        },
        {
          status: 400,
        }
      );
    }

    for (
      const expectedR1 of
      SEASON_3_R1_PLAYERS
    ) {
      if (
        !actualR1Players.has(
          expectedR1
        )
      ) {
        return NextResponse.json(
          {
            error:
              `У складах відсутній R1 ${expectedR1}`,
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
      ========================================
      ВСІ 48 ГРАВЦІВ
      ========================================
    */

    const allPlayers =
      associations.flatMap(
        (association) =>
          association.players
      );

    if (
      allPlayers.length !==
      48
    ) {
      return NextResponse.json(
        {
          error:
            `Очікувалося 48 гравців, знайдено ${allPlayers.length}`,
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      ПЕРЕВІРКА ДУБЛІКАТІВ
      ========================================
    */

    const uniquePlayers =
      new Set(
        allPlayers
      );

    if (
      uniquePlayers.size !==
      48
    ) {
      const duplicates =
        allPlayers.filter(
          (
            playerId,
            index
          ) =>
            allPlayers.indexOf(
              playerId
            ) !== index
        );

      return NextResponse.json(
        {
          error:
            "У складах Асоціацій є дублікати гравців",

          duplicates:
            Array.from(
              new Set(
                duplicates
              )
            ),
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      ФОРМУЄМО SNAPSHOT
      ========================================

      У season3.associations
      порядок уже історично
      зафіксований:

      0 = R1
      1 = R2
      2 = R3
      3 = R4
      4 = R5
      5 = R6

      Точний seed_position
      для старого сезону
      не вигадуємо.

      source_coefficient
      також не вигадуємо.
    */

    const rows =
      associations.flatMap(
        (association) =>
          association.players.map(
            (
              playerId,
              index
            ) => ({
              season:
                3,

              player_id:
                playerId,

              rank:
                index +
                1,

              seed_position:
                null,

              source_coefficient:
                0,

              source_season:
                2,

              association_id:
                association.id,
            })
          )
      );

    /*
      ========================================
      ДОДАТКОВА ПЕРЕВІРКА РАНГІВ

      Кожного рангу
      повинно бути по 8.
      ========================================
    */

    for (
      let rank = 1;
      rank <= 6;
      rank += 1
    ) {
      const rankPlayers =
        rows.filter(
          (row) =>
            row.rank ===
            rank
        );

      if (
        rankPlayers.length !==
        8
      ) {
        return NextResponse.json(
          {
            error:
              `R${rank}: очікувалося 8 гравців, знайдено ${rankPlayers.length}`,
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
      ========================================
      INSERT
      ========================================
    */

    const {
      error:
        insertError,
    } =
      await supabaseAdmin
        .from(
          "association_seed_ranks"
        )
        .insert(
          rows
        );

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
      ВІДПОВІДЬ
      ========================================
    */

    const rankCounts =
      Array.from(
        {
          length: 6,
        },
        (
          _,
          index
        ) => {
          const rank =
            index +
            1;

          return {
            rank:
              `R${rank}`,

            players:
              rows.filter(
                (row) =>
                  row.rank ===
                  rank
              ).length,
          };
        }
      );

    return NextResponse.json({
      success: true,

      season: 3,

      associations:
        associations.length,

      players:
        rows.length,

      rankCounts,

      message:
        "Ранги Сезону 3 успішно зафіксовані",
    });
  } catch (error) {
    console.error(
      "SEED SEASON 3 ASSOCIATION RANKS ERROR:",
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