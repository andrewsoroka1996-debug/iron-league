import { Fragment } from "react";
import Link from "next/link";

import { players } from "../../data/players";

import {
  season1Coefficients,
  type ArchivedCoefficientRow,
} from "../../data/coefficients/season-1";

import {
  season2Coefficients,
} from "../../data/coefficients/season-2";

import { supabase } from "../../lib/supabase";

import {
  calculateCoefficients,
  type CoefficientMatch,
  type CoefficientRow,
  type SeasonNumber,
} from "../../lib/calculate-coefficients";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams: Promise<{
    season?: string;
  }>;
};

type SeasonFilter =
  | SeasonNumber
  | "all";

type SummaryRow = {
  key: string;

  playerId:
    | string
    | null;

  playerName: string;

  division:
    | number
    | null;

  divisionPoints: number;
  cupPoints: number;
  europePoints: number;
  superCupPoints: number;

  total: number;
};

/*
  ========================================
  ТУРНІРИ, ЯКІ ВРАХОВУЮТЬСЯ
  В КОЕФІЦІЄНТІ
  ========================================
*/

const COEFFICIENT_COMPETITIONS = [
  "division",

  "division-1-cup",
  "division-2-cup",
  "division-3-cup",

  "champions-league",
  "europa-league",

  "european-super-cup",
];

/*
  ========================================
  НІКНЕЙМ
  ========================================
*/

function getPlayerName(
  playerId: string
) {
  return (
    players.find(
      (player) =>
        player.id === playerId
    )?.nickname ?? playerId
  );
}

/*
  ========================================
  НОРМАЛІЗАЦІЯ НІКНЕЙМІВ

  Потрібна для прив'язки
  старих таблиць до профілів.
  ========================================
*/

function normalizePlayerName(
  value: string
) {
  return value
    .toLowerCase()
    .replace(
      /[^a-zа-яіїєґ0-9]/g,
      ""
    );
}

/*
  Старі варіанти нікнеймів,
  які відрізняються від
  сучасних внутрішніх ID.
*/

const ARCHIVE_PLAYER_ALIASES:
  Record<string, string> = {
  taraasykunl:
    "taraaasyk-unl",

  holyholy28:
    "holy",

  deyl:
    "deyl",

  vdodessaua:
    "d-odessaua",

  cahb14:
    "canb14",

  "6abobha":
    "6abovha",

  voidex:
    "v0id-ex",

  nostress23:
    "no-stress23",

  awpfun:
    "awp-fun",

  kol3nbka:
    "kol3nbka",

  thelp9:
    "thelp9",

  vovamonte:
    "vovamonte",

  zidane4423:
    "zidane4423",

  ruslanuapes:
    "ruslanuapes",

  arthurchamp07:
    "arthurchamp07",

  antidemon39:
    "antidemon39",

  as0910:
    "as0910",

  olejose11:
    "olejose11",

  verhor28:
    "verhor28",

  vladiken7:
    "vladiken7",

  soga:
    "soga",

  fourydeca:
    "4ydeca",
};

function findArchivePlayerId(
  playerName: string
) {
  const normalized =
    normalizePlayerName(
      playerName
    );

  /*
    Спочатку шукаємо
    по актуальному nickname або id.
  */

  const direct =
    players.find(
      (player) =>
        normalizePlayerName(
          player.nickname
        ) === normalized ||
        normalizePlayerName(
          player.id
        ) === normalized
    );

  if (direct) {
    return direct.id;
  }

  /*
    Потім перевіряємо
    старі варіанти.
  */

  return (
    ARCHIVE_PLAYER_ALIASES[
      normalized
    ] ?? null
  );
}

/*
  ========================================
  LIVE — ДИВІЗІОН
  ========================================
*/

function getDivisionPoints(
  row: CoefficientRow
) {
  return (
    row.breakdown
      .divisionMatches +
    row.breakdown
      .divisionPlace
  );
}

/*
  ========================================
  LIVE — КУБОК ДИВІЗІОНУ
  ========================================
*/

function getCupPoints(
  row: CoefficientRow
) {
  return (
    row.breakdown
      .divisionCupMatches +
    row.breakdown
      .divisionCupRounds +
    row.breakdown
      .divisionCupWinner
  );
}

