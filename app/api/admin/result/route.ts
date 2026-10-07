import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { divisionSchedule } from "../../../../data/division-schedule";

type SeasonNumber = 1 | 2 | 3 | 4;
type DivisionNumber = 1 | 2 | 3 | 4;

/*
  GET
  Отримує вже збережений результат матчу
*/
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const season = Number(
      searchParams.get("season")
    );

    const division = Number(
      searchParams.get("division")
    );

    const round = Number(
      searchParams.get("round")
    );

    const homeId =
      searchParams.get("home_id");

    const awayId =
      searchParams.get("away_id");

    if (
      !season ||
      !division ||
      !round ||
      !homeId ||
      !awayId
    ) {
      return NextResponse.json(
        {
          error: "Недостатньо даних",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("matches")
      .select(
        `
          id,
          home_goals,
          away_goals,
          status
        `
      )
      .eq("season", season)
      .eq("competition", "division")
      .eq("division", division)
      .eq("round", round)
      .eq("home_id", homeId)
      .eq("away_id", awayId)
      .limit(1);

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

    const match =
      data?.[0] ?? null;

    return NextResponse.json({
      match,
    });
  } catch {
    return NextResponse.json(
      {
        error: "Помилка сервера",
      },
      {
        status: 500,
      }
    );
  }
}

/*
  POST
  Створює або оновлює результат
*/
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      password,
      season,
      division,
      round,
      home_id,
      away_id,
      home_goals,
      away_goals,
    } = body;

    /*
      ADMIN_PASSWORD береться
      автоматично з .env.local
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

    if (
      !Number.isInteger(round) ||
      round < 1
    ) {
      return NextResponse.json(
        {
          error: "Невірний тур",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(home_goals) ||
      !Number.isInteger(away_goals) ||
      home_goals < 0 ||
      away_goals < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Невірно введено рахунок",
        },
        {
          status: 400,
        }
      );
    }

    const seasonNumber =
      season as SeasonNumber;

    const divisionNumber =
      division as DivisionNumber;

    /*
      Перевіряємо тур
    */
    const selectedRound =
      divisionSchedule[seasonNumber][
        divisionNumber
      ].find(
        (item) =>
          item.round === round
      );

    if (!selectedRound) {
      return NextResponse.json(
        {
          error:
            "Такий тур відсутній у календарі",
        },
        {
          status: 400,
        }
      );
    }

    /*
      Перевіряємо матч
    */
    const scheduledMatch =
      selectedRound.matches.find(
        (match) =>
          match.home === home_id &&
          match.away === away_id
      );

    if (!scheduledMatch) {
      return NextResponse.json(
        {
          error:
            "Такий матч відсутній у календарі цього туру",
        },
        {
          status: 400,
        }
      );
    }

    /*
      Шукаємо існуючий результат
    */
    const {
      data: existingMatches,
      error: findError,
    } = await supabaseAdmin
      .from("matches")
      .select("id")
      .eq("season", season)
      .eq("competition", "division")
      .eq("division", division)
      .eq("round", round)
      .eq("home_id", home_id)
      .eq("away_id", away_id)
      .limit(1);

    if (findError) {
      return NextResponse.json(
        {
          error: findError.message,
        },
        {
          status: 500,
        }
      );
    }

    const existingMatch =
      existingMatches?.[0];

    /*
      ОНОВЛЕННЯ
    */
    if (existingMatch) {
      const { error } =
        await supabaseAdmin
          .from("matches")
          .update({
            home_goals,
            away_goals,
            status: "finished",
            played_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            existingMatch.id
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
        success: true,
        updated: true,
        message:
          "Результат оновлено",
      });
    }

    /*
      НОВИЙ РЕЗУЛЬТАТ
    */
    const { error } =
      await supabaseAdmin
        .from("matches")
        .insert({
          season,
          competition: "division",
          division,
          round,
          participant_type: "player",
          home_id,
          away_id,
          home_goals,
          away_goals,
          status: "finished",
          played_at:
            new Date().toISOString(),
        });

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
      success: true,
      updated: false,
      message:
        "Результат збережено",
    });
  } catch (error) {
    console.error(
      "RESULT API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: "Помилка сервера",
      },
      {
        status: 500,
      }
    );
  }
}