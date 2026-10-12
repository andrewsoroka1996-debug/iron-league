import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabase-admin";

type PreviewBody = {
  password?: string;
  match_id?: string;
};

type MatchRow = {
  id: string;

  season: number;
  competition: string;

  division: number | null;

  round: number | null;
  stage: string | null;
  group_name: string | null;
  leg: number | null;

  participant_type: string;

  home_id: string;
  away_id: string;

  home_goals: number | null;
  away_goals: number | null;

  status: string;

  played_at: string | null;

  series_id: string | null;

  series_home_id: string | null;
  series_away_id: string | null;

  is_tiebreak: boolean;
};

/*
  ========================================
  ЄВРОКУБКИ
  ========================================
*/

const europeanCompetitions = [
  "champions-league",
  "europa-league",
  "conference-league",
];

function isEuropeanCompetition(
  competition: string
) {
  return europeanCompetitions.includes(
    competition
  );
}

/*
  ========================================
  НАСТУПНА СТАДІЯ ЄВРОКУБКУ
  ========================================
*/

function getEuropeanNextStage(
  stage: string | null
): string | null {
  if (
    stage === "round-of-16"
  ) {
    return "quarterfinal";
  }

  if (
    stage === "quarterfinal"
  ) {
    return "semifinal";
  }

  if (
    stage === "semifinal"
  ) {
    return "final";
  }

  return null;
}

/*
  ========================================
  НАСТУПНИЙ СЛОТ СІТКИ
  ========================================

  1 + 2 -> 1
  3 + 4 -> 2
  5 + 6 -> 3
  7 + 8 -> 4
  ========================================
*/

function getNextRoundSlot(
  bracketSlot: number
) {
  return Math.ceil(
    bracketSlot / 2
  );
}

/*
  ========================================
  НАСТУПНІ СТАДІЇ
  ДЛЯ ІНШИХ ТУРНІРІВ
  ========================================

  Поки використовується
  консервативна перевірка.

  Точну структуру кожного
  іншого турніру перевіримо
  окремо до реального Undo.
  ========================================
*/

function getLaterStages(
  stage: string | null
): string[] {
  if (
    stage === "group"
  ) {
    return [
      "round-of-16",
      "quarterfinal",
      "semifinal",
      "final",
      "third-place",
    ];
  }

  if (
    stage === "round-of-16"
  ) {
    return [
      "quarterfinal",
      "semifinal",
      "final",
      "third-place",
    ];
  }

  if (
    stage === "quarterfinal"
  ) {
    return [
      "semifinal",
      "final",
      "third-place",
    ];
  }

  if (
    stage === "semifinal"
  ) {
    return [
      "final",
      "third-place",
    ];
  }

  return [];
}

