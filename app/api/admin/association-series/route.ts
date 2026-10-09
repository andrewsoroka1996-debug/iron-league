import { randomUUID } from "crypto";

import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabase-admin";

import { calculateAssociationSeries } from "../../../../lib/association-series";

import { getCompetitionAssociations } from "../../../../data/competitions/get-competition-associations";

import { getCompetitionStages } from "../../../../data/competitions/get-competition-stages";

import type { SeasonNumber } from "../../../../data/competitions/season-competitions";

type Pairing = {
  home_id: string;
  away_id: string;
};

type CreateSeriesBody = {
  password?: string;

  season?: number;

  stage?: string;

  association_home_id?: string;
  association_away_id?: string;

  pairings?: Pairing[];

  /*
    Номер протистояння
    у турнірній сітці.
  */

  bracket_slot?: number;
};

/*
  ========================================
  КІЛЬКІСТЬ ПРОТИСТОЯНЬ НА СТАДІЇ
  ========================================
*/

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
  НОМЕР ПАРИ ІЗ SERIES ID
  ========================================

  Наприклад:

  s3-associations-cup-quarterfinal-slot-2-UUID

  → slot = 2

  round НЕ використовуємо
  для номера пари сітки,
  тому що round уже означає
  номер матчу всередині
  протистояння 1...6 / 7.
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

  if (!Number.isInteger(slot)) {
    return null;
  }

  return slot;
}

