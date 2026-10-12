import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabase-admin";

type RestoreBody = {
  password?: string;
  match_id?: string;
  dry_run?: boolean;
};

/*
  ========================================
  MATCH RESULT RESTORE
  ========================================

  Відновлює останній активний snapshot,
  створений match-result-revert.

  Відновлюються ТОЧНО:

  home_goals
  away_goals
  status
  played_at

  Restore дозволений лише якщо матч
  досі знаходиться саме у стані,
  створеному Revert:

  status = scheduled
  home_goals = null
  away_goals = null
  played_at = null

  Якщо після Revert у матч уже внесли
  новий результат — старий snapshot
  НЕ перезаписує його.

  dry_run=true нічого не змінює.
  ========================================
*/

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as RestoreBody;

    const {
      password,
      match_id,
      dry_run,
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
      DRY RUN TYPE
      ========================================
    */

    if (
      dry_run !== undefined &&
      typeof dry_run !== "boolean"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Невірне значення dry_run",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      ACTIVE SNAPSHOT
      ========================================

      Беремо лише незакритий snapshot:

      restored_at IS NULL

      Partial UNIQUE INDEX гарантує,
      що для одного матчу такий snapshot
      може бути лише один.
      ========================================
    */

    const {
      data: snapshots,
      error: snapshotError,
    } = await supabaseAdmin
      .from(
        "match_result_revert_log"
      )
      .select(
        `
          id,
          match_id,
          home_goals,
          away_goals,
          status,
          played_at,
          reverted_at,
          restored_at
        `
      )
      .eq(
        "match_id",
        match_id
      )
      .is(
        "restored_at",
        null
      )
      .limit(1);

    if (
      snapshotError
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            snapshotError.message,
        },
        {
          status: 500,
        }
      );
    }

    const snapshot =
      snapshots?.[0];

    if (!snapshot) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Для цього матчу немає результату, доступного для відновлення",
        },
        {
          status: 404,
        }
      );
    }

    /*
      ========================================
      CURRENT MATCH
      ========================================
    */

    const {
      data: currentMatches,
      error: matchError,
    } = await supabaseAdmin
      .from("matches")
      .select(
        `
          id,
          season,
          competition,
          division,
          round,
          stage,
          group_name,
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
        "id",
        match_id
      )
      .limit(1);

    if (
      matchError
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            matchError.message,
        },
        {
          status: 500,
        }
      );
    }

    const match =
      currentMatches?.[0];

    if (!match) {
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
      CURRENT STATE SAFETY
      ========================================

      Restore не має права затерти
      новий результат.

      Тому матч повинен бути ТОЧНО
      у стані після Revert.
      ========================================
    */

    const isRevertedState =
      match.status ===
        "scheduled" &&
      match.home_goals ===
        null &&
      match.away_goals ===
        null &&
      match.played_at ===
        null;

    if (
      !isRevertedState
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Матч уже змінився після скасування результату. Автоматичне відновлення заблоковано.",

          current_match: {
            id:
              match.id,

            home_goals:
              match.home_goals,

            away_goals:
              match.away_goals,

            status:
              match.status,

            played_at:
              match.played_at,
          },

          snapshot: {
            id:
              snapshot.id,

            home_goals:
              snapshot.home_goals,

            away_goals:
              snapshot.away_goals,

            status:
              snapshot.status,

            played_at:
              snapshot.played_at,

            reverted_at:
              snapshot.reverted_at,
          },
        },
        {
          status: 409,
        }
      );
    }

    /*
      ========================================
      SNAPSHOT VALIDATION
      ========================================

      Наш Revert зараз створює snapshot
      лише для finished-матчу.

      Але все одно не довіряємо даним
      без перевірки.
      ========================================
    */

    if (
      snapshot.status !==
        "finished" ||
      !Number.isInteger(
        snapshot.home_goals
      ) ||
      !Number.isInteger(
        snapshot.away_goals
      ) ||
      snapshot.home_goals <
        0 ||
      snapshot.away_goals <
        0
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Snapshot результату містить некоректні дані",
        },
        {
          status: 500,
        }
      );
    }

    /*
      ========================================
      DRY RUN
      ========================================
    */

    if (
      dry_run === true
    ) {
      return NextResponse.json({
        success: true,

        dry_run: true,

        can_restore: true,

        message:
          "Перевірка пройдена. Результат можна точно відновити.",

        current_match: {
          id:
            match.id,

          home_goals:
            match.home_goals,

          away_goals:
            match.away_goals,

          status:
            match.status,

          played_at:
            match.played_at,
        },

        restore_result: {
          home_goals:
            snapshot.home_goals,

          away_goals:
            snapshot.away_goals,

          status:
            snapshot.status,

          played_at:
            snapshot.played_at,
        },

        snapshot: {
          id:
            snapshot.id,

          reverted_at:
            snapshot.reverted_at,
        },
      });
    }

    /*
      ========================================
      RESTORE MATCH
      ========================================

      Optimistic lock:

      UPDATE виконується лише якщо матч
      досі scheduled/null/null/null.

      Тобто Restore ніколи не перезапише
      новий введений результат.
      ========================================
    */

    const {
      data: restoredMatches,
      error: restoreError,
    } = await supabaseAdmin
      .from("matches")
      .update({
        home_goals:
          snapshot.home_goals,

        away_goals:
          snapshot.away_goals,

        status:
          snapshot.status,

        played_at:
          snapshot.played_at,
      })
      .eq(
        "id",
        match.id
      )
      .eq(
        "status",
        "scheduled"
      )
      .is(
        "home_goals",
        null
      )
      .is(
        "away_goals",
        null
      )
      .is(
        "played_at",
        null
      )
      .select(
        `
          id,
          season,
          competition,
          division,
          round,
          stage,
          group_name,
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

    if (
      restoreError
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            restoreError.message,
        },
        {
          status: 500,
        }
      );
    }

    /*
      ========================================
      RACE CONDITION CHECK
      ========================================
    */

    if (
      !restoredMatches ||
      restoredMatches.length !==
        1
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Стан матчу змінився під час Restore. Онови дані та повтори перевірку.",
        },
        {
          status: 409,
        }
      );
    }

    const restoredMatch =
      restoredMatches[0];

    /*
      ========================================
      CLOSE SNAPSHOT
      ========================================

      Матч уже відновлений.

      Тепер позначаємо snapshot
      використаним.
      ========================================
    */

    const restoredAt =
      new Date().toISOString();

    const {
      data: closedSnapshots,
      error: closeError,
    } = await supabaseAdmin
      .from(
        "match_result_revert_log"
      )
      .update({
        restored_at:
          restoredAt,
      })
      .eq(
        "id",
        snapshot.id
      )
      .is(
        "restored_at",
        null
      )
      .select(
        `
          id,
          restored_at
        `
      );

    /*
      ========================================
      CLOSE ERROR -> COMPENSATING ROLLBACK
      ========================================

      Supabase JS тут не дає нам одну
      SQL-транзакцію для двох таблиць.

      Якщо матч відновився,
      але snapshot не закрився,
      пробуємо повернути матч назад
      у reverted state.

      Тоді Restore можна буде
      повторити без подвійного стану.
      ========================================
    */

    if (
      closeError ||
      !closedSnapshots ||
      closedSnapshots.length !==
        1
    ) {
      const {
        error: rollbackError,
      } = await supabaseAdmin
        .from("matches")
        .update({
          home_goals: null,

          away_goals: null,

          status:
            "scheduled",

          played_at: null,
        })
        .eq(
          "id",
          restoredMatch.id
        )
        .eq(
          "status",
          snapshot.status
        )
        .eq(
          "home_goals",
          snapshot.home_goals
        )
        .eq(
          "away_goals",
          snapshot.away_goals
        );

      if (
        rollbackError
      ) {
        console.error(
          "MATCH RESULT RESTORE ROLLBACK ERROR:",
          rollbackError
        );

        return NextResponse.json(
          {
            success: false,

            error:
              "Результат відновлено, але snapshot не вдалося закрити і автоматичний rollback також не вдався. Потрібна ручна перевірка.",
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json(
        {
          success: false,

          error:
            closeError?.message ??
            "Не вдалося закрити snapshot. Відновлення автоматично відкочено.",
        },
        {
          status: 500,
        }
      );
    }

    /*
      ========================================
      SUCCESS
      ========================================
    */

    return NextResponse.json({
      success: true,

      dry_run: false,

      message:
        "Результат матчу точно відновлено",

      match:
        restoredMatch,

      restored_result: {
        home_goals:
          snapshot.home_goals,

        away_goals:
          snapshot.away_goals,

        status:
          snapshot.status,

        played_at:
          snapshot.played_at,
      },

      snapshot: {
        id:
          snapshot.id,

        reverted_at:
          snapshot.reverted_at,

        restored_at:
          closedSnapshots[0]
            .restored_at,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "MATCH RESULT RESTORE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Помилка відновлення результату",
      },
      {
        status: 500,
      }
    );
  }
}