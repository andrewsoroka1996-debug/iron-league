import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabase-admin";

import {
  getMatchResultRevertSafety,
} from "../../../../lib/match-result-revert-safety";

type RevertBody = {
  password?: string;
  match_id?: string;
  dry_run?: boolean;
};

/*
  ========================================
  MATCH RESULT REVERT
  ========================================

  Скасовує результат матчу.

  Перед реальною зміною:

  1. Виконується shared safety check.
  2. Перевіряється відсутність
     активного Restore snapshot.
  3. У match_result_revert_log
     зберігається точний старий стан.
  4. Лише після цього очищається матч.

  Зберігаємо:

  home_goals
  away_goals
  status
  played_at

  Сам матч НЕ видаляється.

  Після Revert:

  home_goals -> null
  away_goals -> null
  status -> scheduled
  played_at -> null

  dry_run=true нічого не змінює.
  ========================================
*/

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as RevertBody;

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
      SHARED SAFETY CHECK
      ========================================

      Preview і реальний Revert
      використовують одну й ту
      саму систему перевірок.
      ========================================
    */

    const safety =
      await getMatchResultRevertSafety(
        match_id
      );

    if (!safety) {
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
      BLOCKERS
      ========================================

      dry_run також НЕ може
      обійти blockers.
      ========================================
    */

    if (
      !safety.can_revert
    ) {
      return NextResponse.json(
        {
          success: false,

          dry_run:
            dry_run === true,

          error:
            "Результат цього матчу зараз не можна скасувати",

          blockers:
            safety.blockers,

          warnings:
            safety.warnings,

          dependencies:
            safety.dependencies,

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
        },
        {
          status: 409,
        }
      );
    }

    /*
      ========================================
      ORIGINAL RESULT
      ========================================
    */

    const originalHomeGoals =
      safety.match.home_goals;

    const originalAwayGoals =
      safety.match.away_goals;

    const originalPlayedAt =
      safety.match.played_at;

    const originalStatus =
      safety.match.status;

    if (
      originalStatus !==
        "finished" ||
      originalHomeGoals === null ||
      originalAwayGoals === null
    ) {
      return NextResponse.json(
        {
          success: false,

          dry_run:
            dry_run === true,

          error:
            "Матч уже не має завершеного результату",
        },
        {
          status: 409,
        }
      );
    }

    /*
      ========================================
      DRY RUN
      ========================================

      До цього моменту пройдені:

      - пароль;
      - match_id;
      - shared safety;
      - blockers;
      - status;
      - рахунок.

      Але БД не змінюється.
      ========================================
    */

    if (
      dry_run === true
    ) {
      return NextResponse.json({
        success: true,

        dry_run: true,

        can_revert: true,

        message:
          "Перевірка пройдена. Результат можна безпечно скасувати.",

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
            originalHomeGoals,

          away_goals:
            originalAwayGoals,

          status:
            originalStatus,

          played_at:
            originalPlayedAt,

          series_id:
            safety.match.series_id,

          is_tiebreak:
            safety.match.is_tiebreak,
        },

        blockers: [],

        warnings:
          safety.warnings,

        dependencies:
          safety.dependencies,
      });
    }

    /*
      ========================================
      ACTIVE SNAPSHOT CHECK
      ========================================

      Для одного матчу може бути
      лише один незакритий snapshot.

      Якщо такий уже є,
      нове скасування забороняємо.

      Це додатково захищено
      partial UNIQUE INDEX у БД.
      ========================================
    */

    const {
      data: activeSnapshots,
      error: activeSnapshotError,
    } = await supabaseAdmin
      .from(
        "match_result_revert_log"
      )
      .select(
        `
          id,
          match_id,
          reverted_at
        `
      )
      .eq(
        "match_id",
        safety.match.id
      )
      .is(
        "restored_at",
        null
      )
      .is("superseded_at", null)
      .limit(1);

    if (
      activeSnapshotError
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            activeSnapshotError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (
      activeSnapshots &&
      activeSnapshots.length >
        0
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Для цього матчу вже існує результат, доступний для відновлення. Спочатку виконай Restore result.",
        },
        {
          status: 409,
        }
      );
    }

    /*
      ========================================
      CREATE SNAPSHOT
      ========================================

      Snapshot створюється ДО
      очищення результату.

      Завдяки цьому ми пам'ятаємо
      точний історичний played_at,
      включно з null.
      ========================================
    */

    const {
      data: snapshot,
      error: snapshotError,
    } = await supabaseAdmin
      .from(
        "match_result_revert_log"
      )
      .insert({
        match_id:
          safety.match.id,

        home_goals:
          originalHomeGoals,

        away_goals:
          originalAwayGoals,

        status:
          originalStatus,

        played_at:
          originalPlayedAt,
      })
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
      .single();

    if (
      snapshotError ||
      !snapshot
    ) {
      /*
        PostgreSQL unique_violation.

        Може статись, якщо два
        запити одночасно спробували
        створити active snapshot.
      */

      if (
        snapshotError?.code ===
        "23505"
      ) {
        return NextResponse.json(
          {
            success: false,

            error:
              "Для цього матчу вже існує активний snapshot для відновлення.",
          },
          {
            status: 409,
          }
        );
      }

      return NextResponse.json(
        {
          success: false,

          error:
            snapshotError?.message ??
            "Не вдалося зберегти резервну копію результату",
        },
        {
          status: 500,
        }
      );
    }

    /*
      ========================================
      OPTIMISTIC SAFETY LOCK
      ========================================

      Між shared safety check
      та UPDATE стан матчу міг
      теоретично змінитися.

      Тому змінюємо рядок лише якщо
      ВСІ важливі поля досі такі самі:

      id
      status
      home_goals
      away_goals
      played_at
      ========================================
    */

    const baseUpdate =
      supabaseAdmin
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
          safety.match.id
        )
        .eq(
          "status",
          originalStatus
        )
        .eq(
          "home_goals",
          originalHomeGoals
        )
        .eq(
          "away_goals",
          originalAwayGoals
        );

    /*
      null потрібно порівнювати
      через IS NULL.

      Не-null timestamp —
      звичайним eq().
    */

    const guardedUpdate =
      originalPlayedAt === null
        ? baseUpdate.is(
            "played_at",
            null
          )
        : baseUpdate.eq(
            "played_at",
            originalPlayedAt
          );

    const {
      data: updatedMatches,
      error: updateError,
    } =
      await guardedUpdate.select(
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

    /*
      ========================================
      UPDATE ERROR
      ========================================

      Snapshot уже був створений.

      Якщо сам UPDATE не відбувся,
      пробуємо видалити snapshot,
      щоб не залишити фальшиву
      можливість Restore.
      ========================================
    */

    if (
      updateError
    ) {
      const {
        error:
          cleanupError,
      } =
        await supabaseAdmin
          .from(
            "match_result_revert_log"
          )
          .delete()
          .eq(
            "id",
            snapshot.id
          );

      if (
        cleanupError
      ) {
        console.error(
          "MATCH RESULT REVERT SNAPSHOT CLEANUP ERROR:",
          cleanupError
        );
      }

      return NextResponse.json(
        {
          success: false,
          error:
            updateError.message,
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

      Має бути змінений рівно
      один матч.

      0 рядків означає,
      що його стан змінився
      після safety check.
      ========================================
    */

    if (
      !updatedMatches ||
      updatedMatches.length !==
        1
    ) {
      const {
        error:
          cleanupError,
      } =
        await supabaseAdmin
          .from(
            "match_result_revert_log"
          )
          .delete()
          .eq(
            "id",
            snapshot.id
          );

      if (
        cleanupError
      ) {
        console.error(
          "MATCH RESULT REVERT SNAPSHOT CLEANUP ERROR:",
          cleanupError
        );

        return NextResponse.json(
          {
            success: false,

            error:
              "Стан матчу змінився, а резервний snapshot не вдалося автоматично очистити. Потрібна перевірка журналу відміни.",
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
            "Стан матчу змінився під час операції. Онови дані та повтори перевірку.",
        },
        {
          status: 409,
        }
      );
    }

    const revertedMatch =
      updatedMatches[0];

    /*
      ========================================
      SUCCESS
      ========================================
    */

    return NextResponse.json({
      success: true,

      dry_run: false,

      restore_available:
        true,

      snapshot_id:
        snapshot.id,

      message:
        "Результат матчу скасовано",

      previous_result: {
        home_goals:
          originalHomeGoals,

        away_goals:
          originalAwayGoals,

        status:
          originalStatus,

        played_at:
          originalPlayedAt,
      },

      match:
        revertedMatch,

      snapshot: {
        id:
          snapshot.id,

        reverted_at:
          snapshot.reverted_at,
      },

      warnings:
        safety.warnings,
    });
  } catch (
    error
  ) {
    console.error(
      "MATCH RESULT REVERT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Помилка відміни результату",
      },
      {
        status: 500,
      }
    );
  }
}