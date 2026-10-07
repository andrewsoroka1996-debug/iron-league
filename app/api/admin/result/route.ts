import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { divisionSchedule } from "../../../../data/division-schedule";

type SeasonNumber = 1 | 2 | 3 | 4;
type DivisionNumber = 1 | 2 | 3 | 4;

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

    // 1. Перевіряємо пароль адміністратора
    // Пароль береться автоматично з:
    // ADMIN_PASSWORD=66666666
    // у твоєму .env.local
    //
    // У себе ти замінив 66666666
    // на справжній пароль.
    if (
      !process.env.ADMIN_PASSWORD ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return NextResponse.json(
        {
          error: "Невірний пароль адміністратора",
        },
        {
          status: 401,
        }
      );
    }

    // 2. Перевіряємо сезон
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

    // 3. Перевіряємо дивізіон
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

    // 4. Перевіряємо тур
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

    // 5. Перевіряємо рахунок
    if (
      !Number.isInteger(home_goals) ||
      !Number.isInteger(away_goals) ||
      home_goals < 0 ||
      away_goals < 0
    ) {
      return NextResponse.json(
        {
          error: "Невірно введено рахунок",
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

    // 6. Перевіряємо, що тур реально є
    // у division-schedule.ts
    const selectedRound =
      divisionSchedule[seasonNumber][
        divisionNumber
      ].find(
        (item) => item.round === round
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

    // 7. Перевіряємо, що обрана пара
    // реально є у цьому турі
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

    // 8. Шукаємо, чи цей матч уже має
    // результат у Supabase
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

    // 9. Якщо результат уже існує,
    // оновлюємо його
    if (existingMatch) {
      const { error: updateError } =
        await supabaseAdmin
          .from("matches")
          .update({
            home_goals,
            away_goals,
            status: "finished",
            played_at:
              new Date().toISOString(),
          })
          .eq("id", existingMatch.id);

      if (updateError) {
        return NextResponse.json(
          {
            error: updateError.message,
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Результат оновлено",
      });
    }

    // 10. Якщо результату ще немає,
    // створюємо новий запис
    const { error: insertError } =
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

    if (insertError) {
      return NextResponse.json(
        {
          error: insertError.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Результат збережено",
    });
  } catch (error) {
    console.error(
      "SAVE RESULT ERROR:",
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