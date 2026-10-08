import { randomUUID } from "crypto";

import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabase-admin";

import { calculateTwoLegSeries } from "../../../../lib/two-leg-series";

import { getCompetitionPlayers } from "../../../../data/competitions/get-competition-players";

import type { SeasonNumber } from "../../../../data/competitions/season-competitions";

/*
  ==========================================
  GET
  ==========================================

  Отримує двоматчеве протистояння
  через series_id і автоматично
  рахує загальний рахунок.
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

    const seriesId =
      searchParams.get("series_id");

    /*
      ==========================
      СЕЗОН
      ==========================
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
      ==========================
      SERIES ID
      ==========================
    */

    if (!seriesId) {
      return NextResponse.json(
        {
          error:
            "Не вказано ID протистояння",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ==========================
      ЗАВАНТАЖУЄМО МАТЧІ
      ==========================
    */

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("matches")
      .select(
        `
          id,
          season,
          competition,
          division,
          stage,
          group_name,
          round,
          leg,
          participant_type,
          home_id,
          away_id,
          home_goals,
          away_goals,
          status,
          played_at,
          series_id,
          series_home_id,
          series_away_id,
          is_tiebreak
        `
      )
      .eq(
        "season",
        season
      )
      .eq(
        "series_id",
        seriesId
      )
      .order(
        "leg",
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

    const matches =
      data ?? [];

    if (
      matches.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Протистояння не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    /*
      ==========================
      ПЕРШИЙ МАТЧ
      ==========================
    */

    const firstMatch =
      matches[0];

    const seriesHomeId =
      firstMatch.series_home_id;

    const seriesAwayId =
      firstMatch.series_away_id;

    if (
      !seriesHomeId ||
      !seriesAwayId
    ) {
      return NextResponse.json(
        {
          error:
            "У протистоянні не вказані учасники серії",
        },
        {
          status: 500,
        }
      );
    }

    /*
      ==========================
      РОЗРАХУНОК
      ==========================
    */

    const summary =
      calculateTwoLegSeries({
        seriesHomeId,
        seriesAwayId,

        matches:
          matches.map(
            (match) => ({
              id:
                match.id,

              home_id:
                match.home_id,

              away_id:
                match.away_id,

              home_goals:
                match.home_goals,

              away_goals:
                match.away_goals,

              status:
                match.status,

              leg:
                match.leg,
            })
          ),
      });

    /*
      ==========================
      RESPONSE
      ==========================
    */

    return NextResponse.json({
      success: true,

      series: {
        id:
          seriesId,

        season,

        competition:
          firstMatch.competition,

        stage:
          firstMatch.stage,

        home_id:
          seriesHomeId,

        away_id:
          seriesAwayId,
      },

      matches,

      summary,
    });
  } catch (error) {
    console.error(
      "TWO LEG SERIES GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Помилка завантаження двоматчевого протистояння",
      },
      {
        status: 500,
      }
    );
  }
}

/*
  ==========================================
  POST
  ==========================================

  Створює:

  Матч 1:
  A — B

  Матч 2:
  B — A

  Обидва мають один series_id.
*/

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const {
      password,

      season,
      competition,
      stage,

      home_id,
      away_id,
    } = body;

    /*
      ==========================
      ПАРОЛЬ
      ==========================
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
      ==========================
      СЕЗОН
      ==========================
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

    const seasonNumber =
      season as SeasonNumber;

    /*
      ==========================
      ТУРНІР
      ==========================
    */

    const allowedCompetitions = [
      "champions-league",
      "europa-league",
      "conference-league",
    ];

    if (
      !competition ||
      !allowedCompetitions.includes(
        competition
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Цей турнір не підтримує двоматчеву серію через цей API",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ==========================
      СТАДІЯ
      ==========================

      Поки:
      1/8
      1/4
      1/2

      Фінал налаштуємо окремо,
      коли остаточно зафіксуємо
      його формат.
    */

    const allowedStages = [
      "round-of-16",
      "quarterfinal",
      "semifinal",
    ];

    if (
      !stage ||
      !allowedStages.includes(
        stage
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Невірна стадія двоматчевого протистояння",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ==========================
      ГРАВЦІ
      ==========================
    */

    if (
      !home_id ||
      !away_id ||
      typeof home_id !== "string" ||
      typeof away_id !== "string"
    ) {
      return NextResponse.json(
        {
          error:
            "Оберіть двох гравців",
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

    /*
      ==========================
      УЧАСНИКИ ТУРНІРУ
      ==========================
    */

    const competitionPlayers =
      getCompetitionPlayers({
        season:
          seasonNumber,

        competition,

        groupName: null,
      });

    if (
      !competitionPlayers.includes(
        home_id
      )
    ) {
      return NextResponse.json(
        {
          error:
            `${home_id} не є учасником цього турніру`,
        },
        {
          status: 400,
        }
      );
    }

    if (
      !competitionPlayers.includes(
        away_id
      )
    ) {
      return NextResponse.json(
        {
          error:
            `${away_id} не є учасником цього турніру`,
        },
        {
          status: 400,
        }
      );
    }

    /*
      ==========================
      ДУБЛІКАТ — ПРЯМИЙ ПОРЯДОК
      ==========================
    */

    const {
      data: directSeries,
      error: directError,
    } = await supabaseAdmin
      .from("matches")
      .select("id")
      .eq(
        "season",
        season
      )
      .eq(
        "competition",
        competition
      )
      .eq(
        "stage",
        stage
      )
      .eq(
        "series_home_id",
        home_id
      )
      .eq(
        "series_away_id",
        away_id
      )
      .limit(1);

    if (directError) {
      return NextResponse.json(
        {
          error:
            directError.message,
        },
        {
          status: 500,
        }
      );
    }

    /*
      ==========================
      ДУБЛІКАТ — ЗВОРОТНИЙ ПОРЯДОК
      ==========================
    */

    const {
      data: reverseSeries,
      error: reverseError,
    } = await supabaseAdmin
      .from("matches")
      .select("id")
      .eq(
        "season",
        season
      )
      .eq(
        "competition",
        competition
      )
      .eq(
        "stage",
        stage
      )
      .eq(
        "series_home_id",
        away_id
      )
      .eq(
        "series_away_id",
        home_id
      )
      .limit(1);

    if (reverseError) {
      return NextResponse.json(
        {
          error:
            reverseError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (
      (directSeries?.length ?? 0) >
        0 ||
      (reverseSeries?.length ?? 0) >
        0
    ) {
      return NextResponse.json(
        {
          error:
            "Таке протистояння вже створене",
        },
        {
          status: 409,
        }
      );
    }

    /*
      ==========================
      SERIES ID
      ==========================
    */

    const seriesId =
      `s${season}-${competition}-${stage}-${randomUUID()}`;

    /*
      ==========================
      ОБИДВА МАТЧІ
      ==========================
    */

    const rows = [
      /*
        МАТЧ 1

        A — B
      */

      {
        season,

        competition,

        division: null,

        stage,

        group_name: null,

        round: null,

        leg: 1,

        participant_type:
          "player",

        home_id,

        away_id,

        home_goals: null,
        away_goals: null,

        status:
          "scheduled",

        played_at: null,

        series_id:
          seriesId,

        series_home_id:
          home_id,

        series_away_id:
          away_id,

        is_tiebreak:
          false,
      },

      /*
        МАТЧ 2

        B — A
      */

      {
        season,

        competition,

        division: null,

        stage,

        group_name: null,

        round: null,

        leg: 2,

        participant_type:
          "player",

        home_id:
          away_id,

        away_id:
          home_id,

        home_goals: null,
        away_goals: null,

        status:
          "scheduled",

        played_at: null,

        series_id:
          seriesId,

        series_home_id:
          home_id,

        series_away_id:
          away_id,

        is_tiebreak:
          false,
      },
    ];

    /*
      ==========================
      INSERT
      ==========================
    */

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("matches")
      .insert(rows)
      .select(
        `
          id,
          season,
          competition,
          stage,
          round,
          leg,
          participant_type,
          home_id,
          away_id,
          home_goals,
          away_goals,
          status,
          played_at,
          series_id,
          series_home_id,
          series_away_id,
          is_tiebreak
        `
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

      message:
        "Двоматчеве протистояння створено",

      series_id:
        seriesId,

      series_home_id:
        home_id,

      series_away_id:
        away_id,

      matches:
        data ?? [],
    });
  } catch (error) {
    console.error(
      "TWO LEG SERIES POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Помилка створення двоматчевого протистояння",
      },
      {
        status: 500,
      }
    );
  }
}