/*
  ==========================================
  GET
  ==========================================

  Отримує конкретне протистояння
  Кубка асоціацій через series_id.

  Повертає:

  - всі матчі серії;
  - очки;
  - голи;
  - різницю;
  - переможця;
  - статус тай-брейку;
  - номер пари в сітці.
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

    const seriesId =
      searchParams.get(
        "series_id"
      );

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
      SERIES ID
      ========================================
    */

    if (!seriesId) {
      return NextResponse.json(
        {
          error:
            "Не вказано ID протистояння",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      МАТЧІ СЕРІЇ
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
          season,
          competition,
          stage,
          round,
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
        "season",
        season
      )
      .eq(
        "competition",
        "associations-cup"
      )
      .eq(
        "series_id",
        seriesId
      )
      .order(
        "is_tiebreak",
        {
          ascending: true,
        }
      )
      .order(
        "round",
        {
          ascending: true,
          nullsFirst: false,
        }
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
      data ?? [];

    if (
      matches.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Протистояння не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    /*
      ========================================
      АСОЦІАЦІЇ
      ========================================
    */

    const firstMatch =
      matches[0];

    const homeAssociationId =
      firstMatch.series_home_id;

    const awayAssociationId =
      firstMatch.series_away_id;

    if (
      !homeAssociationId ||
      !awayAssociationId
    ) {
      return NextResponse.json(
        {
          error:
            "У протистоянні не вказані асоціації",
        },
        {
          status: 500,
        }
      );
    }

    const associations =
      getCompetitionAssociations({
        season:
          season as SeasonNumber,

        competition:
          "associations-cup",
      });

    const homeAssociation =
      associations.find(
        (association) =>
          association.id ===
          homeAssociationId
      );

    const awayAssociation =
      associations.find(
        (association) =>
          association.id ===
          awayAssociationId
      );

    /*
      ========================================
      РОЗРАХУНОК СЕРІЇ
      ========================================
    */

    const summary =
      calculateAssociationSeries(
        matches.map(
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

    /*
      ========================================
      RESPONSE
      ========================================
    */

    return NextResponse.json({
      success: true,

      series: {
        id:
          seriesId,

        bracket_slot:
          getBracketSlotFromSeriesId(
            seriesId
          ),

        season,

        stage:
          firstMatch.stage,

        home: {
          id:
            homeAssociationId,

          name:
            homeAssociation?.name ??
            homeAssociationId,
        },

        away: {
          id:
            awayAssociationId,

          name:
            awayAssociation?.name ??
            awayAssociationId,
        },
      },

      matches,

      summary,
    });
  } catch (error) {
    console.error(
      "ASSOCIATION SERIES GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Помилка завантаження протистояння",
      },
      {
        status: 500,
      }
    );
  }
}

/*
  ==========================================
  POST
  ==========================================

  Створює одне протистояння
  Кубка асоціацій.

  Одне протистояння =
  6 окремих матчів.

  Всі 6 матчів мають
  однаковий series_id.
*/

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as CreateSeriesBody;

    const {
      password,

      season,

      stage,

      association_home_id,
      association_away_id,

      pairings,

      bracket_slot,
    } = body;

    /*
      ========================================
      ПАРОЛЬ
      ========================================
    */

    if (
      !process.env.ADMIN_PASSWORD ||
      password !==
        process.env.ADMIN_PASSWORD
    ) {
      return NextResponse.json(
        {
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
      СЕЗОН
      ========================================
    */

    if (
      season === undefined ||
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

    const seasonNumber =
      season as SeasonNumber;

    /*
      ========================================
      СТАДІЯ
      ========================================
    */

    if (!stage) {
      return NextResponse.json(
        {
          error:
            "Не вказана стадія",
        },
        {
          status: 400,
        }
      );
    }

    const allowedStages =
      getCompetitionStages({
        season:
          seasonNumber,

        competition:
          "associations-cup",
      });

    const stageExists =
      allowedStages.some(
        (item) =>
          item.value === stage
      );

    if (!stageExists) {
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

    if (expectedSeries === 0) {
      return NextResponse.json(
        {
          error:
            "Для цієї стадії не визначено структуру сітки",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      АСОЦІАЦІЇ
      ========================================
    */

    if (
      !association_home_id ||
      !association_away_id
    ) {
      return NextResponse.json(
        {
          error:
            "Оберіть дві асоціації",
        },
        {
          status: 400,
        }
      );
    }

    if (
      association_home_id ===
      association_away_id
    ) {
      return NextResponse.json(
        {
          error:
            "Асоціація не може грати сама із собою",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      СКЛАДИ АСОЦІАЦІЙ
      ========================================
    */

    const associations =
      getCompetitionAssociations({
        season:
          seasonNumber,

        competition:
          "associations-cup",
      });

    const homeAssociation =
      associations.find(
        (association) =>
          association.id ===
          association_home_id
      );

    const awayAssociation =
      associations.find(
        (association) =>
          association.id ===
          association_away_id
      );

    if (
      !homeAssociation ||
      !awayAssociation
    ) {
      return NextResponse.json(
        {
          error:
            "Не знайдено склад однієї з асоціацій",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      6 ПАР
      ========================================
    */

    if (
      !Array.isArray(pairings) ||
      pairings.length !== 6
    ) {
      return NextResponse.json(
        {
          error:
            "Протистояння повинно містити рівно 6 матчів",
        },
        {
          status: 400,
        }
      );
    }

    /*
      Перевіряємо кожну пару.
    */

    for (
      let index = 0;
      index < pairings.length;
      index += 1
    ) {
      const pairing =
        pairings[index];

      if (
        !pairing.home_id ||
        !pairing.away_id
      ) {
        return NextResponse.json(
          {
            error:
              `Не вибрані гравці у матчі ${
                index + 1
              }`,
          },
          {
            status: 400,
          }
        );
      }

      if (
        !homeAssociation.players.includes(
          pairing.home_id
        )
      ) {
        return NextResponse.json(
          {
            error:
              `Гравець ${
                pairing.home_id
              } не належить асоціації ${
                homeAssociation.name
              }`,
          },
          {
            status: 400,
          }
        );
      }

      if (
        !awayAssociation.players.includes(
          pairing.away_id
        )
      ) {
        return NextResponse.json(
          {
            error:
              `Гравець ${
                pairing.away_id
              } не належить асоціації ${
                awayAssociation.name
              }`,
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
      ========================================
      БЕЗ ПОВТОРІВ ГРАВЦІВ
      ========================================
    */

    const homePlayers =
      pairings.map(
        (pairing) =>
          pairing.home_id
      );

    const awayPlayers =
      pairings.map(
        (pairing) =>
          pairing.away_id
      );

    if (
      new Set(
        homePlayers
      ).size !== 6
    ) {
      return NextResponse.json(
        {
          error:
            "Гравець першої асоціації використаний більше одного разу",
        },
        {
          status: 400,
        }
      );
    }

    if (
      new Set(
        awayPlayers
      ).size !== 6
    ) {
      return NextResponse.json(
        {
          error:
            "Гравець другої асоціації використаний більше одного разу",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      ПЕРЕВІРКА ДУБЛІКАТА ПРОТИСТОЯННЯ
      ========================================
    */

    const {
      data: directSeries,
      error: directError,
    } = await supabaseAdmin
      .from("matches")
      .select("id")
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
      )
      .eq(
        "series_home_id",
        association_home_id
      )
      .eq(
        "series_away_id",
        association_away_id
      )
      .limit(1);

    if (directError) {
      return NextResponse.json(
        {
          error:
            directError.message,
        },
        {
          status: 500,
        }
      );
    }

    /*
      Зворотний порядок.
    */

    const {
      data: reverseSeries,
      error: reverseError,
    } = await supabaseAdmin
      .from("matches")
      .select("id")
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
      )
      .eq(
        "series_home_id",
        association_away_id
      )
      .eq(
        "series_away_id",
        association_home_id
      )
      .limit(1);

    if (reverseError) {
      return NextResponse.json(
        {
          error:
            reverseError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (
      (directSeries?.length ??
        0) > 0 ||
      (reverseSeries?.length ??
        0) > 0
    ) {
      return NextResponse.json(
        {
          error:
            "Таке протистояння асоціацій уже створене",
        },
        {
          status: 409,
        }
      );
    }

    /*
      ========================================
      ІСНУЮЧІ ПРОТИСТОЯННЯ СТАДІЇ
      ========================================

      Потрібні для визначення
      вільного bracket slot.
    */

    const {
      data: existingStageMatches,
      error: existingStageError,
    } = await supabaseAdmin
      .from("matches")
      .select(
        `
          series_id
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

    if (existingStageError) {
      return NextResponse.json(
        {
          error:
            existingStageError.message,
        },
        {
          status: 500,
        }
      );
    }

    const existingSeriesIds =
      new Set<string>();

    const occupiedSlots =
      new Set<number>();

    for (
      const match of
        existingStageMatches ?? []
    ) {
      if (!match.series_id) {
        continue;
      }

      existingSeriesIds.add(
        match.series_id
      );

      const slot =
        getBracketSlotFromSeriesId(
          match.series_id
        );

      if (slot !== null) {
        occupiedSlots.add(
          slot
        );
      }
    }

    /*
      Якщо кількість серій уже
      дорівнює максимуму стадії,
      більше створювати не можна.
    */

    if (
      existingSeriesIds.size >=
      expectedSeries
    ) {
      return NextResponse.json(
        {
          error:
            "Усі протистояння цієї стадії вже створені",
        },
        {
          status: 409,
        }
      );
    }

    /*
      ========================================
      BRACKET SLOT
      ========================================
    */

    let bracketSlot:
      | number
      | null = null;

    /*
      Якщо форма передала
      конкретний слот —
      використовуємо його.
    */

    if (
      bracket_slot !== undefined
    ) {
      if (
        !Number.isInteger(
          bracket_slot
        ) ||
        bracket_slot < 1 ||
        bracket_slot >
          expectedSeries
      ) {
        return NextResponse.json(
          {
            error:
              "Невірний номер пари в сітці",
          },
          {
            status: 400,
          }
        );
      }

      if (
        occupiedSlots.has(
          bracket_slot
        )
      ) {
        return NextResponse.json(
          {
            error:
              `Пара №${bracket_slot} вже створена`,
          },
          {
            status: 409,
          }
        );
      }

      bracketSlot =
        bracket_slot;
    } else {
      /*
        Для ручного жеребкування
        беремо перший вільний слот.
      */

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
          bracketSlot =
            slot;

          break;
        }
      }
    }

    if (
      bracketSlot === null
    ) {
      return NextResponse.json(
        {
          error:
            "Не знайдено вільного місця в турнірній сітці",
        },
        {
          status: 409,
        }
      );
    }

    /*
      ========================================
      SERIES ID
      ========================================

      Тут зберігаємо номер
      протистояння у сітці.

      round залишаємо для
      матчів 1...6.
    */

    const seriesId =
      `s${season}-associations-cup-${stage}-slot-${bracketSlot}-${randomUUID()}`;

    /*
      ========================================
      ГОТУЄМО 6 МАТЧІВ
      ========================================
    */

    const rows =
      pairings.map(
        (
          pairing,
          index
        ) => ({
          season,

          competition:
            "associations-cup",

          division:
            null,

          stage,

          group_name:
            null,

          /*
            Номер матчу
            всередині серії.
          */

          round:
            index + 1,

          leg:
            1,

          participant_type:
            "player",

          home_id:
            pairing.home_id,

          away_id:
            pairing.away_id,

          home_goals:
            null,

          away_goals:
            null,

          status:
            "scheduled",

          played_at:
            null,

          series_id:
            seriesId,

          series_home_id:
            association_home_id,

          series_away_id:
            association_away_id,

          is_tiebreak:
            false,
        })
      );

    /*
      ========================================
      INSERT 6 МАТЧІВ
      ========================================
    */

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("matches")
      .insert(rows)
      .select(
        `
          id,
          season,
          competition,
          stage,
          round,
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

    return NextResponse.json({
      success: true,

      message:
        "Протистояння 6×6 створено",

      series_id:
        seriesId,

      bracket_slot:
        bracketSlot,

      association_home: {
        id:
          association_home_id,

        name:
          homeAssociation.name,
      },

      association_away: {
        id:
          association_away_id,

        name:
          awayAssociation.name,
      },

      matches:
        data ?? [],
    });
  } catch (error) {
    console.error(
      "ASSOCIATION SERIES POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Помилка створення протистояння асоціацій",
      },
      {
        status: 500,
      }
    );
  }
}

/*
  ==========================================
  PUT
  ==========================================

  Створює 7-й вирішальний матч.

  Дозволено тільки якщо:

  - завершені всі 6 матчів;
  - очки рівні;
  - різниця голів рівна;
  - 7-го матчу ще немає.
*/

export async function PUT(
  request: Request
) {
  try {
    const body =
      await request.json();

    const {
      password,

      season,

      series_id,

      home_id,
      away_id,
    } = body;

    /*
      ========================================
      ПАРОЛЬ
      ========================================
    */

    if (
      !process.env.ADMIN_PASSWORD ||
      password !==
        process.env.ADMIN_PASSWORD
    ) {
      return NextResponse.json(
        {
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
      SERIES ID
      ========================================
    */

    if (
      !series_id ||
      typeof series_id !==
        "string"
    ) {
      return NextResponse.json(
        {
          error:
            "Не вказано протистояння",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      ГРАВЦІ
      ========================================
    */

    if (
      !home_id ||
      !away_id ||
      typeof home_id !==
        "string" ||
      typeof away_id !==
        "string"
    ) {
      return NextResponse.json(
        {
          error:
            "Оберіть двох гравців",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      ЗАВАНТАЖУЄМО ВСЮ СЕРІЮ
      ========================================
    */

    const {
      data: matches,
      error: matchesError,
    } = await supabaseAdmin
      .from("matches")
      .select(
        `
          id,
          season,
          competition,
          stage,
          round,
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
        "season",
        season
      )
      .eq(
        "competition",
        "associations-cup"
      )
      .eq(
        "series_id",
        series_id
      );

    if (matchesError) {
      return NextResponse.json(
        {
          error:
            matchesError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (
      !matches ||
      matches.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Протистояння не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    /*
      ========================================
      ПІДСУМОК СЕРІЇ
      ========================================
    */

    const summary =
      calculateAssociationSeries(
        matches.map(
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

    /*
      7-й матч дозволений
      лише при повній рівності.
    */

    if (
      summary.status !==
      "needs-tiebreak"
    ) {
      return NextResponse.json(
        {
          error:
            "7-й матч для цього протистояння не потрібен",
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      ДАНІ АСОЦІАЦІЙ
      ========================================
    */

    const firstMatch =
      matches[0];

    const homeAssociationId =
      firstMatch.series_home_id;

    const awayAssociationId =
      firstMatch.series_away_id;

    if (
      !homeAssociationId ||
      !awayAssociationId
    ) {
      return NextResponse.json(
        {
          error:
            "Не знайдено асоціації серії",
        },
        {
          status: 500,
        }
      );
    }

    const associations =
      getCompetitionAssociations({
        season:
          season as SeasonNumber,

        competition:
          "associations-cup",
      });

    const homeAssociation =
      associations.find(
        (association) =>
          association.id ===
          homeAssociationId
      );

    const awayAssociation =
      associations.find(
        (association) =>
          association.id ===
          awayAssociationId
      );

    if (
      !homeAssociation ||
      !awayAssociation
    ) {
      return NextResponse.json(
        {
          error:
            "Не знайдено склади асоціацій",
        },
        {
          status: 500,
        }
      );
    }

    /*
      ========================================
      ПЕРЕВІРЯЄМО ГРАВЦІВ
      ========================================
    */

    if (
      !homeAssociation.players.includes(
        home_id
      )
    ) {
      return NextResponse.json(
        {
          error:
            `${home_id} не належить асоціації ${homeAssociation.name}`,
        },
        {
          status: 400,
        }
      );
    }

    if (
      !awayAssociation.players.includes(
        away_id
      )
    ) {
      return NextResponse.json(
        {
          error:
            `${away_id} не належить асоціації ${awayAssociation.name}`,
        },
        {
          status: 400,
        }
      );
    }

    /*
      ========================================
      СТВОРЕННЯ 7-ГО МАТЧУ
      ========================================
    */

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("matches")
      .insert({
        season,

        competition:
          "associations-cup",

        division:
          null,

        stage:
          firstMatch.stage,

        group_name:
          null,

        /*
          7-й вирішальний матч.
        */

        round:
          7,

        leg:
          1,

        participant_type:
          "player",

        home_id,

        away_id,

        home_goals:
          null,

        away_goals:
          null,

        status:
          "scheduled",

        played_at:
          null,

        series_id,

        series_home_id:
          homeAssociationId,

        series_away_id:
          awayAssociationId,

        is_tiebreak:
          true,
      })
      .select(
        `
          id,
          season,
          competition,
          stage,
          round,
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
      .single();

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

    return NextResponse.json({
      success: true,

      message:
        "7-й вирішальний матч створено",

      bracket_slot:
        getBracketSlotFromSeriesId(
          series_id
        ),

      match:
        data,
    });
  } catch (error) {
    console.error(
      "ASSOCIATION TIEBREAK ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Помилка створення 7-го матчу",
      },
      {
        status: 500,
      }
    );
  }
}