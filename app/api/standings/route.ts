import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../lib/supabase-admin";

import { buildStandings } from "../../../lib/standings";

import {
  applyPlayerReplacements,
  getDivisionReplacements,
  resolveReplacementPlayerId,
} from "../../../lib/player-replacements";

import { getCompetitionPlayers } from "../../../data/competitions/get-competition-players";

import type { SeasonNumber } from "../../../data/competitions/season-competitions";

type DivisionNumber =
  | 1
  | 2
  | 3
  | 4;

/*
  ==========================================
  GET /api/standings
  ==========================================

  Examples:

  Division:
  /api/standings?season=3&competition=division-1

  Champions League group:
  /api/standings?season=3&competition=champions-league&group_name=A
*/

export async function GET(
  request: Request
) {
  try {
    const {
      searchParams,
    } = new URL(request.url);

    const season =
      Number(
        searchParams.get(
          "season"
        )
      );

    const competition =
      searchParams.get(
        "competition"
      );

    const groupName =
      searchParams.get(
        "group_name"
      );

    /*
      ========================================
      SEASON
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

    /*
      ========================================
      COMPETITION
      ========================================
    */

    if (!competition) {
      return NextResponse.json(
        {
          error:
            "Не вказано турнір",
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
      DIVISION NUMBER
      ========================================

      Public competition IDs:

      division-1
      division-2
      division-3
      division-4

      Database:

      competition = "division"
      division = 1 / 2 / 3 / 4
      ========================================
    */

    const divisionMatch =
      competition.match(
        /^division-([1-4])$/
      );

    const divisionNumber =
      divisionMatch
        ? Number(
            divisionMatch[1]
          ) as DivisionNumber
        : null;

    /*
      ========================================
      TABLE TYPE
      ========================================
    */

    const isDivision =
      divisionNumber !== null;

    const isQualification =
      competition ===
      "season-qualification";

    const isEuropeanGroup =
      competition ===
        "champions-league" ||
      competition ===
        "europa-league" ||
      competition ===
        "conference-league";

    if (
      !isDivision &&
      !isQualification &&
      !isEuropeanGroup
    ) {
      return NextResponse.json(
        {
          error:
            "Для цього турніру таблиця не підтримується",
        },
        {
          status: 400,
        }
      );
    }

    /*
      European group tables
      require a group.
    */

    if (
      isEuropeanGroup &&
      !groupName
    ) {
      return NextResponse.json(
        {
          error:
            "Не вказано групу",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      BASE PARTICIPANTS
      ========================================
    */

    const baseParticipantIds =
      getCompetitionPlayers({
        season:
          seasonNumber,

        competition,

        groupName:
          isEuropeanGroup
            ? groupName
            : null,
      });

    if (
      baseParticipantIds.length ===
      0
    ) {
      return NextResponse.json(
        {
          error:
            "Не знайдено учасників таблиці",
        },
        {
          status: 404,
        }
      );
    }

    /*
      ========================================
      PLAYER REPLACEMENTS
      ========================================

      Only divisions currently use
      player replacement inheritance.
      ========================================
    */

    const replacements =
      isDivision &&
      divisionNumber !== null
        ? await getDivisionReplacements(
            seasonNumber,
            divisionNumber
          )
        : [];

    /*
      ========================================
      CURRENT PARTICIPANTS
      ========================================

      Example:

      Base:
      VolodyaBES

      Replacement:
      VolodyaBES -> No_Stress23

      Current table:
      No_Stress23
      ========================================
    */

    const participantIds =
      isDivision
        ? applyPlayerReplacements(
            baseParticipantIds,
            replacements
          )
        : [
            ...baseParticipantIds,
          ];

    /*
      ========================================
      MATCHES FROM SUPABASE
      ========================================
    */

    let query =
      supabaseAdmin
        .from("matches")
        .select(
          `
            id,
            home_id,
            away_id,
            home_goals,
            away_goals,
            status,
            group_name,
            stage,
            division
          `
        )
        .eq(
          "season",
          seasonNumber
        );

    /*
      ========================================
      DIVISION MATCHES
      ========================================

      Public:
      division-1

      Database:
      competition = division
      division = 1
      ========================================
    */

    if (
      isDivision &&
      divisionNumber !== null
    ) {
      query =
        query
          .eq(
            "competition",
            "division"
          )
          .eq(
            "division",
            divisionNumber
          );
    } else {
      query =
        query.eq(
          "competition",
          competition
        );
    }

    /*
      ========================================
      EUROPEAN GROUP
      ========================================
    */

    if (
      isEuropeanGroup &&
      groupName
    ) {
      query =
        query
          .eq(
            "stage",
            "group"
          )
          .eq(
            "group_name",
            groupName
          );
    }

    const {
      data,
      error,
    } =
      await query;

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

    /*
      ========================================
      SORTING FORMAT
      ========================================
    */

    const format =
      isEuropeanGroup
        ? "europe-group"
        : "division-qualification";

    /*
      ========================================
      MATCHES FOR STANDINGS
      ========================================

      Physical database history stays intact.

      Example:

      Round 4:
      gadyuka -> VolodyaBES
      finished 0:2

      Database remains:
      VolodyaBES

      But for CURRENT standings calculation:

      VolodyaBES -> No_Stress23

      Therefore the 3 points and goals
      belong to No_Stress23's inherited slot.
      ========================================
    */

    const standingsMatches =
      (data ?? []).map(
        (match) => ({
          home_id:
            isDivision
              ? resolveReplacementPlayerId(
                  match.home_id,
                  replacements
                )
              : match.home_id,

          away_id:
            isDivision
              ? resolveReplacementPlayerId(
                  match.away_id,
                  replacements
                )
              : match.away_id,

          home_goals:
            match.home_goals,

          away_goals:
            match.away_goals,

          status:
            match.status,
        })
      );

    /*
      ========================================
      BUILD STANDINGS
      ========================================
    */

    const standings =
      buildStandings({
        participantIds,

        matches:
          standingsMatches,

        format,
      });

    /*
      ========================================
      RESPONSE
      ========================================
    */

    return NextResponse.json({
      success: true,

      season:
        seasonNumber,

      competition,

      division:
        divisionNumber,

      group_name:
        groupName ?? null,

      format,

      matches_count:
        data?.length ?? 0,

      replacements_count:
        replacements.length,

      standings:
        standings.map(
          (
            row,
            index
          ) => ({
            position:
              index + 1,

            ...row,
          })
        ),
    });
  } catch (error) {
    console.error(
      "STANDINGS API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Помилка розрахунку таблиці",
      },
      {
        status: 500,
      }
    );
  }
}