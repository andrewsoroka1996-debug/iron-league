import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabase-admin";

import { calculateTwoLegSeries } from "../../../../lib/two-leg-series";

type Match = {
  id: string;

  stage: string | null;

  /*
    round тепер використовується
    як номер пари в сітці.
  */

  round: number | null;

  leg: number | null;

  home_id: string;
  away_id: string;

  home_goals: number | null;
  away_goals: number | null;

  status: string;

  series_id: string | null;

  series_home_id: string | null;
  series_away_id: string | null;
};

const europeanCompetitions = [
  "champions-league",
  "europa-league",
  "conference-league",
];

const playoffStages = [
  "round-of-16",
  "quarterfinal",
  "semifinal",
];

/*
  ========================================
  КІЛЬКІСТЬ ПАР
  ========================================
*/

function getExpectedSeriesCount(
  stage: string
) {
  if (
    stage === "round-of-16"
  ) {
    return 8;
  }

  if (
    stage === "quarterfinal"
  ) {
    return 4;
  }

  if (
    stage === "semifinal"
  ) {
    return 2;
  }

  return 0;
}

/*
  ========================================
  НАСТУПНИЙ СЛОТ
  ========================================

  1 + 2 → 1
  3 + 4 → 2
  5 + 6 → 3
  7 + 8 → 4
*/

