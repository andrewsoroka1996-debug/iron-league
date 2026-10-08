import { randomUUID } from "crypto";

import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabase-admin";

import { calculateTwoLegSeries } from "../../../../lib/two-leg-series";

import { getCompetitionPlayers } from "../../../../data/competitions/get-competition-players";

import type { SeasonNumber } from "../../../../data/competitions/season-competitions";

type EuropeanCompetition =
  | "champions-league"
  | "europa-league"
  | "conference-league";

type CreateSeriesBody = {
  password?: string;

  season?: number;

  competition?: string;

  stage?: string;

  home_id?: string;
  away_id?: string;

  bracket_slot?: number;
};

const allowedCompetitions: EuropeanCompetition[] = [
  "champions-league",
  "europa-league",
  "conference-league",
];

const allowedStages = [
  "round-of-16",
  "quarterfinal",
  "semifinal",
];

/*
  ========================================
  КІЛЬКІСТЬ ПАР У СТАДІЇ
  ========================================
*/

function getExpectedSeriesCount(
  stage: string
) {
  if (stage === "round-of-16") {
    return 8;
  }

  if (stage === "quarterfinal") {
    return 4;
  }

  if (stage === "semifinal") {
    return 2;
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
      searchParams.get("series_id");

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

        bracket_slot:
          firstMatch.round,

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

  Створює дві гри
  та автоматично визначає
  номер пари в сітці.
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

  competition,

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

    const seasonNumber =
      season as SeasonNumber;

    /*
      ========================================
      ТУРНІР
      ========================================
    */

    if (
      !competition ||
      !allowedCompetitions.includes(
        competition as EuropeanCompetition
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Невірний єврокубок",
        },
        {
          status: 400,
        }
      );
    }

    const europeanCompetition =
      competition as EuropeanCompetition;

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
            "Невірна стадія двоматчевого протистояння",
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
      ГРАВЦІ
      ========================================
    */

    if (
      !home_id ||
      !away_id
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
      ========================================
      ДОПУСТИМИЙ ПУЛ ГРАВЦІВ
      ========================================
    */

    const allowedPlayerIds =
      new Set<string>();

    const basePlayers =
      getCompetitionPlayers({
        season:
          seasonNumber,

        competition:
          europeanCompetition,

        groupName:
          null,
      });

    for (
      const playerId of basePlayers
    ) {
      allowedPlayerIds.add(
        playerId
      );
    }

    /*
      ЛЧ → ЛЄ
    */

    if (
      europeanCompetition ===
      "europa-league"
    ) {
      const championsPlayers =
        getCompetitionPlayers({
          season:
            seasonNumber,

          competition:
            "champions-league",

          groupName:
            null,
        });

      for (
        const playerId of championsPlayers
      ) {
        allowedPlayerIds.add(
          playerId
        );
      }
    }

    /*
      ЛЄ → ЛК
    */

    if (
      europeanCompetition ===
      "conference-league"
    ) {
      const europaPlayers =
        getCompetitionPlayers({
          season:
            seasonNumber,

          competition:
            "europa-league",

          groupName:
            null,
        });

      for (
        const playerId of europaPlayers
      ) {
        allowedPlayerIds.add(
          playerId
        );
      }
    }

    if (
      !allowedPlayerIds.has(
        home_id
      )
    ) {
      return NextResponse.json(
        {
          error:
            `${home_id} не може брати участь у цьому турнірі`,
        },
        {
          status: 400,
        }
      );
    }

    if (
      !allowedPlayerIds.has(
        away_id
      )
    ) {
      return NextResponse.json(
        {
          error:
            `${away_id} не може брати участь у цьому турнірі`,
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      ДУБЛІКАТ ПАРИ
      ========================================
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
        europeanCompetition
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
        europeanCompetition
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
      (directSeries?.length ??
        0) > 0 ||
      (reverseSeries?.length ??
        0) > 0
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
      ========================================
      ВЖЕ СТВОРЕНІ СЕРІЇ СТАДІЇ
      ========================================
    */

    const {
      data: existingMatches,
      error: existingError,
    } = await supabaseAdmin
      .from("matches")
      .select(
        `
          series_id,
          round
        `
      )
      .eq(
        "season",
        season
      )
      .eq(
        "competition",
        europeanCompetition
      )
      .eq(
        "stage",
        stage
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
      ========================================
      ЗАЙНЯТІ СЛОТИ
      ========================================
    */

    const existingSeriesIds =
      new Set<string>();

    const occupiedSlots =
      new Set<number>();

    for (
      const match of
        existingMatches ?? []
    ) {
      if (
        match.series_id
      ) {
        existingSeriesIds.add(
          match.series_id
        );
      }

      if (
        Number.isInteger(
          match.round
        ) &&
        match.round !== null &&
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
      Усі пари стадії
      вже створені.
    */

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
      НАСТУПНИЙ ВІЛЬНИЙ СЛОТ
      ========================================

      1/8:
      1 ... 8

      1/4:
      1 ... 4

      1/2:
      1 ... 2
    */

    let bracketSlot:
  | number
  | null = null;

/*
  Якщо форма передала
  конкретний слот —
  використовуємо саме його.
*/

if (
  bracket_slot !== undefined
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
          `Пара №${bracket_slot} вже створена`,
      },
      {
        status: 409,
      }
    );
  }

  bracketSlot =
    bracket_slot;
} else {
  /*
    Для 1/8 або старого режиму
    беремо перший вільний слот.
  */

  for (
    let slot = 1;
    slot <= expectedSeries;
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
            "Не знайдено вільного місця в турнірній сітці",
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
      `s${season}-${europeanCompetition}-${stage}-slot-${bracketSlot}-${randomUUID()}`;

    /*
      ========================================
      ДВА МАТЧІ

      ВАЖЛИВО:

      round = номер пари
      в турнірній сітці.
      ========================================
    */

    const rows = [
      {
        season,

        competition:
          europeanCompetition,

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
          "player",

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
          europeanCompetition,

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
          "player",

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

    /*
      ========================================
      INSERT
      ========================================
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
        "Двоматчеве протистояння створено",

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