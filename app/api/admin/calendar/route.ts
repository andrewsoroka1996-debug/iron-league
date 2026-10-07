import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { generateRoundRobin } from "../../../../lib/generateRoundRobin";
import { season4 } from "../../../../data/seasons/season-4";

type DivisionNumber = 1 | 2 | 3 | 4;

function getSeason4DivisionPlayers(
  division: DivisionNumber
): readonly string[] {
  if (division === 1) {
    return season4.division1.players;
  }

  if (division === 2) {
    return season4.division2.players;
  }

  if (division === 3) {
    return season4.division3.players;
  }

  return season4.division4.players;
}

/*
  Одноразове випадкове перемішування
  перед генерацією календаря.
*/
function shufflePlayers(
  playerIds: readonly string[]
) {
  const result = [...playerIds];

  for (
    let i = result.length - 1;
    i > 0;
    i--
  ) {
    const j = Math.floor(
      Math.random() * (i + 1)
    );

    [result[i], result[j]] = [
      result[j],
      result[i],
    ];
  }

  return result;
}

/*
  GET

  Повертає календар певного
  сезону та дивізіону з Supabase.
*/
export async function GET(
  request: Request
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const season = Number(
      searchParams.get("season")
    );

    const division = Number(
      searchParams.get("division")
    );

    if (
      !Number.isInteger(season) ||
      season < 1 ||
      season > 4
    ) {
      return NextResponse.json(
        {
          error: "Невірний сезон",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(division) ||
      division < 1 ||
      division > 4
    ) {
      return NextResponse.json(
        {
          error: "Невірний дивізіон",
        },
        {
          status: 400,
        }
      );
    }

    const { data, error } =
      await supabaseAdmin
        .from("matches")
        .select(
          `
            id,
            season,
            division,
            round,
            home_id,
            away_id,
            home_goals,
            away_goals,
            status
          `
        )
        .eq(
          "competition",
          "division"
        )
        .eq(
          "season",
          season
        )
        .eq(
          "division",
          division
        )
        .order(
          "round",
          {
            ascending: true,
          }
        );

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      matches: data ?? [],
    });
  } catch (error) {
    console.error(
      "CALENDAR GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Помилка завантаження календаря",
      },
      {
        status: 500,
      }
    );
  }
}

/*
  POST

  Має два режими:

  action = "manual"
  → ручне додавання матчу
    для Сезонів 1–3

  action = "generate"
  → автоматичне жеребкування
    Сезону 4
*/
export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const {
      password,
      action,
    } = body;

    /*
      ADMIN_PASSWORD береться
      із .env.local.
    */
    if (
      !process.env.ADMIN_PASSWORD ||
      password !==
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
      =========================
      РУЧНЕ ДОДАВАННЯ
      СЕЗОНИ 1–3
      =========================
    */
    if (action === "manual") {
      const {
        season,
        division,
        round,
        home_id,
        away_id,
      } = body;

      if (
        !Number.isInteger(season) ||
        season < 1 ||
        season > 3
      ) {
        return NextResponse.json(
          {
            error:
              "Ручний календар призначений для Сезонів 1–3",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !Number.isInteger(division) ||
        division < 1 ||
        division > 4
      ) {
        return NextResponse.json(
          {
            error:
              "Невірний дивізіон",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !Number.isInteger(round) ||
        round < 1
      ) {
        return NextResponse.json(
          {
            error:
              "Невірний номер туру",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !home_id ||
        !away_id
      ) {
        return NextResponse.json(
          {
            error:
              "Оберіть обох гравців",
          },
          {
            status: 400,
          }
        );
      }

      if (
        home_id === away_id
      ) {
        return NextResponse.json(
          {
            error:
              "Гравець не може грати сам із собою",
          },
          {
            status: 400,
          }
        );
      }

      const {
        error: insertError,
      } = await supabaseAdmin
        .from("matches")
        .insert({
          season,
          competition:
            "division",

          division,
          round,

          participant_type:
            "player",

          home_id,
          away_id,

          home_goals: null,
          away_goals: null,

          status:
            "scheduled",

          played_at: null,
        });

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

      return NextResponse.json({
        success: true,
        message:
          "Матч додано до календаря",
      });
    }

    /*
      =========================
      АВТОМАТИЧНЕ ЖЕРЕБКУВАННЯ
      СЕЗОН 4
      =========================
    */
    if (action === "generate") {
      const {
        season,
        division,
      } = body;

      if (season !== 4) {
        return NextResponse.json(
          {
            error:
              "Автоматичне жеребкування зараз дозволене тільки для Сезону 4",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !Number.isInteger(division) ||
        division < 1 ||
        division > 4
      ) {
        return NextResponse.json(
          {
            error:
              "Невірний дивізіон",
          },
          {
            status: 400,
          }
        );
      }

      const divisionNumber =
        division as DivisionNumber;

      const playerIds =
        getSeason4DivisionPlayers(
          divisionNumber
        );

      /*
        Для нашого формату
        має бути рівно 16 гравців.
      */
      if (
        playerIds.length !== 16
      ) {
        return NextResponse.json(
          {
            error:
              `У ${division} Дивізіоні зараз ${playerIds.length} гравців. Для жеребкування потрібно 16.`,
          },
          {
            status: 400,
          }
        );
      }

      /*
        Перевіряємо, чи календар
        уже існує.

        Повторно жеребкувати
        автоматично не дозволяємо.
      */
      const {
        data: existing,
        error: existingError,
      } = await supabaseAdmin
        .from("matches")
        .select("id")
        .eq(
          "season",
          4
        )
        .eq(
          "competition",
          "division"
        )
        .eq(
          "division",
          division
        )
        .limit(1);

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
        existing &&
        existing.length > 0
      ) {
        return NextResponse.json(
          {
            error:
              "Для цього дивізіону календар уже створено",
          },
          {
            status: 409,
          }
        );
      }

      /*
        1. Один раз випадково
           перемішуємо 16 гравців.

        2. Створюємо round-robin.

        3. Тури 16–30 є дзеркалом
           турів 1–15.
      */
      const shuffledPlayers =
        shufflePlayers(
          playerIds
        );

      const rounds =
        generateRoundRobin(
          shuffledPlayers,
          {
            prefix:
              `s4-d${division}`,
          }
        );

      const rows =
        rounds.flatMap(
          (round) =>
            round.matches.map(
              (match) => ({
                season: 4,

                competition:
                  "division",

                division,

                round:
                  round.round,

                participant_type:
                  "player",

                home_id:
                  match.home,

                away_id:
                  match.away,

                home_goals:
                  null,

                away_goals:
                  null,

                status:
                  "scheduled",

                played_at:
                  null,
              })
            )
        );

      /*
        Для 16 гравців:
        30 турів × 8 матчів
        = 240 записів.
      */
      if (
        rows.length !== 240
      ) {
        return NextResponse.json(
          {
            error:
              `Помилка генератора: створено ${rows.length} матчів замість 240`,
          },
          {
            status: 500,
          }
        );
      }

      const {
        error: insertError,
      } = await supabaseAdmin
        .from("matches")
        .insert(rows);

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

      return NextResponse.json({
        success: true,

        message:
          `Календар ${division} Дивізіону Сезону 4 створено`,

        rounds: 30,
        matches: 240,
      });
    }

    return NextResponse.json(
      {
        error:
          "Невідома дія",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    console.error(
      "CALENDAR POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Помилка сервера",
      },
      {
        status: 500,
      }
    );
  }
}