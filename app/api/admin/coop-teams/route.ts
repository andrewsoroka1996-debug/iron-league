import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabase-admin";

import { players } from "../../../../data/players";

type CreateTeamBody = {
  password?: string;

  season?: number;

  name?: string;
};

type UpdateTeamBody = {
  password?: string;

  season?: number;

  team_id?: string;

  player_1_id?: string | null;
  player_2_id?: string | null;
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

  Створює команду БЕЗ гравців.

  Гравці додаються пізніше через PATCH.
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
      МАКСИМУМ 16 КОМАНД
      ========================================
    */

    const {
      count,
      error: countError,
    } = await supabaseAdmin
      .from("coop_teams")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "season",
        season
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
      (count ?? 0) >= 16
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
      СТВОРЕННЯ

      СКЛАД ПОКИ NULL.
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

        player_1_id:
          null,

        player_2_id:
          null,
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
  PATCH

  Додає або змінює склад команди.

  Можна також очистити склад:
  player_1_id = null
  player_2_id = null
  ==========================================
*/

export async function PATCH(
  request: Request
) {
  try {
    const body =
      (await request.json()) as UpdateTeamBody;

    const {
      password,
      season,
      team_id,
    } = body;

    const player1Id =
      body.player_1_id ??
      null;

    const player2Id =
      body.player_2_id ??
      null;

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

    /*
      ========================================
      ДВА ОДНАКОВІ ГРАВЦІ
      ========================================
    */

    if (
      player1Id &&
      player2Id &&
      player1Id ===
        player2Id
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

    /*
      ========================================
      ПЕРЕВІРКА ГРАВЦІВ
      ========================================
    */

    if (player1Id) {
      const exists =
        players.some(
          (player) =>
            player.id ===
            player1Id
        );

      if (!exists) {
        return NextResponse.json(
          {
            error:
              "Гравця 1 не знайдено",
          },
          {
            status: 400,
          }
        );
      }
    }

    if (player2Id) {
      const exists =
        players.some(
          (player) =>
            player.id ===
            player2Id
        );

      if (!exists) {
        return NextResponse.json(
          {
            error:
              "Гравця 2 не знайдено",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
      ========================================
      ЧИ ІСНУЄ КОМАНДА
      ========================================
    */

    const {
      data: currentTeam,
      error:
        currentTeamError,
    } = await supabaseAdmin
      .from("coop_teams")
      .select(
        `
          id,
          name
        `
      )
      .eq(
        "id",
        team_id
      )
      .eq(
        "season",
        season
      )
      .maybeSingle();

    if (currentTeamError) {
      return NextResponse.json(
        {
          error:
            currentTeamError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!currentTeam) {
      return NextResponse.json(
        {
          error:
            "Команду не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    /*
      ========================================
      ГРАВЕЦЬ НЕ МОЖЕ БУТИ
      У ДВОХ КОМАНДАХ
      ========================================
    */

    const {
      data: otherTeams,
      error:
        otherTeamsError,
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
      )
      .neq(
        "id",
        team_id
      );

    if (otherTeamsError) {
      return NextResponse.json(
        {
          error:
            otherTeamsError.message,
        },
        {
          status: 500,
        }
      );
    }

    const duplicateTeam =
      otherTeams?.find(
        (team) =>
          (
            player1Id &&
            (
              team.player_1_id ===
                player1Id ||
              team.player_2_id ===
                player1Id
            )
          ) ||
          (
            player2Id &&
            (
              team.player_1_id ===
                player2Id ||
              team.player_2_id ===
                player2Id
            )
          )
      );

    if (duplicateTeam) {
      return NextResponse.json(
        {
          error:
            `Один із гравців уже входить до команди «${duplicateTeam.name}»`,
        },
        {
          status: 409,
        }
      );
    }

    /*
      ========================================
      ОНОВЛЕННЯ СКЛАДУ
      ========================================
    */

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("coop_teams")
      .update({
        player_1_id:
          player1Id,

        player_2_id:
          player2Id,
      })
      .eq(
        "id",
        team_id
      )
      .eq(
        "season",
        season
      )
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
        player1Id &&
        player2Id
          ? "Склад команди оновлено"
          : "Склад команди збережено",

      team:
        data,
    });
  } catch (error) {
    console.error(
      "COOP TEAMS PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Помилка оновлення складу команди",
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

  Видалення команди.
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