import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabase-admin";

type SlotNumber = 1 | 2 | 3;

type SaveBody = {
  password?: string;

  action?: "set" | "clear";

  season?: number;

  feature_date?: string;

  slot?: number;

  match_id?: string;
};

function validSeason(
  season: number
) {
  return (
    Number.isInteger(season) &&
    season >= 1 &&
    season <= 4
  );
}

function validSlot(
  slot: number
): slot is SlotNumber {
  return (
    Number.isInteger(slot) &&
    slot >= 1 &&
    slot <= 3
  );
}

function validDate(
  value: string
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    value
  );
}

/*
  ========================================
  GET
  ========================================

  Повертає:

  - 1–3 Матчі дня на вибрану дату
  - усі матчі вибраного сезону
  - команди Co-op Cup
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

    const featureDate =
      searchParams.get("date") ?? "";

    if (!validSeason(season)) {
      return NextResponse.json(
        {
          error: "Невірний сезон",
        },
        {
          status: 400,
        }
      );
    }

    if (!validDate(featureDate)) {
      return NextResponse.json(
        {
          error:
            "Невірна дата",
        },
        {
          status: 400,
        }
      );
    }

    const [
      featuredResult,
      matchesResult,
      coopTeamsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("featured_matches")
        .select(
          `
            id,
            season,
            feature_date,
            slot,
            match_id,
            updated_at
          `
        )
        .eq("season", season)
        .eq(
          "feature_date",
          featureDate
        )
        .order(
          "slot",
          {
            ascending: true,
          }
        ),

      supabaseAdmin
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
        .eq("season", season)
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
            nullsFirst: true,
          }
        )
        .order(
          "leg",
          {
            ascending: true,
            nullsFirst: true,
          }
        ),

      supabaseAdmin
        .from("coop_teams")
        .select(
          `
            id,
            name
          `
        )
        .eq("season", season)
        .order(
          "name",
          {
            ascending: true,
          }
        ),
    ]);

    if (
      featuredResult.error
    ) {
      return NextResponse.json(
        {
          error:
            featuredResult.error
              .message,
        },
        {
          status: 500,
        }
      );
    }

    if (matchesResult.error) {
      return NextResponse.json(
        {
          error:
            matchesResult.error
              .message,
        },
        {
          status: 500,
        }
      );
    }

    if (coopTeamsResult.error) {
      console.error(
        "FEATURED MATCHES COOP ERROR:",
        coopTeamsResult.error
      );
    }

    return NextResponse.json({
      success: true,

      season,

      feature_date:
        featureDate,

      featured_matches:
        featuredResult.data ??
        [],

      matches:
        matchesResult.data ??
        [],

      coop_teams:
        coopTeamsResult.data ??
        [],
    });
  } catch (error) {
    console.error(
      "FEATURED MATCHES GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Помилка завантаження Матчів дня",
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
  ========================================

  action = set
    призначає матч у слот 1–3

  action = clear
    очищає конкретний слот
*/

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as SaveBody;

    const {
      password,
      action,
      season,
      feature_date,
      slot,
      match_id,
    } = body;

    /*
      ========================================
      ПАРОЛЬ
      ========================================
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
      ========================================
      ПЕРЕВІРКА
      ========================================
    */

    if (
      season === undefined ||
      !validSeason(season)
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
      !feature_date ||
      !validDate(feature_date)
    ) {
      return NextResponse.json(
        {
          error: "Невірна дата",
        },
        {
          status: 400,
        }
      );
    }

    if (
      slot === undefined ||
      !validSlot(slot)
    ) {
      return NextResponse.json(
        {
          error:
            "Невірний слот",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      CLEAR
      ========================================
    */

    if (action === "clear") {
      const {
        error,
      } = await supabaseAdmin
        .from("featured_matches")
        .delete()
        .eq("season", season)
        .eq(
          "feature_date",
          feature_date
        )
        .eq("slot", slot);

      if (error) {
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
          `Слот ${slot} очищено`,
      });
    }

    /*
      ========================================
      SET
      ========================================
    */

    if (action !== "set") {
      return NextResponse.json(
        {
          error:
            "Невідома дія",
        },
        {
          status: 400,
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

    /*
      ========================================
      ПЕРЕВІРЯЄМО МАТЧ
      ========================================
    */

    const {
      data: match,
      error: matchError,
    } = await supabaseAdmin
      .from("matches")
      .select(
        `
          id,
          season,
          competition,
          home_id,
          away_id
        `
      )
      .eq("id", match_id)
      .eq("season", season)
      .maybeSingle();

    if (matchError) {
      return NextResponse.json(
        {
          error:
            matchError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!match) {
      return NextResponse.json(
        {
          error:
            "Матч не знайдено в цьому сезоні",
        },
        {
          status: 404,
        }
      );
    }

    /*
      ========================================
      НЕ ДОЗВОЛЯЄМО ОДИН МАТЧ
      У ДВОХ СЛОТАХ ОДНОГО ДНЯ
      ========================================
    */

    const {
      data: duplicate,
      error: duplicateError,
    } = await supabaseAdmin
      .from("featured_matches")
      .select(
        `
          id,
          slot
        `
      )
      .eq("season", season)
      .eq(
        "feature_date",
        feature_date
      )
      .eq("match_id", match_id)
      .neq("slot", slot)
      .maybeSingle();

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

    if (duplicate) {
      return NextResponse.json(
        {
          error:
            `Цей матч уже стоїть у слоті ${duplicate.slot}`,
        },
        {
          status: 409,
        }
      );
    }

    /*
      ========================================
      UPSERT
      ========================================
    */

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("featured_matches")
      .upsert(
        {
          season,

          feature_date,

          slot,

          match_id,

          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "season,feature_date,slot",
        }
      )
      .select(
        `
          id,
          season,
          feature_date,
          slot,
          match_id,
          updated_at
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
        `Матч призначено у слот ${slot}`,

      featured_match: data,

      match,
    });
  } catch (error) {
    console.error(
      "FEATURED MATCHES POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Помилка збереження Матчу дня",
      },
      {
        status: 500,
      }
    );
  }
}