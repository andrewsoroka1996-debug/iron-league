import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabase-admin";

/*
  ==========================================
  GET
  ==========================================

  Завантажує матчі будь-якого турніру.

  Обов'язкові:
  - season
  - competition

  Додаткові:
  - division
  - stage
  - group_name
  - round
  - series_id
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

    const competition =
      searchParams.get("competition");

    const divisionParam =
      searchParams.get("division");

    const stage =
      searchParams.get("stage");

    const groupName =
      searchParams.get("group_name");

    const roundParam =
      searchParams.get("round");

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
      ТУРНІР
      ==========================
    */

    if (!competition) {
      return NextResponse.json(
        {
          error: "Не вказано турнір",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ==========================
      БАЗОВИЙ ЗАПИТ
      ==========================
    */

    let query = supabaseAdmin
      .from("matches")
      .select(
        `
          id,
          season,
          competition,
          division,
          round,
          stage,
          group_name,
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
        "competition",
        competition
      );

    /*
      ==========================
      ДИВІЗІОН
      ==========================
    */

    if (divisionParam) {
      const division =
        Number(divisionParam);

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

      query = query.eq(
        "division",
        division
      );
    }

    /*
      ==========================
      СТАДІЯ
      ==========================
    */

    if (stage) {
      query = query.eq(
        "stage",
        stage
      );
    }

    /*
      ==========================
      ГРУПА
      ==========================
    */

    if (groupName) {
      query = query.eq(
        "group_name",
        groupName
      );
    }

    /*
      ==========================
      ТУР
      ==========================
    */

    if (roundParam) {
      const round =
        Number(roundParam);

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

      query = query.eq(
        "round",
        round
      );
    }

    /*
      ==========================
      СЕРІЯ
      ==========================

      Наприклад:

      s3-assoc-qf-1

      або:

      s1-ucl-r16-1
    */

    if (seriesId) {
      query = query.eq(
        "series_id",
        seriesId
      );
    }

    /*
      ==========================
      РЕЗУЛЬТАТ
      ==========================
    */

    const {
      data,
      error,
    } = await query
      .order(
        "round",
        {
          ascending: true,
          nullsFirst: false,
        }
      )
      .order(
        "leg",
        {
          ascending: true,
          nullsFirst: false,
        }
      )
      .order(
        "is_tiebreak",
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
      "ADMIN MATCH GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Помилка завантаження матчів",
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

  Зберігає або змінює результат
  існуючого матчу.

  Матч визначається через ID.
*/

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const {
      password,
      match_id,
      home_goals,
      away_goals,
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
      ID
      ==========================
    */

    if (
      !match_id ||
      typeof match_id !== "string"
    ) {
      return NextResponse.json(
        {
          error: "Не вказано матч",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ==========================
      РАХУНОК
      ==========================
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
      ==========================
      ШУКАЄМО МАТЧ
      ==========================
    */

    const {
      data: match,
      error: findError,
    } = await supabaseAdmin
      .from("matches")
      .select(
        `
          id,
          season,
          competition,
          division,
          round,
          stage,
          group_name,
          leg,
          participant_type,
          home_id,
          away_id,
          home_goals,
          away_goals,
          status,
          series_id,
          series_home_id,
          series_away_id,
          is_tiebreak
        `
      )
      .eq(
        "id",
        match_id
      )
      .maybeSingle();

    if (findError) {
      return NextResponse.json(
        {
          error:
            findError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!match) {
      return NextResponse.json(
        {
          error: "Матч не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    const wasFinished =
      match.status === "finished";

    /*
      ==========================
      ОНОВЛЕННЯ
      ==========================
    */

    const {
      data: updatedMatch,
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
      .eq(
        "id",
        match_id
      )
      .select(
        `
          id,
          season,
          competition,
          division,
          round,
          stage,
          group_name,
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
      .single();

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

    return NextResponse.json({
      success: true,

      updated:
        wasFinished,

      message:
        wasFinished
          ? "Результат оновлено"
          : "Результат збережено",

      match:
        updatedMatch,
    });
  } catch (error) {
    console.error(
      "ADMIN MATCH POST ERROR:",
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
  ==========================================
  PUT
  ==========================================

  Створює матч.

  Підтримує:

  - одиночні матчі
  - групи
  - дивізіони
  - кваліфікацію
  - двоматчеві серії
  - Кубок асоціацій
  - 7-й тай-брейк
*/

export async function PUT(
  request: Request
) {
  try {
    const body =
      await request.json();

    const {
      password,

      season,
      competition,

      division = null,

      stage = null,
      group_name = null,

      round = null,
      leg = 1,

      participant_type = "player",

      home_id,
      away_id,

      /*
        ========================
        СЕРІЯ
        ========================

        Для звичайного матчу:
        null

        Для 2 матчів ЛЧ:
        один series_id

        Для Кубка асоціацій:
        6 матчів мають один
        series_id.
      */

      series_id = null,

      series_home_id = null,
      series_away_id = null,

      is_tiebreak = false,
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

    /*
      ==========================
      ТУРНІР
      ==========================
    */

    if (
      !competition ||
      typeof competition !== "string"
    ) {
      return NextResponse.json(
        {
          error: "Не вказано турнір",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ==========================
      ДИВІЗІОН
      ==========================
    */

    if (
      division !== null &&
      (
        !Number.isInteger(division) ||
        division < 1 ||
        division > 4
      )
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
      ==========================
      СТАДІЯ
      ==========================
    */

    if (
      stage !== null &&
      typeof stage !== "string"
    ) {
      return NextResponse.json(
        {
          error: "Невірна стадія",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ==========================
      ГРУПА
      ==========================
    */

    if (
      group_name !== null &&
      typeof group_name !== "string"
    ) {
      return NextResponse.json(
        {
          error: "Невірна група",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ==========================
      ТУР
      ==========================
    */

    if (
      round !== null &&
      (
        !Number.isInteger(round) ||
        round < 1
      )
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

    /*
      ==========================
      LEG
      ==========================
    */

    if (
      !Number.isInteger(leg) ||
      leg < 1 ||
      leg > 2
    ) {
      return NextResponse.json(
        {
          error:
            "Невірний номер матчу",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ==========================
      ТИП УЧАСНИКА
      ==========================
    */

    if (
      !participant_type ||
      typeof participant_type !==
        "string"
    ) {
      return NextResponse.json(
        {
          error:
            "Невірний тип учасника",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ==========================
      УЧАСНИКИ
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
            "Не вказано учасників матчу",
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
            "Учасник не може грати сам із собою",
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

    if (
      series_id !== null &&
      typeof series_id !== "string"
    ) {
      return NextResponse.json(
        {
          error:
            "Невірний ID серії",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ==========================
      АСОЦІАЦІЇ / КОМАНДИ СЕРІЇ
      ==========================
    */

    if (
      series_home_id !== null &&
      typeof series_home_id !==
        "string"
    ) {
      return NextResponse.json(
        {
          error:
            "Невірний учасник серії",
        },
        {
          status: 400,
        }
      );
    }

    if (
      series_away_id !== null &&
      typeof series_away_id !==
        "string"
    ) {
      return NextResponse.json(
        {
          error:
            "Невірний учасник серії",
        },
        {
          status: 400,
        }
      );
    }

    /*
      Якщо вказали одну сторону серії,
      повинна бути вказана й друга.
    */

    if (
      (
        series_home_id &&
        !series_away_id
      ) ||
      (
        !series_home_id &&
        series_away_id
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Потрібно вказати обох учасників серії",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ==========================
      TIEBREAK
      ==========================
    */

    if (
      typeof is_tiebreak !==
      "boolean"
    ) {
      return NextResponse.json(
        {
          error:
            "Невірне значення тай-брейку",
        },
        {
          status: 400,
        }
      );
    }

    /*
      7-й матч Кубка асоціацій
      повинен належати серії.
    */

    if (
      is_tiebreak &&
      !series_id
    ) {
      return NextResponse.json(
        {
          error:
            "Тай-брейк повинен належати серії",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      ПЕРЕВІРКА НА ДУБЛІКАТ
      ========================================

      Враховуємо:

      сезон
      турнір
      стадію
      тур
      leg
      гравців
      серію
      tiebreak
    */

    let duplicateQuery =
      supabaseAdmin
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
          "home_id",
          home_id
        )
        .eq(
          "away_id",
          away_id
        )
        .eq(
          "leg",
          leg
        )
        .eq(
          "is_tiebreak",
          is_tiebreak
        );

    /*
      Дивізіон
    */

    if (division !== null) {
      duplicateQuery =
        duplicateQuery.eq(
          "division",
          division
        );
    } else {
      duplicateQuery =
        duplicateQuery.is(
          "division",
          null
        );
    }

    /*
      Стадія
    */

    if (stage !== null) {
      duplicateQuery =
        duplicateQuery.eq(
          "stage",
          stage
        );
    } else {
      duplicateQuery =
        duplicateQuery.is(
          "stage",
          null
        );
    }

    /*
      Група
    */

    if (group_name !== null) {
      duplicateQuery =
        duplicateQuery.eq(
          "group_name",
          group_name
        );
    } else {
      duplicateQuery =
        duplicateQuery.is(
          "group_name",
          null
        );
    }

    /*
      Тур
    */

    if (round !== null) {
      duplicateQuery =
        duplicateQuery.eq(
          "round",
          round
        );
    } else {
      duplicateQuery =
        duplicateQuery.is(
          "round",
          null
        );
    }

    /*
      Серія
    */

    if (series_id !== null) {
      duplicateQuery =
        duplicateQuery.eq(
          "series_id",
          series_id
        );
    } else {
      duplicateQuery =
        duplicateQuery.is(
          "series_id",
          null
        );
    }

    const {
      data: duplicate,
      error: duplicateError,
    } = await duplicateQuery.limit(1);

    if (duplicateError) {
      return NextResponse.json(
        {
          error:
            duplicateError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (
      duplicate &&
      duplicate.length > 0
    ) {
      return NextResponse.json(
        {
          error:
            "Такий матч уже існує",
        },
        {
          status: 409,
        }
      );
    }

    /*
      ========================================
      СТВОРЕННЯ
      ========================================
    */

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("matches")
      .insert({
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

        home_goals: null,
        away_goals: null,

        status: "scheduled",

        played_at: null,

        /*
          СЕРІЯ
        */

        series_id,

        series_home_id,
        series_away_id,

        is_tiebreak,
      })
      .select(
        `
          id,
          season,
          competition,
          division,
          round,
          stage,
          group_name,
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
      .single();

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
        is_tiebreak
          ? "Тай-брейк створено"
          : "Матч створено",

      match: data,
    });
  } catch (error) {
    console.error(
      "ADMIN MATCH PUT ERROR:",
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