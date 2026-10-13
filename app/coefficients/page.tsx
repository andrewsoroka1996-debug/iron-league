import { Fragment } from "react";
import Link from "next/link";
import SiteHeader from "../../components/public/SiteHeader";
import SiteFooter from "../../components/public/SiteFooter";

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
      {/* MOBILE RANKING */}
      <div className="divide-y divide-white/10 lg:hidden">
        {rows.map((row) => {
          const styles = getPlaceStyles(row.place);
          const playerId = findArchivePlayerId(row.playerName);

          const details = [
            {
              label: "Очки дивізіону",
              value: row.divisionMatchPoints,
            },
            {
              label: "Бонус за місце",
              value: row.divisionPlaceBonus,
            },
            {
              label: "Очки кубка",
              value: row.cupMatchPoints,
            },
            {
              label: "Бонус кубка",
              value: row.cupBonus,
            },
            {
              label: "Очки ЛЧ",
              value: row.championsLeagueMatchPoints,
            },
            {
              label: "Бонус ЛЧ",
              value: row.championsLeagueBonus,
            },
            {
              label: "Очки ЛЄ",
              value: row.europaLeagueMatchPoints,
            },
            {
              label: "Бонус ЛЄ",
              value: row.europaLeagueBonus,
            },
          ];

          return (
            <details
              key={`${row.place}-${row.playerName}`}
              className="group transition-colors open:bg-white/[0.025]"
            >
              {/* COMPACT ROW */}
              <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-4 [&::-webkit-details-marker]:hidden sm:px-5">
                {/* POSITION */}
                <span
                  className={`inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-xl border px-2 text-sm font-black ${styles.number}`}
                >
                  {row.place}
                </span>

                {/* PLAYER */}
                <div className="min-w-0 flex-1">
                  <div className="break-words text-sm font-black leading-5 text-white sm:text-base">
                    {row.playerName}
                  </div>

                  <div className="mt-1 text-[11px] font-medium text-white/40">
                    {row.division} Дивізіон
                  </div>
                </div>

                {/* TOTAL */}
                <div className="shrink-0 text-right">
                  <div className="text-xl font-black tabular-nums text-blue-300 sm:text-2xl">
                    {row.total}
                  </div>

                  <div className="text-[9px] font-bold uppercase tracking-wider text-white/35">
                    Коефіцієнт
                  </div>

                  <div className="mt-1 text-[10px] font-semibold text-blue-300/75">
                    Деталі
                    <span
                      aria-hidden="true"
                      className="ml-1 inline-block transition-transform group-open:rotate-180"
                    >
                      ↓
                    </span>
                  </div>
                </div>
              </summary>

              {/* EXPANDED DETAILS */}
              <div className="border-t border-white/[0.07] bg-[#091423] px-4 py-4 sm:px-5">
                <div className="mb-3 text-[10px] font-black uppercase tracking-[0.17em] text-blue-400">
                  Деталізація коефіцієнта
                </div>

                <div className="grid gap-0">
                  {details.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between gap-4 border-b border-white/[0.05] py-2.5 last:border-0"
                    >
                      <span className="min-w-0 text-xs leading-5 text-white/55 sm:text-sm">
                        {item.label}
                      </span>

                      <span className="shrink-0 text-sm font-black tabular-nums text-white">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* TOTAL CHECK */}
                <div className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-blue-400/15 bg-blue-500/[0.06] px-3 py-3">
                  <span className="text-xs font-black text-blue-300">
                    Загальний коефіцієнт
                  </span>

                  <span className="text-lg font-black tabular-nums text-blue-300">
                    {row.total}
                  </span>
                </div>

                {/* PLAYER PROFILE */}
                {playerId && (
                  <div className="mt-4 text-sm">
                    <Link
                      href={`/players/${playerId}`}
                      className="inline-flex items-center gap-2 font-bold text-blue-300 transition hover:text-blue-200"
                    >
                      Відкрити профіль гравця
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </div>

            <div className="hidden overflow-x-auto lg:block">
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
      {/* MOBILE LIVE RANKING */}
      <div className="divide-y divide-white/[0.06] lg:hidden">
        {rows.map((row, index) => {
          const place = index + 1;
          const styles = getPlaceStyles(place);
          const playerName = getPlayerName(row.playerId);

          const sections = [
            {
              title: "Дивізіон",
              items: [
                {
                  label: "Очки за матчі",
                  value: row.breakdown.divisionMatches,
                },
                {
                  label: "Бонус за місце",
                  value: row.breakdown.divisionPlace,
                },
              ],
              total: getDivisionPoints(row),
            },
            {
              title: "Кубок дивізіону",
              items: [
                {
                  label: "Перемоги в матчах",
                  value: row.breakdown.divisionCupMatches,
                },
                {
                  label: "Прохід раундів",
                  value: row.breakdown.divisionCupRounds,
                },
                {
                  label: "Перемога в кубку",
                  value: row.breakdown.divisionCupWinner,
                },
              ],
              total: getCupPoints(row),
            },
            {
              title: "Ліга чемпіонів",
              items: [
                {
                  label: "Очки за матчі",
                  value: row.breakdown.championsLeagueMatches,
                },
                {
                  label: "Груповий бонус",
                  value: row.breakdown.championsLeagueGroup,
                },
                {
                  label: "Прохід раундів",
                  value: row.breakdown.championsLeagueRounds,
                },
                {
                  label: "Фінальний бонус",
                  value: row.breakdown.championsLeagueFinal,
                },
              ],
              total: getChampionsLeaguePoints(row),
            },
            {
              title: "Ліга Європи",
              items: [
                {
                  label: "Очки за матчі",
                  value: row.breakdown.europaLeagueMatches,
                },
                {
                  label: "Груповий бонус",
                  value: row.breakdown.europaLeagueGroup,
                },
                {
                  label: "Прохід раундів",
                  value: row.breakdown.europaLeagueRounds,
                },
                {
                  label: "Фінальний бонус",
                  value: row.breakdown.europaLeagueFinal,
                },
              ],
              total: getEuropaLeaguePoints(row),
            },
          ];

          return (
            <details
              key={row.playerId}
              className={`group transition-colors open:bg-white/[0.025] ${styles.row}`}
            >
              {/* COMPACT RANKING ROW */}
              <summary className="grid cursor-pointer list-none grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 focus-visible:outline-2 focus-visible:outline-blue-400 [&::-webkit-details-marker]:hidden sm:px-5">
                {/* POSITION */}
                <span
                  className={`inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-xl border px-2 text-sm font-black ${styles.number}`}
                >
                  {place}
                </span>

                {/* PLAYER */}
                <div className="min-w-0">
                  <div className="break-words text-sm font-black leading-5 text-white sm:text-base">
                    {playerName}
                  </div>

                  <div className="mt-1 text-[11px] font-medium text-white/40">
                    {row.division && row.division <= 3
                      ? `${row.division} Дивізіон`
                      : "Дивізіон —"}
                  </div>
                </div>

                {/* COEFFICIENT */}
                <div className="shrink-0 text-right">
                  <div className="text-xl font-black tabular-nums text-blue-300 sm:text-2xl">
                    {row.total}
                  </div>

                  <div className="text-[9px] font-bold uppercase tracking-wider text-white/35">
                    Коефіцієнт
                  </div>

                  <div className="mt-1 text-[10px] font-semibold text-blue-300/75">
                    Деталі
                    <span
                      aria-hidden="true"
                      className="ml-1 inline-block transition-transform group-open:rotate-180"
                    >
                      ↓
                    </span>
                  </div>
                </div>
              </summary>

              {/* EXPANDED DETAILS */}
              <div className="border-t border-white/[0.07] bg-[#091423] px-3 py-3 sm:px-5 sm:py-4">
                <div className="mb-3 text-[10px] font-black uppercase tracking-[0.15em] text-blue-400">
                  Детальний розрахунок
                </div>

                {/* COMPACT TOURNAMENT BREAKDOWN */}
                <div className="grid gap-2 sm:grid-cols-2">
                  {sections.map((section) => (
                    <details
                      key={section.title}
                      className="group/section overflow-hidden rounded-xl border border-white/10 bg-white/[0.025]"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 focus-visible:outline-2 focus-visible:outline-blue-400 [&::-webkit-details-marker]:hidden">
                        <span className="min-w-0 text-xs font-bold text-white/75 sm:text-sm">
                          {section.title}
                        </span>

                        <span className="flex shrink-0 items-center gap-2">
                          <span
                            className={`text-sm font-black tabular-nums ${
                              section.total > 0
                                ? "text-blue-300"
                                : "text-white/50"
                            }`}
                          >
                            {section.total}
                          </span>

                          <span
                            aria-hidden="true"
                            className="text-xs text-blue-300/70 transition-transform group-open/section:rotate-180"
                          >
                            ▼
                          </span>
                        </span>
                      </summary>

                      {/* TOURNAMENT DETAILS */}
                      <div className="border-t border-white/[0.07] px-3 py-2">
                        {section.items.map((item) => (
                          <div
                            key={item.label}
                            className="flex items-center justify-between gap-3 py-1.5"
                          >
                            <span className="min-w-0 text-xs leading-5 text-white/50">
                              {item.label}
                            </span>

                            <span className="shrink-0 text-xs font-black tabular-nums text-white">
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>

                {/* EUROPEAN SUPER CUP */}
                <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-3">
                  <span className="text-xs font-bold text-white/75 sm:text-sm">
                    Суперкубок Європи
                  </span>

                  <span className="text-sm font-black tabular-nums text-blue-300">
                    {row.breakdown.europeanSuperCup}
                  </span>
                </div>

                {/* FINAL COEFFICIENT */}
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-blue-400/20 bg-blue-500/[0.08] px-3 py-3">
                  <span className="text-xs font-black text-blue-300 sm:text-sm">
                    Підсумковий коефіцієнт
                  </span>

                  <span className="shrink-0 text-2xl font-black tabular-nums text-blue-300">
                    {row.total}
                  </span>
                </div>

                {/* PLAYER PROFILE */}
                <div className="mt-3">
                  <Link
                    href={`/players/${row.playerId}`}
                    className="inline-flex items-center gap-2 text-xs font-bold text-blue-300 transition hover:text-blue-200 sm:text-sm"
                  >
                    Відкрити профіль гравця
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            </details>
          );
        })}
      </div>

            <div className="hidden overflow-x-auto lg:block">
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
      {/* MOBILE ALL-TIME RANKING */}
      <div className="divide-y divide-white/[0.06] lg:hidden">
        {rows.map((row, index) => {
          const place = index + 1;
          const styles = getPlaceStyles(place);

          const breakdown = [
            {
              label: "Дивізіони",
              value: row.divisionPoints,
            },
            {
              label: "Кубки",
              value: row.cupPoints,
            },
            {
              label: "Єврокубки",
              value: row.europePoints,
            },
            {
              label: "Суперкубок",
              value: row.superCupPoints,
            },
          ];

          return (
            <details
              key={row.key}
              className={`group transition-colors open:bg-white/[0.025] ${styles.row}`}
            >
              {/* COMPACT RANKING ROW */}
              <summary className="grid cursor-pointer list-none grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 focus-visible:outline-2 focus-visible:outline-blue-400 [&::-webkit-details-marker]:hidden sm:px-5">
                {/* POSITION */}
                <span
                  className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-2 text-sm font-black ${styles.number}`}
                >
                  {place}
                </span>

                {/* PLAYER */}
                <div className="min-w-0">
                  <div className="break-words text-sm font-black leading-5 text-white sm:text-base">
                    {row.playerName}
                  </div>

                  <div className="mt-1 text-[11px] text-white/40">
                    Рейтинг Iron League
                  </div>
                </div>

                {/* TOTAL */}
                <div className="shrink-0 text-right">
                  <div className="text-xl font-black tabular-nums text-blue-300 sm:text-2xl">
                    {row.total}
                  </div>

                  <div className="text-[9px] font-bold uppercase tracking-wider text-white/35">
                    Коефіцієнт
                  </div>

                  <div className="mt-1 text-[10px] font-semibold text-blue-300/75">
                    Деталі
                    <span
                      aria-hidden="true"
                      className="ml-1 inline-block transition-transform group-open:rotate-180"
                    >
                      ▼
                    </span>
                  </div>
                </div>
              </summary>

              {/* EXPANDED BREAKDOWN */}
              <div className="border-t border-white/[0.07] bg-[#091423] px-3 py-3 sm:px-5">
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.15em] text-blue-400">
                  Складові коефіцієнта
                </div>

                <div className="divide-y divide-white/[0.06]">
                  {breakdown.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <span className="text-xs font-medium text-white/60 sm:text-sm">
                        {item.label}
                      </span>

                      <span className="shrink-0 text-sm font-black tabular-nums text-white">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* FINAL TOTAL */}
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-blue-400/20 bg-blue-500/[0.07] px-3 py-3">
                  <span className="text-xs font-black text-blue-300">
                    Загальний коефіцієнт
                  </span>

                  <span className="shrink-0 text-xl font-black tabular-nums text-blue-300">
                    {row.total}
                  </span>
                </div>

                {/* PLAYER PROFILE */}
                {row.playerId && (
                  <div className="mt-3">
                    <Link
                      href={`/players/${row.playerId}`}
                      className="inline-flex items-center gap-2 text-xs font-bold text-blue-300 transition hover:text-blue-200 sm:text-sm"
                    >
                      Відкрити профіль гравця
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </div>
            <div className="hidden overflow-x-auto lg:block">
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
            {/* GLOBAL HEADER */}
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10 bg-white/[0.02]">
        {/* BACKGROUND */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_55%)]" />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/[0.04] via-transparent to-transparent" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:py-14">
          {/* BACK LINK */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-300 transition hover:text-blue-200 sm:text-sm"
          >
            <span aria-hidden="true">←</span>
            На головну
          </Link>

          {/* TITLE */}
          <div className="mt-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 sm:text-xs">
              IRON LEAGUE · RANKINGS
            </div>

            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
              Коефіцієнти
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
              Офіційний рейтинг учасників Iron League.
              Результати сезонів 1 і 2 збережені в історії,
              а коефіцієнти сезону 3 оновлюються
              автоматично після внесення матчів.
            </p>
          </div>

          {/* RANKING SWITCHER */}
          <div className="mt-7 sm:mt-9">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-white/50">
              Обрати рейтинг
            </div>

            <nav
              aria-label="Вибір рейтингу"
              className="grid w-full max-w-2xl grid-cols-2 gap-2 sm:flex sm:flex-wrap"
            >
              {tabs.map((tab) => {
                const active =
                  String(selected) === tab.value;

                return (
                  <Link
                    key={tab.value}
                    href={
                      tab.value === "all"
                        ? "/coefficients"
                        : `/coefficients?season=${tab.value}`
                    }
                    aria-current={
                      active ? "page" : undefined
                    }
                    className={`flex min-h-11 items-center justify-center rounded-xl border px-3 py-2.5 text-center text-xs font-bold transition-colors sm:px-5 sm:text-sm ${
                      active
                        ? "border-blue-400/40 bg-blue-500/15 text-blue-200 shadow-lg shadow-blue-500/[0.08]"
                        : "border-white/10 bg-[#07101d] text-white/55 hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </section>


      {/* TOP 3 */}
      {summaryRows.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 sm:pt-12">
          {/* SECTION HEADER */}
          <div className="mb-5 sm:mb-6">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-400 sm:text-xs">
              IRON LEAGUE · TOP 3
            </div>

            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Лідери рейтингу
            </h2>
          </div>

          {/* LEADER CARDS */}
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {[
              {
                row: leader,
                rank: "01",
                label: "1 місце",
                style:
                  "border-yellow-400/25 bg-yellow-500/[0.055]",
                text: "text-yellow-300",
                numberBg: "bg-yellow-500/10",
              },
              {
                row: second,
                rank: "02",
                label: "2 місце",
                style:
                  "border-slate-300/20 bg-white/[0.035]",
                text: "text-slate-200",
                numberBg: "bg-white/[0.07]",
              },
              {
                row: third,
                rank: "03",
                label: "3 місце",
                style:
                  "border-orange-400/20 bg-orange-500/[0.045]",
                text: "text-orange-300",
                numberBg: "bg-orange-500/10",
              },
            ].map((item) =>
              item.row ? (
                <div
                  key={item.rank}
                  className={`group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border p-4 transition-colors duration-300 hover:border-white/30 sm:p-5 ${item.style}`}
                >
                  {/* BACKGROUND NUMBER */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-2 -top-6 text-[100px] font-black leading-none text-white/[0.035]"
                  >
                    {item.rank}
                  </div>

                  {/* POSITION */}
                  <div className="relative flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-black ${item.numberBg} ${item.text}`}
                    >
                      {item.rank}
                    </div>

                    <div>
                      <div
                        className={`text-xs font-black uppercase tracking-[0.13em] ${item.text}`}
                      >
                        {item.label}
                      </div>

                      <div className="mt-1 text-[11px] text-white/40">
                        Рейтинг Iron League
                      </div>
                    </div>
                  </div>

                  {/* PLAYER */}
                  <div className="relative mt-5 min-w-0 break-words text-lg font-black text-white sm:text-xl">
                    <PlayerLink
                      playerId={item.row.playerId}
                      playerName={item.row.playerName}
                    />
                  </div>

                  {/* COEFFICIENT */}
                  <div className="relative mt-auto pt-5">
                    <div className="border-t border-white/10 pt-4">
                      <div
                        className={`break-words text-3xl font-black leading-none tabular-nums sm:text-4xl ${item.text}`}
                      >
                        {item.row.total}
                      </div>

                      <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
                        Коефіцієнт
                      </div>
                    </div>
                  </div>
                </div>
              ) : null
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

      {/* GLOBAL FOOTER */}
      <SiteFooter />
    </main>
  );
}