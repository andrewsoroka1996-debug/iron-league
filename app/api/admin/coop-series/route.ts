import { randomUUID } from "crypto";

import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabase-admin";

import { calculateTwoLegSeries } from "../../../../lib/two-leg-series";

type CreateSeriesBody = {
  password?: string;

  season?: number;

  stage?: string;

  home_id?: string;
  away_id?: string;

  bracket_slot?: number;
};

const allowedStages = [
  "round-of-16",
  "quarterfinal",
  "semifinal",
  "final",
];

function getExpectedSeriesCount(
  stage: string
) {
  if (
    stage ===
    "round-of-16"
  ) {
    return 8;
  }

  if (
    stage ===
    "quarterfinal"
  ) {
    return 4;
  }

  if (
    stage ===
    "semifinal"
  ) {
    return 2;
  }

  if (
    stage ===
    "final"
  ) {
    return 1;
  }

  return 0;
}

/*
  ==========================================
  GET
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

    const seriesId =
      searchParams.get(
        "series_id"
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
        "competition",
        "iron-coop-cup"
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
          error:
            error.message,
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
            "У протистоянні не вказані команди",
        },
        {
          status: 500,
        }
      );
    }

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

    const {
      data: teams,
      error: teamsError,
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
      .in(
        "id",
        [
          seriesHomeId,
          seriesAwayId,
        ]
      );

    if (teamsError) {
      return NextResponse.json(
        {
          error:
            teamsError.message,
        },
        {
          status: 500,
        }
      );
    }

    const homeTeam =
      teams?.find(
        (team) =>
          team.id ===
          seriesHomeId
      );

    const awayTeam =
      teams?.find(
        (team) =>
          team.id ===
          seriesAwayId
      );

    return NextResponse.json({
      success: true,

      series: {
        id:
          seriesId,

        season,

        competition:
          "iron-coop-cup",

        stage:
          firstMatch.stage,

        bracket_slot:
          firstMatch.round,

        home: {
          id:
            seriesHomeId,

          name:
            homeTeam?.name ??
            seriesHomeId,

          players:
            homeTeam
              ? [
                  homeTeam.player_1_id,
                  homeTeam.player_2_id,
                ].filter(Boolean)
              : [],
        },

        away: {
          id:
            seriesAwayId,

          name:
            awayTeam?.name ??
            seriesAwayId,

          players:
            awayTeam
              ? [
                  awayTeam.player_1_id,
                  awayTeam.player_2_id,
                ].filter(Boolean)
              : [],
        },
      },

      matches,

      summary,
    });
  } catch (error) {
    console.error(
      "COOP SERIES GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Помилка завантаження Co-op протистояння",
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

  Створює два матчі.
  ==========================================
*/

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as CreateSeriesBody;

    const {
      password,

      season,

      stage,

      home_id,
      away_id,

      bracket_slot,
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
      СТАДІЯ
      ========================================
    */

    if (
      !stage ||
      !allowedStages.includes(
        stage
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Невірна стадія Iron Co-op Cup",
        },
        {
          status: 400,
        }
      );
    }

    const expectedSeries =
      getExpectedSeriesCount(
        stage
      );

    /*
      ========================================
      КОМАНДИ
      ========================================
    */

    if (
      !home_id ||
      !away_id
    ) {
      return NextResponse.json(
        {
          error:
            "Оберіть дві команди",
        },
        {
          status: 400,
        }
      );
    }

    if (
      home_id ===
      away_id
    ) {
      return NextResponse.json(
        {
          error:
            "Команда не може грати сама із собою",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      КОМАНДИ СЕЗОНУ
      ========================================
    */

    const {
      data: coopTeams,
      error:
        coopTeamsError,
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

    if (coopTeamsError) {
      return NextResponse.json(
        {
          error:
            coopTeamsError.message,
        },
        {
          status: 500,
        }
      );
    }

    /*
      ========================================
      1/8

      Потрібно:
      - 16 команд
      - 16 повних складів
      ========================================
    */

    if (
      stage ===
      "round-of-16"
    ) {
      if (
        coopTeams?.length !==
        16
      ) {
        return NextResponse.json(
          {
            error:
              `Для жеребкування 1/8 потрібно 16 команд. Зараз: ${coopTeams?.length ?? 0}`,
          },
          {
            status: 400,
          }
        );
      }

      const completeTeams =
        coopTeams.filter(
          (team) =>
            Boolean(
              team.player_1_id
            ) &&
            Boolean(
              team.player_2_id
            )
        );

      if (
        completeTeams.length !==
        16
      ) {
        return NextResponse.json(
          {
            error:
              `Для жеребкування потрібно визначити склади всіх 16 команд. Готово: ${completeTeams.length}/16`,
          },
          {
            status: 400,
          }
        );
      }
    }

    const homeTeam =
      coopTeams?.find(
        (team) =>
          team.id ===
          home_id
      );

    const awayTeam =
      coopTeams?.find(
        (team) =>
          team.id ===
          away_id
      );

    if (
      !homeTeam ||
      !awayTeam
    ) {
      return NextResponse.json(
        {
          error:
            "Одна з команд не належить цьому сезону",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      ЗАХИСТ ВІД НЕПОВНОГО СКЛАДУ
      ========================================
    */

    if (
      !homeTeam.player_1_id ||
      !homeTeam.player_2_id ||
      !awayTeam.player_1_id ||
      !awayTeam.player_2_id
    ) {
      return NextResponse.json(
        {
          error:
            "У однієї з команд ще не визначено повний склад",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      ПОТОЧНІ МАТЧІ СТАДІЇ
      ========================================
    */

    const {
      data:
        existingStageMatches,
      error:
        existingStageError,
    } = await supabaseAdmin
      .from("matches")
      .select(
        `
          series_id,
          round,
          series_home_id,
          series_away_id
        `
      )
      .eq(
        "season",
        season
      )
      .eq(
        "competition",
        "iron-coop-cup"
      )
      .eq(
        "stage",
        stage
      );

    if (existingStageError) {
      return NextResponse.json(
        {
          error:
            existingStageError.message,
        },
        {
          status: 500,
        }
      );
    }

    const existingSeriesIds =
      new Set<string>();

    const occupiedSlots =
      new Set<number>();

    const usedTeams =
      new Set<string>();

    for (
      const match of
        existingStageMatches ??
        []
    ) {
      if (
        match.series_id
      ) {
        existingSeriesIds.add(
          match.series_id
        );
      }

      if (
        match.series_home_id
      ) {
        usedTeams.add(
          match.series_home_id
        );
      }

      if (
        match.series_away_id
      ) {
        usedTeams.add(
          match.series_away_id
        );
      }

      if (
        Number.isInteger(
          match.round
        ) &&
        match.round !==
          null &&
        match.round >= 1 &&
        match.round <=
          expectedSeries
      ) {
        occupiedSlots.add(
          match.round
        );
      }
    }

    /*
      ========================================
      ОДНА КОМАНДА —
      ОДНА ПАРА НА СТАДІЇ
      ========================================
    */

    if (
      usedTeams.has(
        home_id
      ) ||
      usedTeams.has(
        away_id
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Одна з команд уже використана на цій стадії",
        },
        {
          status: 409,
        }
      );
    }

    if (
      existingSeriesIds.size >=
      expectedSeries
    ) {
      return NextResponse.json(
        {
          error:
            "Усі пари цієї стадії вже створені",
        },
        {
          status: 409,
        }
      );
    }

    /*
      ========================================
      НОМЕР ПАРИ
      ========================================
    */

    let bracketSlot:
      | number
      | null = null;

    if (
      bracket_slot !==
      undefined
    ) {
      if (
        !Number.isInteger(
          bracket_slot
        ) ||
        bracket_slot < 1 ||
        bracket_slot >
          expectedSeries
      ) {
        return NextResponse.json(
          {
            error:
              "Невірний номер пари в сітці",
          },
          {
            status: 400,
          }
        );
      }

      if (
        occupiedSlots.has(
          bracket_slot
        )
      ) {
        return NextResponse.json(
          {
            error:
              `Пара №${bracket_slot} уже створена`,
          },
          {
            status: 409,
          }
        );
      }

      bracketSlot =
        bracket_slot;
    } else {
      for (
        let slot = 1;
        slot <=
        expectedSeries;
        slot += 1
      ) {
        if (
          !occupiedSlots.has(
            slot
          )
        ) {
          bracketSlot =
            slot;

          break;
        }
      }
    }

    if (
      bracketSlot === null
    ) {
      return NextResponse.json(
        {
          error:
            "Не знайдено вільного місця у сітці",
        },
        {
          status: 409,
        }
      );
    }

    /*
      ========================================
      SERIES ID
      ========================================
    */

    const seriesId =
      `s${season}-iron-coop-cup-${stage}-slot-${bracketSlot}-${randomUUID()}`;

    /*
      ========================================
      ДВА МАТЧІ
      ========================================
    */

    const rows = [
      {
        season,

        competition:
          "iron-coop-cup",

        division:
          null,

        stage,

        group_name:
          null,

        round:
          bracketSlot,

        leg:
          1,

        participant_type:
          "team",

        home_id,

        away_id,

        home_goals:
          null,

        away_goals:
          null,

        status:
          "scheduled",

        played_at:
          null,

        series_id:
          seriesId,

        series_home_id:
          home_id,

        series_away_id:
          away_id,

        is_tiebreak:
          false,
      },

      {
        season,

        competition:
          "iron-coop-cup",

        division:
          null,

        stage,

        group_name:
          null,

        round:
          bracketSlot,

        leg:
          2,

        participant_type:
          "team",

        home_id:
          away_id,

        away_id:
          home_id,

        home_goals:
          null,

        away_goals:
          null,

        status:
          "scheduled",

        played_at:
          null,

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
        "Двоматчеве Co-op протистояння створено",

      series_id:
        seriesId,

      bracket_slot:
        bracketSlot,

      series_home_id:
        home_id,

      series_away_id:
        away_id,

      matches:
        data ?? [],
    });
  } catch (error) {
    console.error(
      "COOP SERIES POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Помилка створення Co-op протистояння",
      },
      {
        status: 500,
      }
    );
  }
}