import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../lib/supabase-admin";

import { buildStandings } from "../../../lib/standings";

import {
  applyPlayerReplacements,
  getSeasonPlayerReplacements,
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

  Qualification:
  /api/standings?season=3&competition=season-qualification

  Champions League group:
  /api/standings?season=3&competition=champions-league&group_name=A
*/

export async function GET(
  request: Request
) {
  try {
    const {
      searchParams,
    } = new URL(
      request.url
    );

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

      Public IDs:

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
        ? (
            Number(
              divisionMatch[1]
            ) as DivisionNumber
          )
        : null;

    /*
      ========================================
      TABLE TYPE
      ========================================
    */

    const isDivision =
      divisionNumber !==
      null;

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
      require group name.
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

      Беремо початковий склад
      із season competition data.
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
      ALL PLAYER REPLACEMENTS OF SEASON
      ========================================

      Заміна тепер глобальна
      в межах сезону.

      Наприклад:

      VolodyaBES -> monkeyscott

      впливає не тільки на Division,
      а й на Qualification,
      European groups тощо.
      ========================================
    */

    const replacements =
      await getSeasonPlayerReplacements(
        seasonNumber
      );

    /*
      ========================================
      CURRENT PARTICIPANTS
      ========================================

      Перетворюємо початковий список
      учасників на актуальний список
      після всіх replacement chains.

      A -> B
      B -> C

      У таблиці буде C.
      ========================================
    */

    const participantIds =
      applyPlayerReplacements(
        baseParticipantIds,
        replacements
      );

    /*
      ========================================
      DATABASE COMPETITION ID
      ========================================

      У коді qualification має ID:

      season-qualification

      У public.matches:

      qualification
      ========================================
    */

    const databaseCompetition =
      isQualification
        ? "qualification"
        : competition;

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
    */

    if (
      isDivision &&
      divisionNumber !==
        null
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
          databaseCompetition
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
      MATCHES FOR CURRENT STANDINGS
      ========================================

      Дуже важливе правило:

      finished матчі фізично
      НЕ переписуються в БД.

      Наприклад:

      VolodyaBES зіграв 2 матчі.

      Потім:
      VolodyaBES -> monkeyscott

      У public.matches finished rows
      залишаються VolodyaBES.

      Але при розрахунку АКТУАЛЬНОЇ
      таблиці ми віртуально резолвимо:

      VolodyaBES -> monkeyscott

      Тому monkeyscott успадковує
      очки, голи та статистику.
      ========================================
    */

    const standingsMatches =
      (
        data ?? []
      ).map(
        (match) => ({
          home_id:
            resolveReplacementPlayerId(
              match.home_id,
              replacements
            ),

          away_id:
            resolveReplacementPlayerId(
              match.away_id,
              replacements
            ),

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

      database_competition:
        isDivision
          ? "division"
          : databaseCompetition,

      division:
        divisionNumber,

      group_name:
        groupName ??
        null,

      format,

      matches_count:
        data?.length ??
        0,

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