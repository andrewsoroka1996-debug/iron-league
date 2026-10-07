import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

/*
  GET
  Завантажує вже збережений матч/результат
  із Supabase.
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

    return NextResponse.json({
      match: data?.[0] ?? null,
    });
  } catch (error) {
    console.error(
      "GET RESULT ERROR:",
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

/*
  POST
  Вносить або змінює результат
  ВЖЕ ІСНУЮЧОГО матчу календаря.
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
      Пароль береться з .env.local:

      ADMIN_PASSWORD=66666666

      66666666 у тебе замінено
      на справжній пароль.
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
      Перевірка сезону
    */
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

    /*
      Перевірка дивізіону
    */
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

    /*
      Перевірка туру
    */
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

    /*
      Перевірка рахунку
    */
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

    /*
      Шукаємо матч безпосередньо
      в календарі Supabase.
    */
    const {
      data: matches,
      error: findError,
    } = await supabaseAdmin
      .from("matches")
      .select(
        `
          id,
          status
        `
      )
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

    const match =
      matches?.[0];

    /*
      Якщо матчу немає в Supabase,
      результат вводити заборонено.

      Спочатку матч повинен бути
      створений у календарі.
    */
    if (!match) {
      return NextResponse.json(
        {
          error:
            "Такий матч відсутній у календарі",
        },
        {
          status: 400,
        }
      );
    }

    /*
      Оновлюємо той самий запис:
      scheduled -> finished
    */
    const {
      error: updateError,
    } = await supabaseAdmin
      .from("matches")
      .update({
        home_goals,
        away_goals,

        status: "finished",

        played_at:
          new Date().toISOString(),
      })
      .eq("id", match.id);

    if (updateError) {
      return NextResponse.json(
        {
          error:
            updateError.message,
        },
        {
          status: 500,
        }
      );
    }

    const wasFinished =
      match.status === "finished";

    return NextResponse.json({
      success: true,

      updated: wasFinished,

      message: wasFinished
        ? "Результат оновлено"
        : "Результат збережено",
    });
  } catch (error) {
    console.error(
      "POST RESULT ERROR:",
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