/*
  ========================================
  LIVE — ЛЧ
  ========================================
*/

function getChampionsLeaguePoints(
  row: CoefficientRow
) {
  return (
    row.breakdown
      .championsLeagueMatches +
    row.breakdown
      .championsLeagueGroup +
    row.breakdown
      .championsLeagueRounds +
    row.breakdown
      .championsLeagueFinal
  );
}

/*
  ========================================
  LIVE — ЛЄ
  ========================================
*/

function getEuropaLeaguePoints(
  row: CoefficientRow
) {
  return (
    row.breakdown
      .europaLeagueMatches +
    row.breakdown
      .europaLeagueGroup +
    row.breakdown
      .europaLeagueRounds +
    row.breakdown
      .europaLeagueFinal
  );
}

function getEuropePoints(
  row: CoefficientRow
) {
  return (
    getChampionsLeaguePoints(
      row
    ) +
    getEuropaLeaguePoints(
      row
    )
  );
}

/*
  ========================================
  АРХІВНИЙ РЯДОК -> SUMMARY
  ========================================
*/

function archivedRowToSummary(
  row: ArchivedCoefficientRow
): SummaryRow {
  const playerId =
    findArchivePlayerId(
      row.playerName
    );

  return {
    key:
      playerId
        ? `player-${playerId}`
        : `archive-${normalizePlayerName(
            row.playerName
          )}`,

    playerId,

    playerName:
      row.playerName,

    division:
      row.division,

    divisionPoints:
      row.divisionMatchPoints +
      row.divisionPlaceBonus,

    cupPoints:
      row.cupMatchPoints +
      row.cupBonus,

    /*
      Для архівних сезонів
      нічого не перераховуємо.

      Старі бонуси ЛЧ / ЛЄ
      зберігаються буквально
      так, як вони були
      записані в історичних
      таблицях.
    */

    europePoints:
      row.championsLeagueMatchPoints +
      row.championsLeagueBonus +
      row.europaLeagueMatchPoints +
      row.europaLeagueBonus,

    /*
      У старих таблицях
      Суперкубок не був
      окремою колонкою.

      Тому його не намагаємося
      виділити заднім числом.
    */

    superCupPoints: 0,

    total:
      row.total,
  };
}

/*
  ========================================
  LIVE -> SUMMARY
  ========================================
*/

function liveRowToSummary(
  row: CoefficientRow
): SummaryRow {
  return {
    key:
      `player-${row.playerId}`,

    playerId:
      row.playerId,

    playerName:
      getPlayerName(
        row.playerId
      ),

    division:
      row.division,

    divisionPoints:
      getDivisionPoints(
        row
      ),

    cupPoints:
      getCupPoints(
        row
      ),

    europePoints:
      getEuropePoints(
        row
      ),

    superCupPoints:
      row.breakdown
        .europeanSuperCup,

    total:
      row.total,
  };
}

/*
  ========================================
  ЗАГАЛЬНИЙ РЕЙТИНГ
  ========================================
*/

function aggregateSummaryRows(
  groups:
    SummaryRow[][]
) {
  const map =
    new Map<
      string,
      SummaryRow
    >();

  for (
    const group of groups
  ) {
    for (
      const row of group
    ) {
      const existing =
        map.get(row.key);

      if (!existing) {
        map.set(
          row.key,
          {
            ...row,

            division: null,
          }
        );

        continue;
      }

      existing.divisionPoints +=
        row.divisionPoints;

      existing.cupPoints +=
        row.cupPoints;

      existing.europePoints +=
        row.europePoints;

      existing.superCupPoints +=
        row.superCupPoints;

      existing.total +=
        row.total;

      /*
        Якщо є актуальний ID,
        залишаємо сучасний nickname.
      */

      if (row.playerId) {
        existing.playerId =
          row.playerId;

        existing.playerName =
          getPlayerName(
            row.playerId
          );
      }
    }
  }

  return [
    ...map.values(),
  ]
    .filter(
      (row) =>
        row.total > 0
    )
    .sort(
      (a, b) =>
        b.total -
          a.total ||
        a.playerName.localeCompare(
          b.playerName
        )
    );
}

