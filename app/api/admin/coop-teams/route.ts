import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabase-admin";

import { players } from "../../../../data/players";

type CreateTeamBody = {
  password?: string;

  season?: number;

  name?: string;

  player_1_id?: string;
  player_2_id?: string;
};

type DeleteTeamBody = {
  password?: string;

  season?: number;

  team_id?: string;
};

/*
  ==========================================
  GET

  Отримує всі Co-op команди сезону.
  ==========================================
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

    if (
      !Number.isInteger(season) ||
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

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("coop_teams")
      .select(
        `
          id,
          season,
          name,
          player_1_id,
          player_2_id,
          created_at
        `
      )
      .eq(
        "season",
        season
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

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

      season,

      teams:
        data ?? [],

      count:
        data?.length ?? 0,
    });
  } catch (error) {
    console.error(
      "COOP TEAMS GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Помилка завантаження команд",
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

  Створення Co-op команди.
  ==========================================
*/

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as CreateTeamBody;

    const {
      password,
      season,
      name,
      player_1_id,
      player_2_id,
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
      СЕЗОН
      ========================================
    */

    if (
      season === undefined ||
      !Number.isInteger(season) ||
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

    /*
      ========================================
      НАЗВА
      ========================================
    */

    const normalizedName =
      name?.trim();

    if (!normalizedName) {
      return NextResponse.json(
        {
          error:
            "Введіть назву команди",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      ГРАВЦІ
      ========================================
    */

    if (
      !player_1_id ||
      !player_2_id
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
      player_1_id ===
      player_2_id
    ) {
      return NextResponse.json(
        {
          error:
            "У команді мають бути два різні гравці",
        },
        {
          status: 400,
        }
      );
    }

    const player1Exists =
      players.some(
        (player) =>
          player.id ===
          player_1_id
      );

    const player2Exists =
      players.some(
        (player) =>
          player.id ===
          player_2_id
      );

    if (
      !player1Exists ||
      !player2Exists
    ) {
      return NextResponse.json(
        {
          error:
            "Не знайдено одного з гравців",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      ПОТОЧНІ КОМАНДИ СЕЗОНУ
      ========================================
    */

    const {
      data: existingTeams,
      error: existingError,
    } = await supabaseAdmin
      .from("coop_teams")
      .select(
        `
          id,
          name,
          player_1_id,
          player_2_id
        `
      )
      .eq(
        "season",
        season
      );

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

    /*
      Максимум 16 команд.
    */

    if (
      (existingTeams?.length ??
        0) >= 16
    ) {
      return NextResponse.json(
        {
          error:
            "У сезоні вже створено 16 команд",
        },
        {
          status: 409,
        }
      );
    }

    /*
      ========================================
      ГРАВЕЦЬ НЕ МОЖЕ БУТИ
      У ДВОХ КОМАНДАХ
      ========================================
    */

    const duplicatePlayerTeam =
      existingTeams?.find(
        (team) =>
          team.player_1_id ===
            player_1_id ||
          team.player_2_id ===
            player_1_id ||
          team.player_1_id ===
            player_2_id ||
          team.player_2_id ===
            player_2_id
      );

    if (duplicatePlayerTeam) {
      return NextResponse.json(
        {
          error:
            `Один із гравців уже входить до команди «${duplicatePlayerTeam.name}»`,
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
      .from("coop_teams")
      .insert({
        season,

        name:
          normalizedName,

        player_1_id,

        player_2_id,
      })
      .select(
        `
          id,
          season,
          name,
          player_1_id,
          player_2_id,
          created_at
        `
      )
      .single();

    if (error) {
      if (
        error.code === "23505"
      ) {
        return NextResponse.json(
          {
            error:
              "Команда з такою назвою вже існує у цьому сезоні",
          },
          {
            status: 409,
          }
        );
      }

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
        "Co-op команду створено",

      team:
        data,
    });
  } catch (error) {
    console.error(
      "COOP TEAMS POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Помилка створення Co-op команди",
      },
      {
        status: 500,
      }
    );
  }
}

/*
  ==========================================
  DELETE

  Видалення помилково створеної команди.
  ==========================================
*/

export async function DELETE(
  request: Request
) {
  try {
    const body =
      (await request.json()) as DeleteTeamBody;

    const {
      password,
      season,
      team_id,
    } = body;

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
      season === undefined ||
      !Number.isInteger(season) ||
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

    if (!team_id) {
      return NextResponse.json(
        {
          error:
            "Не вказано команду",
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
      .from("coop_teams")
      .delete()
      .eq(
        "id",
        team_id
      )
      .eq(
        "season",
        season
      )
      .select()
      .single();

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
        "Команду видалено",

      team:
        data,
    });
  } catch (error) {
    console.error(
      "COOP TEAMS DELETE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Помилка видалення команди",
      },
      {
        status: 500,
      }
    );
  }
}