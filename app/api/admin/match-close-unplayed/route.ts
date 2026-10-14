import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabase-admin";

type CloseUnplayedBody = {
  password?: string;
  match_id?: string;
  dry_run?: boolean;
};

/*
  ========================================
  ЗАВЕРШЕННЯ БЕЗ РЕЗУЛЬТАТУ
  ========================================

  dry_run = true:
  Попередня перевірка без змін у базі.

  dry_run = false:
  Атомарне закриття матчу через
  admin_close_match_unplayed.

  Підтримуються всі турніри та стадії.
*/

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as CloseUnplayedBody;

    const { password, match_id, dry_run } = body;

    if (
      !process.env.ADMIN_PASSWORD ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Невірний пароль адміністратора",
        },
        { status: 401 }
      );
    }

    if (
      !match_id ||
      typeof match_id !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Не вказано матч",
        },
        { status: 400 }
      );
    }

    /*
  Режим роботи потрібно вказати явно.
*/

if (typeof dry_run !== "boolean") {
  return NextResponse.json(
    {
      success: false,
      error:
        "Потрібно вказати dry_run: true або false",
    },
    { status: 400 }
  );
}

    const { data: match, error } =
      await supabaseAdmin
        .from("matches")
        .select(
          `
            id,
            season,
            competition,
            division,
            stage,
            round,
            home_id,
            away_id,
            home_goals,
            away_goals,
            status,
            played_at
          `
        )
        .eq("id", match_id)
        .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    if (!match) {
      return NextResponse.json(
        {
          success: false,
          error: "Матч не знайдено",
        },
        { status: 404 }
      );
    }

    const blockers: string[] = [];

    if (match.status !== "scheduled") {
      blockers.push(
        "Адміністративно закрити можна лише запланований матч"
      );
    }

    if (
      match.home_goals !== null ||
      match.away_goals !== null
    ) {
      blockers.push(
        "Матч уже має рахунок"
      );
    }

    if (match.played_at !== null) {
      blockers.push(
        "Матч має дату проведення"
      );
    }

    const canClose = blockers.length === 0;
    /*
  ========================================
  ФАКТИЧНЕ ЗАКРИТТЯ МАТЧУ
  ========================================

  dry_run = true:
  тільки Preview.

  dry_run = false:
  виклик атомарної SQL-функції.
*/

if (dry_run === false) {
  if (!canClose) {
    return NextResponse.json(
      {
        success: false,
        can_close: false,
        blockers,
      },
      { status: 409 }
    );
  }

  const {
    data: result,
    error: closeError,
  } = await supabaseAdmin.rpc(
    "admin_close_match_unplayed",
    {
      p_match_id: match_id,
    }
  );

  if (closeError) {
    return NextResponse.json(
      {
        success: false,
        error: closeError.message,
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    success: true,
    dry_run: false,
    message:
      "Матч завершено без результату",
    result,
  });
}

    return NextResponse.json({
      success: true,
      dry_run: true,
      can_close: canClose,
      blockers,
      match,
      proposed_status: canClose
        ? "closed_unplayed"
        : null,
    });
  } catch (error) {
    console.error(
      "MATCH CLOSE UNPLAYED PREVIEW ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Помилка перевірки матчу",
      },
      { status: 500 }
    );
  }
}