function getNextRoundSlot(
  bracketSlot: number
) {
  return Math.ceil(
    bracketSlot / 2
  );
}

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

    /*
      ========================================
      VALIDATION
      ========================================
    */

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
      !europeanCompetitions.includes(
        competition
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

    if (
      !stage ||
      !playoffStages.includes(
        stage
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Невірна стадія плей-оф",
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
      МАТЧІ СТАДІЇ
      ========================================
    */

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
          leg,
          home_id,
          away_id,
          home_goals,
          away_goals,
          status,
          series_id,
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
      (data ?? []) as Match[];

    /*
      ========================================
      ГРУПУЄМО ПО SERIES_ID
      ========================================
    */

    const seriesMap =
      new Map<
        string,
        Match[]
      >();

    for (
      const match of matches
    ) {
      if (!match.series_id) {
        continue;
      }

      const current =
        seriesMap.get(
          match.series_id
        ) ?? [];

      current.push(match);

      seriesMap.set(
        match.series_id,
        current
      );
    }

    /*
      ========================================
      АНАЛІЗ КОЖНОЇ ПАРИ
      ========================================
    */

    const seriesResults =
      Array.from(
        seriesMap.entries()
      )
        .map(
          ([
            seriesId,
            seriesMatches,
          ]) => {
            const first =
              seriesMatches[0];

            const bracketSlot =
              first?.round ?? null;

            const seriesHomeId =
              first?.series_home_id ??
              null;

            const seriesAwayId =
              first?.series_away_id ??
              null;

            /*
              Невірно сформована
              серія.
            */

            if (
              bracketSlot ===
                null ||
              !seriesHomeId ||
              !seriesAwayId
            ) {
              return {
                series_id:
                  seriesId,

                bracket_slot:
                  bracketSlot,

                next_round_slot:
                  null,

                home_id:
                  seriesHomeId,

                away_id:
                  seriesAwayId,

                complete:
                  false,

                winner_id:
                  null,

                aggregate_home:
                  0,

                aggregate_away:
                  0,
              };
            }

            const summary =
              calculateTwoLegSeries({
                seriesHomeId,

                seriesAwayId,

                matches:
                  seriesMatches.map(
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

            let winnerId:
              | string
              | null = null;

            if (
              summary.winner ===
              "home"
            ) {
              winnerId =
                seriesHomeId;
            }

            if (
              summary.winner ===
              "away"
            ) {
              winnerId =
                seriesAwayId;
            }

            const complete =
              summary.complete &&
              winnerId !== null;

            return {
              series_id:
                seriesId,

              bracket_slot:
                bracketSlot,

              next_round_slot:
                getNextRoundSlot(
                  bracketSlot
                ),

              home_id:
                seriesHomeId,

              away_id:
                seriesAwayId,

              complete,

              winner_id:
                winnerId,

              aggregate_home:
                summary
                  .aggregateHomeGoals,

              aggregate_away:
                summary
                  .aggregateAwayGoals,
            };
          }
        )
        .sort(
          (a, b) =>
            (
              a.bracket_slot ??
              999
            ) -
            (
              b.bracket_slot ??
              999
            )
        );

    /*
      ========================================
      ВІДОМІ ПЕРЕМОЖЦІ
      ========================================
    */

    const qualifiedSlots =
      seriesResults
        .filter(
          (series) =>
            series.complete &&
            series.winner_id &&
            series.bracket_slot !==
              null &&
            series.next_round_slot !==
              null
        )
        .map(
          (series) => ({
            player_id:
              series.winner_id as string,

            source_slot:
              series.bracket_slot as number,

            next_round_slot:
              series.next_round_slot as number,
          })
        );

    /*
      Старе поле qualifiers
      залишаємо для сумісності
      з формою.
    */

    const qualifiers = [
      ...new Set(
        qualifiedSlots.map(
          (item) =>
            item.player_id
        )
      ),
    ];

    /*
      ========================================
      НЕЗАВЕРШЕНІ ПАРИ
      ========================================
    */

    const pendingSeries =
      seriesResults
        .filter(
          (series) =>
            !series.complete &&
            series.bracket_slot !==
              null
        )
        .map(
          (series) => ({
            series_id:
              series.series_id,

            bracket_slot:
              series.bracket_slot,

            next_round_slot:
              series.next_round_slot,

            home_id:
              series.home_id,

            away_id:
              series.away_id,

            aggregate_home:
              series.aggregate_home,

            aggregate_away:
              series.aggregate_away,
          })
        );

    /*
      ========================================
      ТОЧНІ СЛОТИ НАСТУПНОЇ СТАДІЇ
      ========================================

      Наприклад:

      1/8 №1 + №2
      → 1/4 №1

      Тут відразу видно:

      - хто вже пройшов;
      - хто ще визначається;
      - чи готова конкретна
        наступна пара.
    */

    const nextRoundSeriesCount =
      expectedSeries / 2;

    const nextRoundSlots =
      Array.from(
        {
          length:
            nextRoundSeriesCount,
        },
        (
          _,
          index
        ) => {
          const nextSlot =
            index + 1;

          const sourceSlotA =
            nextSlot * 2 - 1;

          const sourceSlotB =
            nextSlot * 2;

          const sourceA =
            seriesResults.find(
              (series) =>
                series.bracket_slot ===
                sourceSlotA
            );

          const sourceB =
            seriesResults.find(
              (series) =>
                series.bracket_slot ===
                sourceSlotB
            );

          const playerA =
            sourceA?.winner_id ??
            null;

          const playerB =
            sourceB?.winner_id ??
            null;

          return {
            slot:
              nextSlot,

            source_slots: [
              sourceSlotA,
              sourceSlotB,
            ],

            player_a:
              playerA,

            player_b:
              playerB,

            source_a: sourceA
              ? {
                  series_id:
                    sourceA.series_id,

                  home_id:
                    sourceA.home_id,

                  away_id:
                    sourceA.away_id,

                  complete:
                    sourceA.complete,

                  winner_id:
                    sourceA.winner_id,
                }
              : null,

            source_b: sourceB
              ? {
                  series_id:
                    sourceB.series_id,

                  home_id:
                    sourceB.home_id,

                  away_id:
                    sourceB.away_id,

                  complete:
                    sourceB.complete,

                  winner_id:
                    sourceB.winner_id,
                }
              : null,

            /*
              Конкретну пару
              наступного раунду
              вже можна створити.
            */

            ready:
              playerA !== null &&
              playerB !== null,
          };
        }
      );

    /*
      ========================================
      СТАТУС СТАДІЇ
      ========================================
    */

    const completedSeries =
      seriesResults.filter(
        (series) =>
          series.complete
      ).length;

    /*
      Перевіряємо не лише
      кількість серій, а й те,
      що всі слоти 1...N
      реально існують.
    */

    const occupiedSlots =
      new Set(
        seriesResults
          .map(
            (series) =>
              series.bracket_slot
          )
          .filter(
            (
              slot
            ): slot is number =>
              slot !== null
          )
      );

    let allSlotsExist =
      true;

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
        allSlotsExist =
          false;

        break;
      }
    }

    const stageComplete =
      allSlotsExist &&
      completedSeries ===
        expectedSeries;

    /*
      ========================================
      RESPONSE
      ========================================
    */

    return NextResponse.json({
      success: true,

      season,
      competition,
      stage,

      expected_series:
        expectedSeries,

      created_series:
        seriesResults.length,

      completed_series:
        completedSeries,

      stage_complete:
        stageComplete,

      qualifiers,

      /*
        Розширена інформація
        про тих, хто вже пройшов.
      */

      qualified_slots:
        qualifiedSlots,

      /*
        Незавершені пари.
      */

      pending_series:
        pendingSeries,

      /*
        Найважливіше:
        точна структура
        наступного раунду.
      */

      next_round_slots:
        nextRoundSlots,

      series:
        seriesResults,
    });
  } catch (error) {
    console.error(
      "PLAYOFF QUALIFIERS ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Помилка визначення переможців плей-оф",
      },
      {
        status: 500,
      }
    );
  }
}