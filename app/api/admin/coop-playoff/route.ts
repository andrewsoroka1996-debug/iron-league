import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabase-admin";

import { calculateTwoLegSeries } from "../../../../lib/two-leg-series";

type Match = {
  id: string;

  stage: string | null;

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

type CoopTeam = {
  id: string;

  name: string;

  player_1_id: string;
  player_2_id: string;
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

export async function GET(
  request: Request
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const season = Number(
      searchParams.get(
        "season"
      )
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
      КОМАНДИ СЕЗОНУ
      ========================================
    */

    const {
      data: teamsData,
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

    const teams =
      (teamsData ??
        []) as CoopTeam[];

    function getTeam(
      teamId:
        | string
        | null
    ) {
      if (!teamId) {
        return null;
      }

      return (
        teams.find(
          (team) =>
            team.id ===
            teamId
        ) ?? null
      );
    }

    function getTeamName(
      teamId:
        | string
        | null
    ) {
      if (!teamId) {
        return "Ще не визначено";
      }

      return (
        getTeam(teamId)
          ?.name ??
        teamId
      );
    }

    /*
      ========================================
      МАТЧІ ПОТОЧНОЇ СТАДІЇ
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
        "iron-coop-cup"
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
      (data ??
        []) as Match[];

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
      if (
        !match.series_id
      ) {
        continue;
      }

      const current =
        seriesMap.get(
          match.series_id
        ) ?? [];

      current.push(
        match
      );

      seriesMap.set(
        match.series_id,
        current
      );
    }

    /*
      ========================================
      АНАЛІЗ СЕРІЙ
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
            const orderedMatches =
              [...seriesMatches].sort(
                (a, b) =>
                  (a.leg ??
                    999) -
                  (b.leg ??
                    999)
              );

            const firstMatch =
              orderedMatches[0];

            const bracketSlot =
              firstMatch
                ?.round ??
              null;

            const homeTeamId =
              firstMatch
                ?.series_home_id ??
              null;

            const awayTeamId =
              firstMatch
                ?.series_away_id ??
              null;

            if (
              !homeTeamId ||
              !awayTeamId
            ) {
              return {
                series_id:
                  seriesId,

                bracket_slot:
                  bracketSlot,

                home_id:
                  homeTeamId,

                home_name:
                  getTeamName(
                    homeTeamId
                  ),

                away_id:
                  awayTeamId,

                away_name:
                  getTeamName(
                    awayTeamId
                  ),

                complete:
                  false,

                winner_id:
                  null,

                winner_name:
                  null,

                loser_id:
                  null,

                loser_name:
                  null,

                status:
                  "invalid",

                matches:
                  orderedMatches,
              };
            }

            const summary =
              calculateTwoLegSeries({
                seriesHomeId:
                  homeTeamId,

                seriesAwayId:
                  awayTeamId,

                matches:
                  orderedMatches.map(
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

            let loserId:
              | string
              | null = null;

            if (
              summary.winner ===
              "home"
            ) {
              winnerId =
                homeTeamId;

              loserId =
                awayTeamId;
            }

            if (
              summary.winner ===
              "away"
            ) {
              winnerId =
                awayTeamId;

              loserId =
                homeTeamId;
            }

            return {
              series_id:
                seriesId,

              bracket_slot:
                bracketSlot,

              home_id:
                homeTeamId,

              home_name:
                getTeamName(
                  homeTeamId
                ),

              away_id:
                awayTeamId,

              away_name:
                getTeamName(
                  awayTeamId
                ),

              complete:
                winnerId !==
                null,

              winner_id:
                winnerId,

              winner_name:
                winnerId
                  ? getTeamName(
                      winnerId
                    )
                  : null,

              loser_id:
                loserId,

              loser_name:
                loserId
                  ? getTeamName(
                      loserId
                    )
                  : null,

              status:
                summary.status,

              summary,

              matches:
                orderedMatches,
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
      ПЕРЕМОЖЦІ СТАДІЇ
      ========================================
    */

    const qualifiers =
      seriesResults
        .filter(
          (series) =>
            series.complete &&
            series.winner_id
        )
        .map(
          (series) =>
            series.winner_id as string
        );

    /*
      ========================================
      НЕЗАВЕРШЕНІ СЕРІЇ
      ========================================
    */

    const pendingSeries =
      seriesResults
        .filter(
          (series) =>
            !series.complete
        )
        .map(
          (series) => ({
            series_id:
              series.series_id,

            bracket_slot:
              series.bracket_slot,

            home_id:
              series.home_id,

            home_name:
              series.home_name,

            away_id:
              series.away_id,

            away_name:
              series.away_name,

            status:
              series.status,
          })
        );

    /*
      ========================================
      ПАРИ НАСТУПНОЇ СТАДІЇ
      ========================================

      1/8:
      1 + 2 -> 1/4 №1
      3 + 4 -> 1/4 №2
      5 + 6 -> 1/4 №3
      7 + 8 -> 1/4 №4

      1/4:
      1 + 2 -> 1/2 №1
      3 + 4 -> 1/2 №2

      1/2:
      1 + 2 -> фінал
    */

    const nextRoundSlots =
      stage === "final"
        ? []
        : Array.from(
            {
              length:
                expectedSeries /
                2,
            },
            (_, index) => {
              const nextSlot =
                index + 1;

              const sourceSlotA =
                nextSlot * 2 -
                1;

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

              const teamA =
                sourceA
                  ?.winner_id ??
                null;

              const teamB =
                sourceB
                  ?.winner_id ??
                null;

              return {
                slot:
                  nextSlot,

                source_slots: [
                  sourceSlotA,
                  sourceSlotB,
                ],

                team_a:
                  teamA,

                team_a_name:
                  teamA
                    ? getTeamName(
                        teamA
                      )
                    : null,

                team_b:
                  teamB,

                team_b_name:
                  teamB
                    ? getTeamName(
                        teamB
                      )
                    : null,

                source_a:
                  sourceA
                    ? {
                        series_id:
                          sourceA
                            .series_id,

                        home_id:
                          sourceA
                            .home_id,

                        home_name:
                          sourceA
                            .home_name,

                        away_id:
                          sourceA
                            .away_id,

                        away_name:
                          sourceA
                            .away_name,

                        complete:
                          sourceA
                            .complete,

                        winner_id:
                          sourceA
                            .winner_id,

                        winner_name:
                          sourceA
                            .winner_name,
                      }
                    : null,

                source_b:
                  sourceB
                    ? {
                        series_id:
                          sourceB
                            .series_id,

                        home_id:
                          sourceB
                            .home_id,

                        home_name:
                          sourceB
                            .home_name,

                        away_id:
                          sourceB
                            .away_id,

                        away_name:
                          sourceB
                            .away_name,

                        complete:
                          sourceB
                            .complete,

                        winner_id:
                          sourceB
                            .winner_id,

                        winner_name:
                          sourceB
                            .winner_name,
                      }
                    : null,

                ready:
                  teamA !==
                    null &&
                  teamB !==
                    null,
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
      slot <=
      expectedSeries;
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

      stage,

      teams_count:
        teams.length,

      expected_series:
        expectedSeries,

      created_series:
        seriesResults.length,

      completed_series:
        completedSeries,

      stage_complete:
        stageComplete,

      qualifiers: [
        ...new Set(
          qualifiers
        ),
      ],

      pending_series:
        pendingSeries,

      next_round_slots:
        nextRoundSlots,

      series:
        seriesResults,
    });
  } catch (error) {
    console.error(
      "COOP PLAYOFF ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Помилка визначення сітки Iron Co-op Cup",
      },
      {
        status: 500,
      }
    );
  }
}