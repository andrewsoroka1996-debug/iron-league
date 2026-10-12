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

type DependencyMatch = {
  id: string;
  stage: string | null;
  round: number | null;
  series_id: string | null;
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
  КУБКИ ДИВІЗІОНІВ
  ========================================
*/

const divisionCupCompetitions = [
  "division-1-cup",
  "division-2-cup",
  "division-3-cup",
  "division-4-cup",
];

function isDivisionCup(
  competition: string
) {
  return divisionCupCompetitions.includes(
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
  НАСТУПНА СТАДІЯ КУБКА ДИВІЗІОНУ
  ========================================
*/

function getDivisionCupNextStage(
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
  НАСТУПНИЙ SLOT
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
  SLOT КУБКА АСОЦІАЦІЙ
  ========================================

  Наприклад:

  s2-associations-cup-quarterfinal-slot-3-archive

  -> slot 3

  У Кубку асоціацій round =
  номер матчу всередині серії.

  Тому номер пари беремо
  із series_id.
  ========================================
*/

function getAssociationBracketSlot(
  seriesId: string | null
): number | null {
  if (
    !seriesId
  ) {
    return null;
  }

  const match =
    seriesId.match(
      /-slot-(\d+)-/
    );

  if (
    !match
  ) {
    return null;
  }

  const slot =
    Number(
      match[1]
    );

  return Number.isInteger(
    slot
  )
    ? slot
    : null;
}

/*
  ========================================
  НАСТУПНІ СТАДІЇ
  ДЛЯ ЩЕ НЕ УТОЧНЕНИХ ТУРНІРІВ
  ========================================

  Консервативний захист.

  Зараз використовується,
  зокрема, для Iron Co-op Cup,
  доки немає реальних матчів
  для перевірки Undo.
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

  Цей API нічого не змінює
  в таблиці matches.

  Він лише визначає,
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

    if (
      !data
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

    const match =
      data as MatchRow;

    const blockers: string[] =
      [];

    const warnings: string[] =
      [];

    /*
      ========================================
      ЧИ Є ЗАВЕРШЕНИЙ РЕЗУЛЬТАТ
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
      ЗАЛЕЖНІ МАТЧІ
      ========================================
    */

    let laterStageMatches:
      DependencyMatch[] = [];

    /*
      ========================================
      1. ЄВРОКУБКИ
      ========================================
    */

    if (
      isEuropeanCompetition(
        match.competition
      )
    ) {
      /*
        ========================================
        GROUP -> PLAYOFF
        ========================================

        Якщо плей-оф уже сформовано,
        результат групового матчу
        не можна просто прибрати.

        Він може змінити таблицю
        та склад плей-оф.
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
                round,
                series_id
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
          (laterData ??
            []) as DependencyMatch[];

        if (
          laterStageMatches
            .length > 0
        ) {
          blockers.push(
            "Плей-оф уже сформований на основі групового етапу"
          );
        }
      }

      /*
        ========================================
        PLAYOFF -> NEXT ROUND
        ========================================

        R16:
        1 + 2 -> QF 1
        3 + 4 -> QF 2

        QF:
        1 + 2 -> SF 1
        3 + 4 -> SF 2

        SF:
        1 + 2 -> Final
      */

      else {
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
                    round,
                    series_id
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
              Фінал один.

              Для QF та SF
              перевіряємо точний slot.
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
              (laterData ??
                []) as DependencyMatch[];

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

      /*
        ========================================
        FINAL ЛЧ / ЛЄ -> СУПЕРКУБОК ЄВРОПИ
        ========================================

        Реальними даними Seasons 1–2
        підтверджено:

        Super Cup =
        Champions League winner
        +
        Europa League winner.

        Тому після створення
        Суперкубка результат фіналу
        ЛЧ або ЛЄ не можна просто
        скасувати.
      */

      if (
        (
          match.competition ===
            "champions-league" ||
          match.competition ===
            "europa-league"
        ) &&
        match.stage ===
          "final"
      ) {
        const {
          data: superCupData,
          error: superCupError,
        } =
          await supabaseAdmin
            .from("matches")
            .select(
              `
                id,
                stage,
                round,
                series_id
              `
            )
            .eq(
              "season",
              match.season
            )
            .eq(
              "competition",
              "european-super-cup"
            )
            .eq(
              "stage",
              "final"
            )
            .limit(10);

        if (
          superCupError
        ) {
          return NextResponse.json(
            {
              success: false,

              error:
                superCupError
                  .message,
            },
            {
              status: 500,
            }
          );
        }

        const superCupMatches =
          (superCupData ??
            []) as DependencyMatch[];

        if (
          superCupMatches
            .length > 0
        ) {
          laterStageMatches = [
            ...laterStageMatches,
            ...superCupMatches,
          ];

          blockers.push(
            "Вже створений Суперкубок Європи, склад якого залежить від результату цього фіналу"
          );
        }
      }
    }

    /*
      ========================================
      2. КУБКИ ДИВІЗІОНІВ
      ========================================

      Одноматчева сітка.

      R16:
      1 + 2 -> QF 1
      3 + 4 -> QF 2
      5 + 6 -> QF 3
      7 + 8 -> QF 4

      QF:
      1 + 2 -> SF 1
      3 + 4 -> SF 2

      SF:
      1 + 2 -> Final 1

      round = номер пари.
      ========================================
    */

    else if (
      isDivisionCup(
        match.competition
      )
    ) {
      const nextStage =
        getDivisionCupNextStage(
          match.stage
        );

      /*
        Final не має
        наступної стадії.
      */

      if (
        nextStage
      ) {
        if (
          match.round ===
          null
        ) {
          blockers.push(
            "Не вдалося визначити номер пари Кубка дивізіону"
          );
        } else {
          const nextRoundSlot =
            getNextRoundSlot(
              match.round
            );

          const {
            data: nextData,
            error: nextError,
          } =
            await supabaseAdmin
              .from("matches")
              .select(
                `
                  id,
                  stage,
                  round,
                  series_id
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
              )
              .eq(
                "round",
                nextRoundSlot
              )
              .limit(10);

          if (
            nextError
          ) {
            return NextResponse.json(
              {
                success:
                  false,

                error:
                  nextError.message,
              },
              {
                status: 500,
              }
            );
          }

          laterStageMatches =
            (nextData ??
              []) as DependencyMatch[];

          if (
            laterStageMatches
              .length > 0
          ) {
            blockers.push(
              "Вже створений наступний матч Кубка дивізіону, який залежить від цього результату"
            );
          }
        }
      }

      /*
        Якщо це не відома
        стадія та не Final,
        Undo краще заблокувати.
      */

      if (
        !nextStage &&
        match.stage !==
          "final"
      ) {
        blockers.push(
          "Не вдалося визначити стадію Кубка дивізіону"
        );
      }
    }

    /*
      ========================================
      3. КУБОК АСОЦІАЦІЙ
      ========================================
    */

    else if (
      match.competition ===
      "associations-cup"
    ) {
      /*
        ========================================
        QF -> КОНКРЕТНИЙ SF
        ========================================

        QF 1 + 2 -> SF 1
        QF 3 + 4 -> SF 2
      */

      if (
        match.stage ===
        "quarterfinal"
      ) {
        const bracketSlot =
          getAssociationBracketSlot(
            match.series_id
          );

        if (
          bracketSlot ===
          null
        ) {
          blockers.push(
            "Не вдалося визначити місце цього протистояння Кубка асоціацій у сітці"
          );
        } else {
          const nextSlot =
            getNextRoundSlot(
              bracketSlot
            );

          const {
            data: semifinalData,
            error: semifinalError,
          } =
            await supabaseAdmin
              .from("matches")
              .select(
                `
                  id,
                  stage,
                  round,
                  series_id
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
                "stage",
                "semifinal"
              );

          if (
            semifinalError
          ) {
            return NextResponse.json(
              {
                success:
                  false,

                error:
                  semifinalError
                    .message,
              },
              {
                status: 500,
              }
            );
          }

          laterStageMatches =
            (
              (semifinalData ??
                []) as DependencyMatch[]
            ).filter(
              (
                dependentMatch
              ) =>
                getAssociationBracketSlot(
                  dependentMatch
                    .series_id
                ) ===
                nextSlot
            );

          if (
            laterStageMatches
              .length > 0
          ) {
            blockers.push(
              "Вже створений півфінал Кубка асоціацій, який залежить від результату цієї чвертьфінальної пари"
            );
          }
        }
      }

      /*
        ========================================
        SF -> FINAL

        Season 2:
        SF -> FINAL
        +
        SF -> THIRD PLACE
        ========================================
      */

      if (
        match.stage ===
        "semifinal"
      ) {
        const bracketSlot =
          getAssociationBracketSlot(
            match.series_id
          );

        if (
          bracketSlot ===
          null
        ) {
          blockers.push(
            "Не вдалося визначити місце цього півфіналу Кубка асоціацій у сітці"
          );
        } else {
          const dependentStages =
            match.season === 2
              ? [
                  "final",
                  "third-place",
                ]
              : [
                  "final",
                ];

          const {
            data: nextData,
            error: nextError,
          } =
            await supabaseAdmin
              .from("matches")
              .select(
                `
                  id,
                  stage,
                  round,
                  series_id
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
              .in(
                "stage",
                dependentStages
              );

          if (
            nextError
          ) {
            return NextResponse.json(
              {
                success:
                  false,

                error:
                  nextError.message,
              },
              {
                status: 500,
              }
            );
          }

          laterStageMatches =
            (
              (nextData ??
                []) as DependencyMatch[]
            ).filter(
              (
                dependentMatch
              ) =>
                getAssociationBracketSlot(
                  dependentMatch
                    .series_id
                ) ===
                1
            );

          if (
            laterStageMatches
              .length > 0
          ) {
            blockers.push(
              match.season ===
                2
                ? "Вже створені фінальні залежності Кубка асоціацій: фінал або матч за 3 місце"
                : "Вже створений фінал Кубка асоціацій, який залежить від цього півфіналу"
            );
          }
        }
      }

      /*
        Final та Third-place
        наступної стадії
        в Кубку асоціацій
        уже не мають.
      */
    }

    /*
      ========================================
      4. ІНШІ ТУРНІРИ
      ========================================

      Консервативна логіка.

      Зокрема Iron Co-op Cup.

      У Season 3 для нього зараз
      немає матчів у БД,
      тому точну Undo-логіку
      ще не активуємо.
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
                round,
                series_id
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
          (laterData ??
            []) as DependencyMatch[];

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
      5. КУБОК АСОЦІАЦІЙ:
      7-Й ВИРІШАЛЬНИЙ МАТЧ
      ========================================

      Якщо Undo робиться
      для одного з перших
      шести матчів серії,
      але 7-й уже створений,
      Undo блокується.

      Інакше 7-й матч може
      залишитися існувати
      без законної підстави.
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
        tiebreakData ??
        [];

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
      6. КВАЛІФІКАЦІЯ СЕЗОНУ
      ========================================

      Якщо після кваліфікації
      вже сформований календар
      дивізіонів цього сезону,
      результат кваліфікації
      автоматично не скасовуємо.

      Склад дивізіонів уже залежить
      від підсумку кваліфікації.
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
              count:
                "exact",

              head:
                true,
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
        count ??
        0;

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
      SERIES WARNING
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
      TIEBREAK WARNING
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
      blockers.length ===
      0;

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
          laterStageMatches
            .length,

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
          error instanceof
          Error
            ? error.message
            : "Помилка перевірки відміни результату",
      },
      {
        status: 500,
      }
    );
  }
}