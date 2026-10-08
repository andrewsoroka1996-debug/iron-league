import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../lib/supabase-admin";

import { buildStandings } from "../../../lib/standings";

import { getCompetitionPlayers } from "../../../data/competitions/get-competition-players";

import type { SeasonNumber } from "../../../data/competitions/season-competitions";

/*
  ==========================================
  GET /api/standings
  ==========================================

  Приклади:

  Дивізіон:
  /api/standings?season=3&competition=division-1

  Група ЛЧ:
  /api/standings?season=3&competition=champions-league&group_name=A
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
      searchParams.get("competition");

    const groupName =
      searchParams.get("group_name");

    /*
      ========================================
      СЕЗОН
      ========================================
    */

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

    /*
      ========================================
      ТУРНІР
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
      ВИЗНАЧАЄМО ТИП ТАБЛИЦІ
      ========================================
    */

    const isDivision =
      competition === "division-1" ||
      competition === "division-2" ||
      competition === "division-3" ||
      competition === "division-4";

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
      Для груп єврокубків
      група обов'язкова.
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
      УЧАСНИКИ ТАБЛИЦІ
      ========================================
    */

    const participantIds =
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
      participantIds.length === 0
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
      МАТЧІ З SUPABASE
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
            stage
          `
        )
        .eq(
          "season",
          season
        )
        .eq(
          "competition",
          competition
        );

    /*
      Для єврокубків беремо
      тільки потрібну групу.
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
    } = await query;

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
      ФОРМАТ СОРТУВАННЯ
      ========================================
    */

    const format =
      isEuropeanGroup
        ? "europe-group"
        : "division-qualification";

    /*
      ========================================
      БУДУЄМО ТАБЛИЦЮ
      ========================================
    */

    const standings =
      buildStandings({
        participantIds,

        matches:
          (data ?? []).map(
            (match) => ({
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
            })
          ),

        format,
      });

    /*
      ========================================
      RESPONSE
      ========================================
    */

    return NextResponse.json({
      success: true,

      season,

      competition,

      group_name:
        groupName ?? null,

      format,

      matches_count:
        data?.length ?? 0,

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
          "Помилка розрахунку таблиці",
      },
      {
        status: 500,
      }
    );
  }
}