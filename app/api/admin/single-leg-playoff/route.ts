import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabase-admin";

import { getCompetitionPlayers } from "../../../../data/competitions/get-competition-players";

import type { SeasonNumber } from "../../../../data/competitions/season-competitions";

type DivisionCup =
  | "division-1-cup"
  | "division-2-cup"
  | "division-3-cup"
  | "division-4-cup";

type Match = {
  id: string;

  stage: string | null;
  round: number | null;

  home_id: string;
  away_id: string;

  home_goals: number | null;
  away_goals: number | null;

  status: string;
};

type CreateBody = {
  password?: string;

  season?: number;

  competition?: string;

  stage?: string;

  home_id?: string;
  away_id?: string;

  bracket_slot?: number;
};

const allowedCompetitions: DivisionCup[] = [
  "division-1-cup",
  "division-2-cup",
  "division-3-cup",
  "division-4-cup",
];

const allowedStages = [
  "round-of-16",
  "quarterfinal",
  "semifinal",
  "final",
];

function getDivisionNumber(
  competition: DivisionCup
): 1 | 2 | 3 | 4 {
  if (
    competition ===
    "division-1-cup"
  ) {
    return 1;
  }

  if (
    competition ===
    "division-2-cup"
  ) {
    return 2;
  }

  if (
    competition ===
    "division-3-cup"
  ) {
    return 3;
  }

  return 4;
}

function getExpectedMatchCount(
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

  if (stage === "final") {
    return 1;
  }

  return 0;
}

function getNextRoundSlot(
  slot: number
) {
  return Math.ceil(
    slot / 2
  );
}