/*
  ========================================
  SUPABASE

  Тепер автоматично
  рахуємо ТІЛЬКИ СЕЗОН 3.
  ========================================
*/

async function loadSeason3Matches() {
  const PAGE_SIZE = 1000;

  const matches:
    CoefficientMatch[] = [];

  let from = 0;

  while (true) {
    const {
      data,
      error,
    } = await supabase
      .from("matches")
      .select(`
        id,
        season,
        competition,
        division,
        stage,
        group_name,
        round,
        leg,
        participant_type,
        home_id,
        away_id,
        home_goals,
        away_goals,
        status,
        series_id,
        series_home_id,
        series_away_id,
        is_tiebreak
      `)
      .eq(
        "season",
        3
      )
      .in(
        "competition",
        COEFFICIENT_COMPETITIONS
      )
      .order(
        "id",
        {
          ascending: true,
        }
      )
      .range(
        from,
        from +
          PAGE_SIZE -
          1
      );

    if (error) {
      return {
        matches: [],
        error,
      };
    }

    const batch =
      (data ??
        []) as CoefficientMatch[];

    matches.push(
      ...batch
    );

    if (
      batch.length <
      PAGE_SIZE
    ) {
      break;
    }

    from +=
      PAGE_SIZE;
  }

  return {
    matches,
    error: null,
  };
}

/*
  ========================================
  СТИЛЬ МІСЦЬ
  ========================================
*/

function getPlaceStyles(
  place: number
) {
  if (place === 1) {
    return {
      row:
        "bg-yellow-400/[0.07]",

      number:
        "border-yellow-400/30 bg-yellow-400/10 text-yellow-300",
    };
  }

  if (place === 2) {
    return {
      row:
        "bg-slate-300/[0.045]",

      number:
        "border-slate-300/20 bg-slate-300/[0.06] text-slate-200",
    };
  }

  if (place === 3) {
    return {
      row:
        "bg-orange-400/[0.045]",

      number:
        "border-orange-400/25 bg-orange-400/[0.07] text-orange-300",
    };
  }

  return {
    row: "",

    number:
      "border-white/10 bg-white/[0.03] text-white/35",
  };
}

/*
  ========================================
  ПОСИЛАННЯ НА ГРАВЦЯ
  ========================================
*/

function PlayerLink({
  playerId,
  playerName,
}: {
  playerId:
    | string
    | null;

  playerName: string;
}) {
  if (!playerId) {
    return (
      <span className="font-black text-white">
        {playerName}
      </span>
    );
  }

  return (
    <Link
      href={`/players/${playerId}`}
      className="font-black text-white transition hover:text-blue-300"
    >
      {playerName}
    </Link>
  );
}

/*
  ========================================
  АРХІВНА ТАБЛИЦЯ

  Використовується
  і для Сезону 1,
  і для Сезону 2.
  ========================================
*/

