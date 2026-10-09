import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabase-admin";

type FeaturedMatchBody = {
  password?: string;

  match_id?: string;

  feature_date?: string;

  position?: number;

  id?: string;
};

function isValidPassword(
  password: string | null | undefined
) {
  return (
    Boolean(process.env.ADMIN_PASSWORD) &&
    password === process.env.ADMIN_PASSWORD
  );
}

/*
  ========================================
  GET

  Завантажує:
  - усі матчі вибраного сезону
  - призначені матчі дня на вибрану дату
  ========================================
*/

export async function GET(
  request: Request
) {
  try {
    const {
      searchParams,
    } = new URL(request.url);

    const password =
      request.headers.get(
        "x-admin-password"
      );

    if (
      !isValidPassword(password)
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

    const season =
      Number(
        searchParams.get(
          "season"
        )
      );

    const featureDate =
      searchParams.get(
        "feature_date"
      );

    if (
      !Number.isInteger(
        season
      ) ||
      season < 1 ||
      season > 4
    ) {
      return NextResponse.json(
        {
          error:
            "Невірний сезон",
        },
        {
          status: 400,
        }
      );
    }

    if (!featureDate) {
      return NextResponse.json(
        {
          error:
            "Не вказано дату",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      МАТЧІ СЕЗОНУ
      ========================================
    */

    const {
      data: matches,
      error: matchesError,
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
          played_at
        `
      )
      .eq(
        "season",
        season
      )
      .order(
        "competition",
        {
          ascending: true,
        }
      )
      .order(
        "round",
        {
          ascending: true,
          nullsFirst: false,
        }
      );

    if (matchesError) {
      console.error(
        "FEATURED MATCHES LIST ERROR:",
        matchesError
      );

      return NextResponse.json(
        {
          error:
            matchesError.message,
        },
        {
          status: 500,
        }
      );
    }

    /*
      ========================================
      ПОТОЧНІ МАТЧІ ДНЯ
      ========================================
    */

    const {
      data: featured,
      error: featuredError,
    } = await supabaseAdmin
      .from(
        "featured_matches"
      )
      .select(
        `
          id,
          match_id,
          feature_date,
          position,
          created_at
        `
      )
      .eq(
        "feature_date",
        featureDate
      )
      .order(
        "position",
        {
          ascending: true,
        }
      );

    if (featuredError) {
      console.error(
        "FEATURED MATCHES GET ERROR:",
        featuredError
      );

      return NextResponse.json(
        {
          error:
            featuredError.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,

      matches:
        matches ?? [],

      featured:
        featured ?? [],
    });
  } catch (error) {
    console.error(
      "FEATURED MATCHES GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Помилка завантаження матчів дня",
      },
      {
        status: 500,
      }
    );
  }
}

/*
  ========================================
  POST

  Призначає матч на позицію 1, 2 або 3.
  Якщо позиція вже зайнята —
  попередній матч замінюється.
  ========================================
*/

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as FeaturedMatchBody;

    const {
      password,
      match_id,
      feature_date,
      position,
    } = body;

    if (
      !isValidPassword(password)
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

    if (!match_id) {
      return NextResponse.json(
        {
          error:
            "Оберіть матч",
        },
        {
          status: 400,
        }
      );
    }

    if (!feature_date) {
      return NextResponse.json(
        {
          error:
            "Не вказано дату",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(
        position
      ) ||
      !position ||
      position < 1 ||
      position > 3
    ) {
      return NextResponse.json(
        {
          error:
            "Позиція повинна бути від 1 до 3",
        },
        {
          status: 400,
        }
      );
    }

    /*
      Перевіряємо,
      що матч існує.
    */

    const {
      data: match,
      error: matchError,
    } = await supabaseAdmin
      .from("matches")
      .select(
        `
          id,
          season
        `
      )
      .eq(
        "id",
        match_id
      )
      .maybeSingle();

    if (
      matchError ||
      !match
    ) {
      return NextResponse.json(
        {
          error:
            "Матч не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    /*
      Якщо цей матч уже стоїть
      у цю дату на іншій позиції —
      прибираємо старий запис.
    */

    const {
      error:
        oldMatchError,
    } = await supabaseAdmin
      .from(
        "featured_matches"
      )
      .delete()
      .eq(
        "feature_date",
        feature_date
      )
      .eq(
        "match_id",
        match_id
      );

    if (oldMatchError) {
      return NextResponse.json(
        {
          error:
            oldMatchError.message,
        },
        {
          status: 500,
        }
      );
    }

    /*
      Звільняємо позицію,
      якщо вона вже зайнята.
    */

    const {
      error:
        oldPositionError,
    } = await supabaseAdmin
      .from(
        "featured_matches"
      )
      .delete()
      .eq(
        "feature_date",
        feature_date
      )
      .eq(
        "position",
        position
      );

    if (
      oldPositionError
    ) {
      return NextResponse.json(
        {
          error:
            oldPositionError.message,
        },
        {
          status: 500,
        }
      );
    }

    /*
      Додаємо матч.
    */

    const {
      data,
      error,
    } = await supabaseAdmin
      .from(
        "featured_matches"
      )
      .insert({
        match_id,

        feature_date,

        position,
      })
      .select(
        `
          id,
          match_id,
          feature_date,
          position,
          created_at
        `
      )
      .single();

    if (error) {
      console.error(
        "FEATURED MATCH POST ERROR:",
        error
      );

      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,

      message:
        `Матч призначено на позицію ${position}`,

      featured:
        data,
    });
  } catch (error) {
    console.error(
      "FEATURED MATCH POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Помилка призначення матчу дня",
      },
      {
        status: 500,
      }
    );
  }
}

/*
  ========================================
  DELETE

  Прибирає матч із блоку
  «Матч дня».
  ========================================
*/

export async function DELETE(
  request: Request
) {
  try {
    const body =
      (await request.json()) as FeaturedMatchBody;

    const {
      password,
      id,
    } = body;

    if (
      !isValidPassword(password)
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

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Не вказано ID",
        },
        {
          status: 400,
        }
      );
    }

    const {
      error,
    } = await supabaseAdmin
      .from(
        "featured_matches"
      )
      .delete()
      .eq(
        "id",
        id
      );

    if (error) {
      console.error(
        "FEATURED MATCH DELETE ERROR:",
        error
      );

      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,

      message:
        "Матч прибрано з головної",
    });
  } catch (error) {
    console.error(
      "FEATURED MATCH DELETE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Помилка видалення матчу дня",
      },
      {
        status: 500,
      }
    );
  }
}