/*
  ==========================================
  GET

  Аналізує конкретну стадію
  Кубка дивізіону.
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

    const competition =
      searchParams.get(
        "competition"
      );

    const stage =
      searchParams.get(
        "stage"
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

    if (
      !competition ||
      !allowedCompetitions.includes(
        competition as DivisionCup
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Невірний Кубок дивізіону",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !stage ||
      !allowedStages.includes(
        stage
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Невірна стадія",
        },
        {
          status: 400,
        }
      );
    }

    const expectedMatches =
      getExpectedMatchCount(
        stage
      );

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("matches")
      .select(
        `
          id,
          stage,
          round,
          home_id,
          away_id,
          home_goals,
          away_goals,
          status
        `
      )
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
      ((data ?? []) as Match[])
        .sort(
          (a, b) =>
            (a.round ?? 999) -
            (b.round ?? 999)
        );

    const matchResults =
      matches.map(
        (match) => {
          let winnerId:
            | string
            | null = null;

          const complete =
            match.status ===
              "finished" &&
            match.home_goals !==
              null &&
            match.away_goals !==
              null &&
            match.home_goals !==
              match.away_goals;

          if (complete) {
            winnerId =
              match.home_goals! >
              match.away_goals!
                ? match.home_id
                : match.away_id;
          }

          return {
            id:
              match.id,

            bracket_slot:
              match.round,

            next_round_slot:
              match.round
                ? getNextRoundSlot(
                    match.round
                  )
                : null,

            home_id:
              match.home_id,

            away_id:
              match.away_id,

            home_goals:
              match.home_goals,

            away_goals:
              match.away_goals,

            complete,

            winner_id:
              winnerId,
          };
        }
      );

    const completedMatches =
      matchResults.filter(
        (match) =>
          match.complete
      ).length;

    const occupiedSlots =
      new Set(
        matchResults
          .map(
            (match) =>
              match.bracket_slot
          )
          .filter(
            (
              value
            ): value is number =>
              value !== null
          )
      );

    let allSlotsExist =
      true;

    for (
      let slot = 1;
      slot <= expectedMatches;
      slot += 1
    ) {
      if (
        !occupiedSlots.has(
          slot
        )
      ) {
        allSlotsExist =
          false;

        break;
      }
    }

    const stageComplete =
      allSlotsExist &&
      completedMatches ===
        expectedMatches;

    /*
      Для фіналу наступної
      стадії вже немає.
    */

    const nextRoundSlots =
      stage === "final"
        ? []
        : Array.from(
            {
              length:
                expectedMatches /
                2,
            },
            (_, index) => {
              const slot =
                index + 1;

              const sourceSlotA =
                slot * 2 - 1;

              const sourceSlotB =
                slot * 2;

              const sourceA =
                matchResults.find(
                  (match) =>
                    match.bracket_slot ===
                    sourceSlotA
                );

              const sourceB =
                matchResults.find(
                  (match) =>
                    match.bracket_slot ===
                    sourceSlotB
                );

              const playerA =
                sourceA?.winner_id ??
                null;

              const playerB =
                sourceB?.winner_id ??
                null;

              return {
                slot,

                source_slots: [
                  sourceSlotA,
                  sourceSlotB,
                ],

                player_a:
                  playerA,

                player_b:
                  playerB,

                source_a:
                  sourceA ?? null,

                source_b:
                  sourceB ?? null,

                ready:
                  playerA !== null &&
                  playerB !== null,
              };
            }
          );

    return NextResponse.json({
      success: true,

      season,
      competition,
      stage,

      expected_matches:
        expectedMatches,

      created_matches:
        matches.length,

      completed_matches:
        completedMatches,

      stage_complete:
        stageComplete,

      next_round_slots:
        nextRoundSlots,

      matches:
        matchResults,
    });
  } catch (error) {
    console.error(
      "SINGLE LEG PLAYOFF GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Помилка завантаження сітки Кубка дивізіону",
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

  Створює один матч
  у конкретному слоті сітки.
  ==========================================
*/

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as CreateBody;

    const {
      password,

      season,

      competition,

      stage,

      home_id,
      away_id,

      bracket_slot,
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

    const seasonNumber =
      season as SeasonNumber;

    if (
      !competition ||
      !allowedCompetitions.includes(
        competition as DivisionCup
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Невірний Кубок дивізіону",
        },
        {
          status: 400,
        }
      );
    }

    const cup =
      competition as DivisionCup;
      const division =
  getDivisionNumber(cup);

    if (
      !stage ||
      !allowedStages.includes(
        stage
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Невірна стадія",
        },
        {
          status: 400,
        }
      );
    }

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
      ПЕРЕВІРКА УЧАСНИКІВ
      ========================================
    */

    const participantIds =
      getCompetitionPlayers({
        season:
          seasonNumber,

        competition:
          cup,

        groupName:
          null,
      });

    if (
      !participantIds.includes(
        home_id
      ) ||
      !participantIds.includes(
        away_id
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Один із гравців не входить до цього Кубка дивізіону",
        },
        {
          status: 400,
        }
      );
    }

    const expectedMatches =
      getExpectedMatchCount(
        stage
      );

    /*
      ========================================
      ВЖЕ ЗАЙНЯТІ СЛОТИ
      ========================================
    */

    const {
      data: existingMatches,
      error: existingError,
    } = await supabaseAdmin
      .from("matches")
      .select(
        `
          id,
          round,
          home_id,
          away_id
        `
      )
      .eq(
        "season",
        season
      )
      .eq(
        "competition",
        cup
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

    const occupiedSlots =
      new Set<number>();

    for (
      const match of
        existingMatches ?? []
    ) {
      if (
        Number.isInteger(
          match.round
        ) &&
        match.round !== null
      ) {
        occupiedSlots.add(
          match.round
        );
      }

      const samePair =
        (
          match.home_id ===
            home_id &&
          match.away_id ===
            away_id
        ) ||
        (
          match.home_id ===
            away_id &&
          match.away_id ===
            home_id
        );

      if (samePair) {
        return NextResponse.json(
          {
            error:
              "Така пара вже створена на цій стадії",
          },
          {
            status: 409,
          }
        );
      }
    }

    /*
      ========================================
      СЛОТ
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
          expectedMatches
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
      for (
        let slot = 1;
        slot <= expectedMatches;
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
            "Усі пари цієї стадії вже створені",
        },
        {
          status: 409,
        }
      );
    }

    /*
      ========================================
      СТВОРЮЄМО ОДИН МАТЧ
      ========================================
    */

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("matches")
      .insert({
        season,

        competition:
          cup,

        division,

        stage,

        group_name:
          null,

        /*
          round =
          номер пари у сітці.
        */

        round:
          bracketSlot,

        leg: 1,

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
          null,

        series_home_id:
          null,

        series_away_id:
          null,

        is_tiebreak:
          false,
      })
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
        "Матч Кубка дивізіону створено",

      bracket_slot:
        bracketSlot,

      match:
        data,
    });
  } catch (error) {
    console.error(
      "SINGLE LEG PLAYOFF POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Помилка створення матчу Кубка дивізіону",
      },
      {
        status: 500,
      }
    );
  }
}