function ArchivedCoefficientTable({
  rows,
}: {
  rows:
    readonly ArchivedCoefficientRow[];
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] shadow-2xl shadow-black/20">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1350px] border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-[10px] font-black uppercase tracking-[0.1em] text-white/30">
              <th className="px-4 py-4 text-center">
                М
              </th>

              <th className="px-4 py-4 text-left">
                Гравець
              </th>

              <th className="px-4 py-4 text-center">
                Дивізіон
              </th>

              <th className="px-4 py-4 text-center">
                Очки
                дивізіону
              </th>

              <th className="px-4 py-4 text-center">
                Бонус
                за місце
              </th>

              <th className="px-4 py-4 text-center">
                Очки
                кубка
              </th>

              <th className="px-4 py-4 text-center">
                Бонус
                кубка
              </th>

              <th className="px-4 py-4 text-center">
                Очки ЛЧ
              </th>

              <th className="px-4 py-4 text-center">
                Бонус ЛЧ
              </th>

              <th className="px-4 py-4 text-center">
                Очки ЛЄ
              </th>

              <th className="px-4 py-4 text-center">
                Бонус ЛЄ
              </th>

              <th className="px-5 py-4 text-right">
                Коефіцієнт
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map(
              (row) => {
                const styles =
                  getPlaceStyles(
                    row.place
                  );

                const playerId =
                  findArchivePlayerId(
                    row.playerName
                  );

                return (
                  <tr
                    key={`${row.place}-${row.playerName}`}
                    className={`border-b border-white/[0.05] transition hover:bg-white/[0.025] ${styles.row}`}
                  >
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex min-w-9 items-center justify-center rounded-lg border px-2 py-1.5 font-black ${styles.number}`}
                      >
                        {row.place}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <PlayerLink
                        playerId={
                          playerId
                        }
                        playerName={
                          row.playerName
                        }
                      />
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-white/55">
                        {
                          row.division
                        }{" "}
                        див.
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center font-bold text-white/60">
                      {
                        row.divisionMatchPoints
                      }
                    </td>

                    <td className="px-4 py-4 text-center font-bold text-blue-300/80">
                      {
                        row.divisionPlaceBonus
                      }
                    </td>

                    <td className="px-4 py-4 text-center font-bold text-white/60">
                      {
                        row.cupMatchPoints
                      }
                    </td>

                    <td className="px-4 py-4 text-center font-bold text-blue-300/80">
                      {
                        row.cupBonus
                      }
                    </td>

                    <td className="px-4 py-4 text-center font-bold text-white/60">
                      {
                        row.championsLeagueMatchPoints
                      }
                    </td>

                    <td className="px-4 py-4 text-center font-bold text-blue-300/80">
                      {
                        row.championsLeagueBonus
                      }
                    </td>

                    <td className="px-4 py-4 text-center font-bold text-white/60">
                      {
                        row.europaLeagueMatchPoints
                      }
                    </td>

                    <td className="px-4 py-4 text-center font-bold text-blue-300/80">
                      {
                        row.europaLeagueBonus
                      }
                    </td>

                    <td className="px-5 py-4 text-right">
                      <span className="text-xl font-black text-blue-300">
                        {
                          row.total
                        }
                      </span>
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/*
  ========================================
  DETAIL CARD
  ========================================
*/

function DetailCard({
  title,
  items,
  total,
}: {
  title: string;

  items: {
    label: string;
    value: number;
  }[];

  total: number;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
      <div className="text-xs font-black uppercase tracking-[0.14em] text-blue-400">
        {title}
      </div>

      <div className="mt-4 space-y-2 text-sm text-white/50">
        {items.map(
          (item) => (
            <div
              key={item.label}
              className="flex justify-between gap-4"
            >
              <span>
                {
                  item.label
                }
              </span>

              <strong className="text-white">
                {
                  item.value
                }
              </strong>
            </div>
          )
        )}

        <div className="flex justify-between gap-4 border-t border-white/[0.06] pt-2">
          <span className="font-black">
            Разом
          </span>

          <strong className="text-blue-300">
            {total}
          </strong>
        </div>
      </div>
    </div>
  );
}

/*
  ========================================
  LIVE ТАБЛИЦЯ СЕЗОНУ 3
  ========================================
*/

function LiveCoefficientTable({
  rows,
}: {
  rows: CoefficientRow[];
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] shadow-2xl shadow-black/20">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[950px] border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-[11px] font-black uppercase tracking-[0.14em] text-white/30">
              <th className="px-5 py-4 text-center">
                М
              </th>

              <th className="px-5 py-4 text-left">
                Гравець
              </th>

              <th className="px-5 py-4 text-center">
                Дивізіон
              </th>

              <th className="px-5 py-4 text-center">
                Чемпіонат
              </th>

              <th className="px-5 py-4 text-center">
                Кубок
              </th>

              <th className="px-5 py-4 text-center">
                Єврокубки
              </th>

              <th className="px-5 py-4 text-center">
                Суперкубок
              </th>

              <th className="px-6 py-4 text-right">
                Коефіцієнт
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map(
              (
                row,
                index
              ) => {
                const place =
                  index + 1;

                const styles =
                  getPlaceStyles(
                    place
                  );

                return (
                  <Fragment
                    key={
                      row.playerId
                    }
                  >
                    <tr
                      className={`border-b border-white/[0.05] transition hover:bg-white/[0.025] ${styles.row}`}
                    >
                      <td className="px-5 py-5 text-center">
                        <span
                          className={`inline-flex min-w-9 items-center justify-center rounded-lg border px-2 py-1.5 font-black ${styles.number}`}
                        >
                          {
                            place
                          }
                        </span>
                      </td>

                      <td className="px-5 py-5">
                        <PlayerLink
                          playerId={
                            row.playerId
                          }
                          playerName={getPlayerName(
                            row.playerId
                          )}
                        />
                      </td>

                      <td className="px-5 py-5 text-center">
                        {row.division &&
                        row.division <=
                          3 ? (
                          <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-white/55">
                            {
                              row.division
                            }{" "}
                            див.
                          </span>
                        ) : (
                          <span className="text-white/20">
                            —
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-5 text-center font-bold text-white/60">
                        {getDivisionPoints(
                          row
                        )}
                      </td>

                      <td className="px-5 py-5 text-center font-bold text-white/60">
                        {getCupPoints(
                          row
                        )}
                      </td>

                      <td className="px-5 py-5 text-center font-bold text-white/60">
                        {getEuropePoints(
                          row
                        )}
                      </td>

                      <td className="px-5 py-5 text-center font-bold text-white/60">
                        {
                          row
                            .breakdown
                            .europeanSuperCup
                        }
                      </td>

                      <td className="px-6 py-5 text-right">
                        <span className="text-2xl font-black text-blue-300">
                          {
                            row.total
                          }
                        </span>
                      </td>
                    </tr>

                    <tr className="border-b border-white/[0.05] bg-[#050b14]">
                      <td
                        colSpan={
                          8
                        }
                        className="px-6 py-3"
                      >
                        <details>
                          <summary className="cursor-pointer select-none text-xs font-bold uppercase tracking-[0.14em] text-white/30 transition hover:text-blue-300">
                            Детальний
                            розрахунок
                          </summary>

                          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <DetailCard
                              title="Дивізіон"
                              items={[
                                {
                                  label:
                                    "Очки за матчі",
                                  value:
                                    row
                                      .breakdown
                                      .divisionMatches,
                                },

                                {
                                  label:
                                    "Бонус за місце",
                                  value:
                                    row
                                      .breakdown
                                      .divisionPlace,
                                },
                              ]}
                              total={getDivisionPoints(
                                row
                              )}
                            />

                            <DetailCard
                              title="Кубок дивізіону"
                              items={[
                                {
                                  label:
                                    "Перемоги в матчах",
                                  value:
                                    row
                                      .breakdown
                                      .divisionCupMatches,
                                },

                                {
                                  label:
                                    "Прохід раундів",
                                  value:
                                    row
                                      .breakdown
                                      .divisionCupRounds,
                                },

                                {
                                  label:
                                    "Перемога в кубку",
                                  value:
                                    row
                                      .breakdown
                                      .divisionCupWinner,
                                },
                              ]}
                              total={getCupPoints(
                                row
                              )}
                            />

                            <DetailCard
                              title="Ліга чемпіонів"
                              items={[
                                {
                                  label:
                                    "Очки за матчі",
                                  value:
                                    row
                                      .breakdown
                                      .championsLeagueMatches,
                                },

                                {
                                  label:
                                    "Груповий бонус",
                                  value:
                                    row
                                      .breakdown
                                      .championsLeagueGroup,
                                },

                                {
                                  label:
                                    "Прохід раундів",
                                  value:
                                    row
                                      .breakdown
                                      .championsLeagueRounds,
                                },

                                {
                                  label:
                                    "Фінальний бонус",
                                  value:
                                    row
                                      .breakdown
                                      .championsLeagueFinal,
                                },
                              ]}
                              total={getChampionsLeaguePoints(
                                row
                              )}
                            />

                            <DetailCard
                              title="Ліга Європи"
                              items={[
                                {
                                  label:
                                    "Очки за матчі",
                                  value:
                                    row
                                      .breakdown
                                      .europaLeagueMatches,
                                },

                                {
                                  label:
                                    "Груповий бонус",
                                  value:
                                    row
                                      .breakdown
                                      .europaLeagueGroup,
                                },

                                {
                                  label:
                                    "Прохід раундів",
                                  value:
                                    row
                                      .breakdown
                                      .europaLeagueRounds,
                                },

                                {
                                  label:
                                    "Фінальний бонус",
                                  value:
                                    row
                                      .breakdown
                                      .europaLeagueFinal,
                                },
                              ]}
                              total={getEuropaLeaguePoints(
                                row
                              )}
                            />

                            <div className="rounded-2xl border border-blue-400/15 bg-blue-500/[0.04] p-4 md:col-span-2 xl:col-span-4">
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <div className="text-xs font-black uppercase tracking-[0.14em] text-blue-400">
                                    Суперкубок
                                    Європи
                                  </div>

                                  <div className="mt-1 text-sm text-white/35">
                                    Бонус
                                    переможця
                                  </div>
                                </div>

                                <div className="text-2xl font-black text-blue-300">
                                  {
                                    row
                                      .breakdown
                                      .europeanSuperCup
                                  }
                                </div>
                              </div>
                            </div>

                            <div className="rounded-2xl border border-blue-400/20 bg-blue-500/[0.07] p-5 md:col-span-2 xl:col-span-4">
                              <div className="flex items-center justify-between gap-4">
                                <div className="text-xs font-black uppercase tracking-[0.14em] text-blue-400">
                                  Підсумковий
                                  коефіцієнт
                                </div>

                                <div className="text-3xl font-black text-blue-300">
                                  {
                                    row.total
                                  }
                                </div>
                              </div>
                            </div>
                          </div>
                        </details>
                      </td>
                    </tr>
                  </Fragment>
                );
              }
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/*
  ========================================
  ЗАГАЛЬНА ТАБЛИЦЯ
  ========================================
*/

function AllTimeTable({
  rows,
}: {
  rows: SummaryRow[];
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] shadow-2xl shadow-black/20">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-[11px] font-black uppercase tracking-[0.14em] text-white/30">
              <th className="px-5 py-4 text-center">
                М
              </th>

              <th className="px-5 py-4 text-left">
                Гравець
              </th>

              <th className="px-5 py-4 text-center">
                Дивізіони
              </th>

              <th className="px-5 py-4 text-center">
                Кубки
              </th>

              <th className="px-5 py-4 text-center">
                Єврокубки
              </th>

              <th className="px-5 py-4 text-center">
                Суперкубок
              </th>

              <th className="px-6 py-4 text-right">
                Коефіцієнт
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map(
              (
                row,
                index
              ) => {
                const place =
                  index + 1;

                const styles =
                  getPlaceStyles(
                    place
                  );

                return (
                  <tr
                    key={
                      row.key
                    }
                    className={`border-b border-white/[0.05] transition hover:bg-white/[0.025] ${styles.row}`}
                  >
                    <td className="px-5 py-5 text-center">
                      <span
                        className={`inline-flex min-w-9 items-center justify-center rounded-lg border px-2 py-1.5 font-black ${styles.number}`}
                      >
                        {
                          place
                        }
                      </span>
                    </td>

                    <td className="px-5 py-5">
                      <PlayerLink
                        playerId={
                          row.playerId
                        }
                        playerName={
                          row.playerName
                        }
                      />
                    </td>

                    <td className="px-5 py-5 text-center font-bold text-white/60">
                      {
                        row.divisionPoints
                      }
                    </td>

                    <td className="px-5 py-5 text-center font-bold text-white/60">
                      {
                        row.cupPoints
                      }
                    </td>

                    <td className="px-5 py-5 text-center font-bold text-white/60">
                      {
                        row.europePoints
                      }
                    </td>

                    <td className="px-5 py-5 text-center font-bold text-white/60">
                      {
                        row.superCupPoints
                      }
                    </td>

                    <td className="px-6 py-5 text-right">
                      <span className="text-2xl font-black text-blue-300">
                        {
                          row.total
                        }
                      </span>
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/*
  ========================================
  PAGE
  ========================================
*/

export default async function CoefficientsPage({
  searchParams,
}: PageProps) {
  const params =
    await searchParams;

  const rawSeason =
    params.season ??
    "all";

  let selected:
    SeasonFilter =
    "all";

  if (
    rawSeason === "1" ||
    rawSeason === "2" ||
    rawSeason === "3"
  ) {
    selected =
      Number(
        rawSeason
      ) as SeasonNumber;
  }

  /*
    Supabase потрібен
    тільки для Сезону 3
    та загального рейтингу.
  */

  const needsLiveData =
    selected === 3 ||
    selected === "all";

  const liveResult =
    needsLiveData
      ? await loadSeason3Matches()
      : {
          matches:
            [] as CoefficientMatch[],
          error: null,
        };

  if (liveResult.error) {
    console.error(
      "COEFFICIENTS ERROR:",
      liveResult.error
    );
  }

  /*
    ========================================
    АРХІВ
    ========================================
  */

  const season1Summary =
    season1Coefficients.map(
      archivedRowToSummary
    );

  const season2Summary =
    season2Coefficients.map(
      archivedRowToSummary
    );

  /*
    ========================================
    LIVE СЕЗОН 3
    ========================================
  */

  const season3Rows =
    needsLiveData
      ? calculateCoefficients({
          season: 3,
          matches:
            liveResult.matches,
        })
      : [];

  const season3Summary =
    season3Rows.map(
      liveRowToSummary
    );

  /*
    ========================================
    ВІДОБРАЖЕННЯ
    ========================================
  */

  let summaryRows:
    SummaryRow[];

  if (selected === 1) {
    summaryRows =
      season1Summary;
  } else if (
    selected === 2
  ) {
    summaryRows =
      season2Summary;
  } else if (
    selected === 3
  ) {
    summaryRows =
      season3Summary;
  } else {
    summaryRows =
      aggregateSummaryRows([
        season1Summary,
        season2Summary,
        season3Summary,
      ]);
  }

  const tabs = [
    {
      label:
        "Загальний рейтинг",
      value: "all",
    },

    {
      label:
        "Сезон 1",
      value: "1",
    },

    {
      label:
        "Сезон 2",
      value: "2",
    },

    {
      label:
        "Сезон 3",
      value: "3",
    },
  ];

  const title =
    selected === "all"
      ? "Загальний рейтинг"
      : `Сезон ${selected}`;

  const leader =
    summaryRows[0];

  const second =
    summaryRows[1];

  const third =
    summaryRows[2];

  return (
    <main className="min-h-screen bg-[#030711] text-white">
      {/* HEADER */}

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#030711]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-4"
          >
            <img
              src="/iron-league-logo.jpg"
              alt="Iron League"
              className="h-16 w-auto object-contain"
            />

            <div>
              <div className="text-xl font-black tracking-[0.18em]">
                IRON LEAGUE
              </div>

              <div className="text-[10px] uppercase tracking-[0.35em] text-white/40">
                більше ніж гра
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-semibold text-white/60 lg:flex">
            <Link
              href="/"
              className="transition hover:text-white"
            >
              Головна
            </Link>

            <Link
              href="/matches"
              className="transition hover:text-white"
            >
              Матчі
            </Link>

            <Link
              href="/divisions"
              className="transition hover:text-white"
            >
              Дивізіони
            </Link>

            <Link
              href="/#tournaments"
              className="transition hover:text-white"
            >
              Турніри
            </Link>

            <Link
              href="/players"
              className="transition hover:text-white"
            >
              Гравці
            </Link>

            <Link
              href="/coefficients"
              className="text-blue-300"
            >
              Коефіцієнти
            </Link>

            <Link
              href="/history"
              className="transition hover:text-white"
            >
              Історія
            </Link>

            <Link
              href="/news"
              className="transition hover:text-white"
            >
              Новини
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_45%)]" />

        <div className="relative mx-auto max-w-7xl px-6 py-16">
          <div className="text-xs font-black uppercase tracking-[0.28em] text-blue-400">
            Iron League
          </div>

          <h1 className="mt-4 text-4xl font-black sm:text-5xl">
            Таблиця коефіцієнтів
          </h1>

          <p className="mt-4 max-w-3xl leading-7 text-white/45">
            Офіційний рейтинг
            учасників Iron League.
            Сезони 1 і 2
            зберігають історично
            зафіксовані результати,
            а Сезон 3 оновлюється
            автоматично після
            внесення нових матчів.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {tabs.map(
              (tab) => {
                const active =
                  String(
                    selected
                  ) ===
                  tab.value;

                return (
                  <Link
                    key={
                      tab.value
                    }
                    href={
                      tab.value ===
                      "all"
                        ? "/coefficients"
                        : `/coefficients?season=${tab.value}`
                    }
                    className={`rounded-xl border px-5 py-3 text-sm font-black transition ${
                      active
                        ? "border-blue-400/40 bg-blue-500/15 text-blue-200"
                        : "border-white/10 bg-white/[0.025] text-white/45 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {
                      tab.label
                    }
                  </Link>
                );
              }
            )}
          </div>
        </div>
      </section>

      {/* TOP 3 */}

      {summaryRows.length >
        0 && (
        <section className="mx-auto max-w-7xl px-6 pt-12">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                row:
                  leader,
                label:
                  "1 місце",
                style:
                  "border-yellow-400/25 bg-yellow-400/[0.07]",
                text:
                  "text-yellow-300",
              },

              {
                row:
                  second,
                label:
                  "2 місце",
                style:
                  "border-slate-300/20 bg-white/[0.04]",
                text:
                  "text-slate-200",
              },

              {
                row:
                  third,
                label:
                  "3 місце",
                style:
                  "border-orange-400/20 bg-orange-400/[0.05]",
                text:
                  "text-orange-300",
              },
            ].map(
              (item) =>
                item.row && (
                  <div
                    key={
                      item.label
                    }
                    className={`rounded-3xl border p-6 ${item.style}`}
                  >
                    <div
                      className={`text-xs font-black uppercase tracking-[0.2em] ${item.text}`}
                    >
                      {
                        item.label
                      }
                    </div>

                    <div className="mt-4 text-xl">
                      <PlayerLink
                        playerId={
                          item
                            .row
                            .playerId
                        }
                        playerName={
                          item
                            .row
                            .playerName
                        }
                      />
                    </div>

                    <div
                      className={`mt-5 text-4xl font-black ${item.text}`}
                    >
                      {
                        item
                          .row
                          .total
                      }
                    </div>

                    <div className="mt-1 text-xs uppercase tracking-[0.14em] text-white/30">
                      коефіцієнт
                    </div>
                  </div>
                )
            )}
          </div>
        </section>
      )}

      {/* TABLE */}

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.25em] text-blue-400">
              Рейтинг
            </div>

            <h2 className="mt-3 text-3xl font-black">
              {title}
            </h2>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-2 text-sm text-white/35">
            Учасників:{" "}
            <strong className="text-white/70">
              {
                summaryRows.length
              }
            </strong>
          </div>
        </div>

        {liveResult.error ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-red-200">
            Не вдалося
            завантажити дані
            Сезону 3.
          </div>
        ) : selected ===
          1 ? (
          <ArchivedCoefficientTable
            rows={
              season1Coefficients
            }
          />
        ) : selected ===
          2 ? (
          <ArchivedCoefficientTable
            rows={
              season2Coefficients
            }
          />
        ) : selected ===
          3 ? (
          <LiveCoefficientTable
            rows={
              season3Rows
            }
          />
        ) : (
          <AllTimeTable
            rows={
              summaryRows
            }
          />
        )}

        {/* INFO */}

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
            <div className="text-sm font-black text-white/80">
              Сезон 1
            </div>

            <p className="mt-3 text-sm leading-7 text-white/40">
              Історична
              зафіксована таблиця.
              Автоматично більше
              не перераховується.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
            <div className="text-sm font-black text-white/80">
              Сезон 2
            </div>

            <p className="mt-3 text-sm leading-7 text-white/40">
              Історична
              зафіксована таблиця.
              Автоматично більше
              не перераховується.
            </p>
          </div>

          <div className="rounded-2xl border border-blue-400/10 bg-blue-500/[0.035] p-6">
            <div className="text-sm font-black text-blue-200">
              Сезон 3 · LIVE
            </div>

            <p className="mt-3 text-sm leading-7 text-white/40">
              Коефіцієнт
              оновлюється
              автоматично після
              внесення нових
              результатів.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}