import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabase-admin";

import { calculateAssociationSeries } from "../../../../lib/association-series";

import { getCompetitionAssociations } from "../../../../data/competitions/get-competition-associations";

import type { SeasonNumber } from "../../../../data/competitions/season-competitions";

type Match = {
  id: string;

  stage: string | null;

  round: number | null;

  home_id: string;
  away_id: string;

  home_goals: number | null;
  away_goals: number | null;

  status: string;

  series_id: string | null;

  series_home_id: string | null;
  series_away_id: string | null;

  is_tiebreak: boolean;
};

const allowedStages = [
  "quarterfinal",
  "semifinal",
  "final",
  "third-place",
];

function getExpectedSeriesCount(
  stage: string
) {
  if (stage === "quarterfinal") {
    return 4;
  }

  if (stage === "semifinal") {
    return 2;
  }

  if (
    stage === "final" ||
    stage === "third-place"
  ) {
    return 1;
  }

  return 0;
}

/*
  ========================================
  BRACKET SLOT ІЗ SERIES ID
  ========================================
*/

function getBracketSlotFromSeriesId(
  seriesId: string | null
) {
  if (!seriesId) {
    return null;
  }

  const match =
    seriesId.match(
      /-slot-(\d+)-/
    );

  if (!match) {
    return null;
  }

  const slot =
    Number(match[1]);

  return Number.isInteger(slot)
    ? slot
    : null;
}

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

    const stage =
      searchParams.get("stage");

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
      !stage ||
      !allowedStages.includes(
        stage
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Невірна стадія Кубка асоціацій",
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
      АСОЦІАЦІЇ СЕЗОНУ
      ========================================
    */

    const associations =
      getCompetitionAssociations({
        season:
          season as SeasonNumber,

        competition:
          "associations-cup",
      });

    function getAssociationName(
      associationId:
        | string
        | null
    ) {
      if (!associationId) {
        return "Ще не визначено";
      }

      return (
        associations.find(
          (association) =>
            association.id ===
            associationId
        )?.name ??
        associationId
      );
    }

    /*
      ========================================
      ВСІ МАТЧІ СТАДІЇ
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
        "season",
        season
      )
      .eq(
        "competition",
        "associations-cup"
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
      АНАЛІЗ КОЖНОЇ СЕРІЇ
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
              getBracketSlotFromSeriesId(
                seriesId
              );

            const homeAssociationId =
              first
                ?.series_home_id ??
              null;

            const awayAssociationId =
              first
                ?.series_away_id ??
              null;

            if (
              !homeAssociationId ||
              !awayAssociationId
            ) {
              return {
                series_id:
                  seriesId,

                bracket_slot:
                  bracketSlot,

                next_round_slot:
                  null,

                home_id:
                  homeAssociationId,

                home_name:
                  getAssociationName(
                    homeAssociationId
                  ),

                away_id:
                  awayAssociationId,

                away_name:
                  getAssociationName(
                    awayAssociationId
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
              };
            }

            /*
              Використовуємо ту саму
              логіку, що вже працює
              в AssociationSeriesSummary.
            */

            const summary =
              calculateAssociationSeries(
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

                    is_tiebreak:
                      match.is_tiebreak,
                  })
                )
              );

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
                homeAssociationId;

              loserId =
                awayAssociationId;
            }

            if (
              summary.winner ===
              "away"
            ) {
              winnerId =
                awayAssociationId;

              loserId =
                homeAssociationId;
            }

            const complete =
              winnerId !== null;

            return {
              series_id:
                seriesId,

              bracket_slot:
                bracketSlot,

              next_round_slot:
                bracketSlot !==
                null
                  ? getNextRoundSlot(
                      bracketSlot
                    )
                  : null,

              home_id:
                homeAssociationId,

              home_name:
                getAssociationName(
                  homeAssociationId
                ),

              away_id:
                awayAssociationId,

              away_name:
                getAssociationName(
                  awayAssociationId
                ),

              complete,

              winner_id:
                winnerId,

              winner_name:
                winnerId
                  ? getAssociationName(
                      winnerId
                    )
                  : null,

              loser_id:
                loserId,

              loser_name:
                loserId
                  ? getAssociationName(
                      loserId
                    )
                  : null,

              status:
                summary.status,
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
      НЕЗАВЕРШЕНІ ПРОТИСТОЯННЯ
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
      ТОЧНІ ПАРИ НАСТУПНОГО РАУНДУ
      ========================================
    */

    const nextRoundSlots =
      stage === "final" ||
      stage === "third-place"
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

              const associationA =
                sourceA?.winner_id ??
                null;

              const associationB =
                sourceB?.winner_id ??
                null;

              return {
                slot:
                  nextSlot,

                source_slots: [
                  sourceSlotA,
                  sourceSlotB,
                ],

                association_a:
                  associationA,

                association_a_name:
                  associationA
                    ? getAssociationName(
                        associationA
                      )
                    : null,

                association_b:
                  associationB,

                association_b_name:
                  associationB
                    ? getAssociationName(
                        associationB
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
                  associationA !==
                    null &&
                  associationB !==
                    null,
              };
            }
          );

    /*
      ========================================
      МАТЧ ЗА 3 МІСЦЕ — СЕЗОН 2
      ========================================

      Беремо двох переможених
      у півфіналах.

      Це поле матиме значення
      тільки при запиті semifinal.
    */

    let thirdPlaceSlot:
      | {
          association_a:
            string | null;

          association_a_name:
            string | null;

          association_b:
            string | null;

          association_b_name:
            string | null;

          ready: boolean;
        }
      | null = null;

    if (
      season === 2 &&
      stage === "semifinal"
    ) {
      const semifinal1 =
        seriesResults.find(
          (series) =>
            series.bracket_slot ===
            1
        );

      const semifinal2 =
        seriesResults.find(
          (series) =>
            series.bracket_slot ===
            2
        );

      const loserA =
        semifinal1?.loser_id ??
        null;

      const loserB =
        semifinal2?.loser_id ??
        null;

      thirdPlaceSlot = {
        association_a:
          loserA,

        association_a_name:
          loserA
            ? getAssociationName(
                loserA
              )
            : null,

        association_b:
          loserB,

        association_b_name:
          loserB
            ? getAssociationName(
                loserB
              )
            : null,

        ready:
          loserA !== null &&
          loserB !== null,
      };
    }

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

      stage,

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

      third_place_slot:
        thirdPlaceSlot,

      series:
        seriesResults,
    });
  } catch (error) {
    console.error(
      "ASSOCIATION PLAYOFF ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Помилка визначення сітки Кубка асоціацій",
      },
      {
        status: 500,
      }
    );
  }
}