/*
  ========================================
  POST
  ========================================

  READ ONLY.

  Нічого не змінює в БД.

  Лише перевіряє,
  чи можна безпечно
  скасувати результат.
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
      MATCH
      ========================================
    */

    const {
      data,
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
      .maybeSingle();

    if (matchError) {
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

    if (!data) {
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

    const match =
      data as MatchRow;

    const blockers: string[] =
      [];

    const warnings: string[] =
      [];

    /*
      ========================================
      ЧИ Є ЩО СКАСОВУВАТИ
      ========================================
    */

    const hasResult =
      match.status ===
        "finished" &&
      match.home_goals !==
        null &&
      match.away_goals !==
        null;

    if (
      !hasResult
    ) {
      blockers.push(
        "Матч не має завершеного результату"
      );
    }

    /*
      ========================================
      НАСТУПНА СТАДІЯ
      ========================================

      Для єврокубків використовуємо
      точну структуру сітки.

      Для інших турнірів поки
      залишається консервативна
      перевірка.
      ========================================
    */

    let laterStageMatches:
      {
        id: string;
        stage: string | null;
        round: number | null;
      }[] = [];

    /*
      ========================================
      ЄВРОКУБКИ
      ========================================
    */

    if (
      isEuropeanCompetition(
        match.competition
      )
    ) {
      /*
        ======================================
        GROUP -> PLAYOFF
        ======================================

        Якщо вже створена будь-яка
        стадія плей-оф, результат
        групового матчу автоматично
        не скасовуємо.

        Він потенційно може змінити
        турнірну таблицю та склад
        учасників плей-оф.
        ======================================
      */

      if (
        match.stage ===
        "group"
      ) {
        const {
          data: laterData,
          error: laterError,
        } =
          await supabaseAdmin
            .from("matches")
            .select(
              `
                id,
                stage,
                round
              `
            )
            .eq(
              "season",
              match.season
            )
            .eq(
              "competition",
              match.competition
            )
            .in(
              "stage",
              [
                "round-of-16",
                "quarterfinal",
                "semifinal",
                "final",
              ]
            )
            .limit(20);

        if (
          laterError
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                laterError.message,
            },
            {
              status: 500,
            }
          );
        }

        laterStageMatches =
          laterData ?? [];

        if (
          laterStageMatches
            .length > 0
        ) {
          blockers.push(
            "Плей-оф уже сформований на основі групового етапу"
          );
        }
      } else {
        /*
          ====================================
          PLAYOFF -> NEXT ROUND
          ====================================

          Перевіряємо лише ту
          наступну пару, яка реально
          залежить від поточного
          bracket slot.
          ====================================
        */

        const nextStage =
          getEuropeanNextStage(
            match.stage
          );

        if (
          nextStage
        ) {
          if (
            match.round ===
            null
          ) {
            blockers.push(
              "Не вдалося визначити місце цього протистояння в сітці"
            );
          } else {
            const nextRoundSlot =
              getNextRoundSlot(
                match.round
              );

            let nextStageQuery =
              supabaseAdmin
                .from("matches")
                .select(
                  `
                    id,
                    stage,
                    round
                  `
                )
                .eq(
                  "season",
                  match.season
                )
                .eq(
                  "competition",
                  match.competition
                )
                .eq(
                  "stage",
                  nextStage
                );

            /*
              Для 1/4 та 1/2
              наступний slot
              має бути точним.

              Для фіналу пара одна,
              тому достатньо самого
              факту існування фіналу.
            */

            if (
              nextStage !==
              "final"
            ) {
              nextStageQuery =
                nextStageQuery.eq(
                  "round",
                  nextRoundSlot
                );
            }

            const {
              data: laterData,
              error: laterError,
            } =
              await nextStageQuery
                .limit(20);

            if (
              laterError
            ) {
              return NextResponse.json(
                {
                  success:
                    false,

                  error:
                    laterError
                      .message,
                },
                {
                  status: 500,
                }
              );
            }

            laterStageMatches =
              laterData ?? [];

            if (
              laterStageMatches
                .length > 0
            ) {
              blockers.push(
                "Вже створене наступне протистояння, яке залежить від результату цієї пари"
              );
            }
          }
        }
      }
    }

    /*
      ========================================
      ІНШІ ТУРНІРИ
      ========================================

      Поки залишаємо
      максимально обережну
      перевірку.

      До реального Undo
      для кожного такого турніру
      окремо звіримо його сітку.
      ========================================
    */

    else {
      const laterStages =
        getLaterStages(
          match.stage
        );

      if (
        laterStages.length >
        0
      ) {
        const {
          data: laterData,
          error: laterError,
        } =
          await supabaseAdmin
            .from("matches")
            .select(
              `
                id,
                stage,
                round
              `
            )
            .eq(
              "season",
              match.season
            )
            .eq(
              "competition",
              match.competition
            )
            .in(
              "stage",
              laterStages
            )
            .limit(20);

        if (
          laterError
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                laterError.message,
            },
            {
              status: 500,
            }
          );
        }

        laterStageMatches =
          laterData ?? [];

        if (
          laterStageMatches
            .length > 0
        ) {
          blockers.push(
            "Для цього турніру вже створена наступна стадія"
          );
        }
      }
    }

    /*
      ========================================
      КУБОК АСОЦІАЦІЙ:
      7-Й МАТЧ
      ========================================

      Якщо результат одного
      з основних 6 матчів
      хочемо скасувати,
      але 7-й матч уже створений,
      автоматичну відміну
      блокуємо.

      Сам факт існування
      7-го матчу залежить
      від результатів перших 6.
      ========================================
    */

    let associationTiebreakMatches:
      {
        id: string;
        status: string;
      }[] = [];

    if (
      match.competition ===
        "associations-cup" &&
      match.series_id &&
      !match.is_tiebreak
    ) {
      const {
        data: tiebreakData,
        error: tiebreakError,
      } =
        await supabaseAdmin
          .from("matches")
          .select(
            `
              id,
              status
            `
          )
          .eq(
            "season",
            match.season
          )
          .eq(
            "competition",
            "associations-cup"
          )
          .eq(
            "series_id",
            match.series_id
          )
          .eq(
            "is_tiebreak",
            true
          );

      if (
        tiebreakError
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              tiebreakError
                .message,
          },
          {
            status: 500,
          }
        );
      }

      associationTiebreakMatches =
        tiebreakData ?? [];

      if (
        associationTiebreakMatches
          .length > 0
      ) {
        blockers.push(
          "Для цього протистояння вже створений 7-й вирішальний матч"
        );
      }
    }

    /*
      ========================================
      КВАЛІФІКАЦІЯ
      ========================================

      Якщо після кваліфікації
      вже створені матчі дивізіонів,
      автоматичну відміну
      блокуємо.

      Склад дивізіонів уже міг
      залежати від результатів
      кваліфікації.
      ========================================
    */

    let divisionMatchesAfterQualification =
      0;

    if (
      match.competition ===
      "qualification"
    ) {
      const {
        count,
        error: divisionError,
      } =
        await supabaseAdmin
          .from("matches")
          .select(
            "id",
            {
              count: "exact",
              head: true,
            }
          )
          .eq(
            "season",
            match.season
          )
          .eq(
            "competition",
            "division"
          );

      if (
        divisionError
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              divisionError
                .message,
          },
          {
            status: 500,
          }
        );
      }

      divisionMatchesAfterQualification =
        count ?? 0;

      if (
        divisionMatchesAfterQualification >
        0
      ) {
        blockers.push(
          "Після цієї кваліфікації вже створені матчі дивізіонів сезону"
        );
      }
    }

    /*
      ========================================
      SERIES INFO
      ========================================

      Сам факт участі в серії
      не є blocker.

      Якщо залежної наступної
      стадії ще немає,
      результат можна буде
      повернути в scheduled.

      Підсумок серії після цього
      перерахується з актуальних
      результатів.
      ========================================
    */

    if (
      match.series_id
    ) {
      warnings.push(
        "Матч входить до турнірного протистояння; після відміни його підсумок буде перераховано"
      );
    }

    /*
      ========================================
      TIEBREAK
      ========================================
    */

    if (
      match.is_tiebreak
    ) {
      warnings.push(
        "Це вирішальний тай-брейк; буде скасовано лише його результат, сам матч залишиться"
      );
    }

    /*
      ========================================
      RESULT
      ========================================
    */

    const canRevert =
      blockers.length === 0;

    return NextResponse.json({
      success: true,

      can_revert:
        canRevert,

      match: {
        id:
          match.id,

        season:
          match.season,

        competition:
          match.competition,

        division:
          match.division,

        stage:
          match.stage,

        round:
          match.round,

        leg:
          match.leg,

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

        played_at:
          match.played_at,

        series_id:
          match.series_id,

        is_tiebreak:
          match.is_tiebreak,
      },

      blockers,
      warnings,

      dependencies: {
        later_stage_matches:
          laterStageMatches.length,

        association_tiebreak_matches:
          associationTiebreakMatches
            .length,

        division_matches_after_qualification:
          divisionMatchesAfterQualification,
      },
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