import { NextResponse } from "next/server";

import {
  getMatchResultRevertSafety,
} from "../../../../lib/match-result-revert-safety";

type PreviewBody = {
  password?: string;
  match_id?: string;
};

/*
  ========================================
  MATCH RESULT REVERT PREVIEW
  ========================================

  READ ONLY.

  Цей route нічого не змінює
  у таблиці matches.

  Вся логіка перевірки безпеки
  знаходиться в:

  lib/match-result-revert-safety.ts

  Ту саму функцію надалі
  використовуватиме реальний
  Revert API.
  ========================================
*/

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as PreviewBody;

    const {
      password,
      match_id,
    } = body;

    /*
      ========================================
      PASSWORD
      ========================================
    */

    if (
      !process.env.ADMIN_PASSWORD ||
      password !==
        process.env.ADMIN_PASSWORD
    ) {
      return NextResponse.json(
        {
          success: false,
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
      MATCH ID
      ========================================
    */

    if (
      !match_id ||
      typeof match_id !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Не вказано матч",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      SHARED SAFETY CHECK
      ========================================
    */

    const safety =
      await getMatchResultRevertSafety(
        match_id
      );

    if (
      !safety
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Матч не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    /*
      ========================================
      RESPONSE
      ========================================

      Зберігаємо той самий формат,
      який уже використовував Preview,
      щоб адмінка та наші тести
      не змінили поведінку.
      ========================================
    */

    return NextResponse.json({
      success: true,

      can_revert:
        safety.can_revert,

      match: {
        id:
          safety.match.id,

        season:
          safety.match.season,

        competition:
          safety.match.competition,

        division:
          safety.match.division,

        stage:
          safety.match.stage,

        round:
          safety.match.round,

        leg:
          safety.match.leg,

        home_id:
          safety.match.home_id,

        away_id:
          safety.match.away_id,

        home_goals:
          safety.match.home_goals,

        away_goals:
          safety.match.away_goals,

        status:
          safety.match.status,

        played_at:
          safety.match.played_at,

        series_id:
          safety.match.series_id,

        is_tiebreak:
          safety.match.is_tiebreak,
      },

      blockers:
        safety.blockers,

      warnings:
        safety.warnings,

      dependencies:
        safety.dependencies,
    });
  } catch (
    error
  ) {
    console.error(
      "MATCH RESULT REVERT PREVIEW ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Помилка перевірки відміни результату",
      },
      {
        status: 500,
      }
    );
  }
}