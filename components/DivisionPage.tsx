import StadiumBackground from "./StadiumBackground";
import SiteHeader from "./public/SiteHeader";
import { players } from "../data/players";
import Link from "next/link";

import { season1 } from "../data/seasons/season-1";
import { season2 } from "../data/seasons/season-2";
import { season3 } from "../data/seasons/season-3";
import { season4 } from "../data/seasons/season-4";

import { buildStandings } from "../lib/standings";

import { supabaseAdmin } from "../lib/supabase-admin";

import DivisionSchedule from "./DivisionSchedule";
import {
  applyPlayerReplacements,
  getDivisionReplacements,
  resolveReplacementPlayerId,
} from "../lib/player-replacements";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DivisionNumber = 1 | 2 | 3 | 4;
type SeasonNumber = 1 | 2 | 3 | 4;

type DivisionPageProps = {
  division: DivisionNumber;
  season: SeasonNumber;
};

type DatabaseMatch = {
  id: string;

  round: number | null;

  home_id: string;
  away_id: string;

  home_goals: number | null;
  away_goals: number | null;

  status: string;
};

/*
  ========================================
  УЧАСНИКИ ДИВІЗІОНУ
  ========================================
*/

function getDivisionPlayers(
  season: SeasonNumber,
  division: DivisionNumber
): readonly string[] {
  /*
    СЕЗОН 1
    Було тільки 3 дивізіони.
  */

  if (season === 1) {
    if (division === 1) {
      return season1.division1.players;
    }

    if (division === 2) {
      return season1.division2.players;
    }

    if (division === 3) {
      return season1.division3.players;
    }

    return [];
  }

  /*
    СЕЗОН 2
  */

  if (season === 2) {
    if (division === 1) {
      return season2.division1.players;
    }

    if (division === 2) {
      return season2.division2.players;
    }

    if (division === 3) {
      return season2.division3.players;
    }

    return season2.division4.players;
  }

  /*
    СЕЗОН 3
  */

  if (season === 3) {
    if (division === 1) {
      return season3.division1.players;
    }

    if (division === 2) {
      return season3.division2.players;
    }

    if (division === 3) {
      return season3.division3.players;
    }

    return season3.division4.players;
  }

  /*
    СЕЗОН 4
  */

  if (division === 1) {
    return season4.division1.players;
  }

  if (division === 2) {
    return season4.division2.players;
  }

  if (division === 3) {
    return season4.division3.players;
  }

  return season4.division4.players;
}

export default async function DivisionPage({
  division,
  season,
}: DivisionPageProps) {
  /*
    ========================================
    УЧАСНИКИ
    ========================================
  */

  const baseDivisionPlayerIds =
  getDivisionPlayers(
    season,
    division
  );

const replacementsRequest = getDivisionReplacements(
  season,
  division
);

  /*
    ========================================
    МАТЧІ З SUPABASE
    ========================================
  */

  const matchesRequest = supabaseAdmin
  .from("matches")
  .select(
    `
      id,
        round,
        home_id,
        away_id,
        home_goals,
        away_goals,
        status
      `
    )
    .eq(
      "season",
      season
    )
    .eq(
      "competition",
      "division"
    )
    .eq(
      "division",
      division
    )
    .order(
      "round",
      {
        ascending: true,
        nullsFirst: false,
      }
    );
    const [replacements, { data, error }] = await Promise.all([
  replacementsRequest,
  matchesRequest,
]);

const divisionPlayersIds = applyPlayerReplacements(
  baseDivisionPlayerIds,
  replacements
);

  if (error) {
    console.error(
      "DIVISION MATCHES ERROR:",
      error
    );
  }

  const databaseMatches =
    (data ?? []) as DatabaseMatch[];

  /*
    ========================================
    АВТОМАТИЧНА ТУРНІРНА ТАБЛИЦЯ
    ========================================

    Правила дивізіонів:

    1. Очки
    2. Різниця голів
    3. Забиті голи
    4. Особисті зустрічі
       тільки при рівності 2 гравців
  */

  const standings =
  buildStandings({
    participantIds:
      divisionPlayersIds,

    matches:
      databaseMatches.map(
        (match) => ({
          /*
            Для ТУРНІРНОЇ ТАБЛИЦІ
            старий гравець перетворюється
            на поточного власника слота.

            Наприклад:

            A → B

            завершені матчі A
            рахуються в турнірний слот B.

            Самі записи matches
            при цьому НЕ змінюються.
          */

          home_id:
            resolveReplacementPlayerId(
              match.home_id,
              replacements
            ),

          away_id:
            resolveReplacementPlayerId(
              match.away_id,
              replacements
            ),

          home_goals:
            match.home_goals,

          away_goals:
            match.away_goals,

          status:
            match.status,
        })
      ),

    format:
      "division-qualification",
  });

  /*
    ========================================
    ДОДАЄМО ДАНІ ГРАВЦІВ
    ========================================
  */

  const table =
    standings
      .map(
        (row) => {
          const player =
            players.find(
              (player) =>
                player.id ===
                row.playerId
            );

          if (!player) {
            return null;
          }

          return {
            ...row,
            player,
          };
        }
      )
      .filter(
        (
          row
        ): row is NonNullable<
          typeof row
        > =>
          row !== null
      );

  /*
    ========================================
    КІЛЬКІСТЬ ЗІГРАНИХ МАТЧІВ
    ========================================
  */

  const playedMatches =
    databaseMatches.filter(
      (match) =>
        match.status ===
          "finished" &&
        match.home_goals !==
          null &&
        match.away_goals !==
          null
    ).length;

  /*
    ========================================
    СТАТУС СЕЗОНУ
    ========================================
  */

  const seasonStatus =
    season === 1 ||
    season === 2
      ? "Архів"
      : season === 3
        ? "Поточний сезон"
        : "Підготовка";

  /*
    ========================================
    ОСОБЛИВІ ВИПАДКИ
    ========================================
  */

  const divisionDidNotExist =
    season === 1 &&
    division === 4;

  let emptyTitle =
    "Склад ще не сформовано";

  let emptyText =
    `Учасники ${division} Дивізіону Сезону ${season} будуть додані пізніше.`;

  if (divisionDidNotExist) {
    emptyTitle =
      "4 Дивізіон ще не існував";

    emptyText =
      "У Сезоні 1 Iron League змагання проходили у трьох дивізіонах. 4 Дивізіон з'явився пізніше.";
  }

  if (
    season === 4 &&
    divisionPlayersIds.length === 0
  ) {
    emptyTitle =
      "Склад ще не сформовано";

    emptyText =
      `${division} Дивізіон Сезону 4 буде сформовано перед стартом нового сезону.`;
  }

  return (
    <main className="min-h-screen bg-[#030711] text-white">
      
      {/* HEADER */}
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10">
        <StadiumBackground
          opacity="30"
          preload
        />

        {/* BACKGROUND OVERLAYS */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#030711] via-[#030711]/85 to-[#030711]/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#030711] via-transparent to-[#030711]/70" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:py-14">

          {/* BACK LINK */}
          <a
            href="/divisions"
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-300 transition hover:text-blue-200 sm:text-sm"
          >
            <span aria-hidden="true">←</span>
            Усі дивізіони
          </a>

          {/* TITLE */}
          <div className="mt-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 sm:text-xs">
              IRON LEAGUE CHAMPIONSHIP
            </div>

            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
              {division} Дивізіон
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
              Турнірна таблиця, результати та склад
              учасників {division} Дивізіону Iron League.
            </p>
          </div>

          {/* SEASON SWITCHER */}
          <div className="mt-6 sm:mt-8">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-white/50">
              Обрати сезон
            </div>

            <nav
              aria-label="Вибір сезону"
              className="grid w-full max-w-lg grid-cols-4 gap-1 rounded-xl border border-white/10 bg-[#07101d] p-1"
            >
              {([1, 2, 3, 4] as const).map(
                (seasonNumber) => (
                  <Link
                    key={seasonNumber}
                    href={`/divisions/${division}?season=${seasonNumber}`}
                    aria-current={
                      season === seasonNumber
                        ? "page"
                        : undefined
                    }
                    className={`flex min-h-10 items-center justify-center rounded-lg px-1 py-2 text-center text-[11px] font-bold transition-colors sm:text-sm ${
                      season === seasonNumber
                        ? "bg-blue-700 text-white shadow-lg shadow-blue-700/20"
                        : "text-white/55 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    Сезон {seasonNumber}
                  </Link>
                )
              )}
            </nav>
          </div>

          {/* SEASON INFORMATION */}
          <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-4 sm:gap-3">

            {/* SEASON */}
            <div className="min-w-0 rounded-xl border border-white/10 bg-[#07101d]/90 px-3 py-3 backdrop-blur-sm sm:px-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/45 sm:text-xs">
                Сезон
              </div>

              <div className="mt-1 text-xl font-black text-blue-300 sm:text-2xl">
                {season}
              </div>
            </div>

            {/* PARTICIPANTS */}
            <div className="min-w-0 rounded-xl border border-white/10 bg-[#07101d]/90 px-3 py-3 backdrop-blur-sm sm:px-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/45 sm:text-xs">
                Учасників
              </div>

              <div className="mt-1 text-xl font-black text-white sm:text-2xl">
                {divisionPlayersIds.length}
              </div>
            </div>

            {/* PLAYED MATCHES */}
            <div className="min-w-0 rounded-xl border border-white/10 bg-[#07101d]/90 px-3 py-3 backdrop-blur-sm sm:px-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/45 sm:text-xs">
                Зіграно матчів
              </div>

              <div className="mt-1 text-xl font-black text-white sm:text-2xl">
                {playedMatches}
              </div>
            </div>

            {/* STATUS */}
            <div className="min-w-0 rounded-xl border border-white/10 bg-[#07101d]/90 px-3 py-3 backdrop-blur-sm sm:px-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/45 sm:text-xs">
                Статус
              </div>

              <div className="mt-1 break-words text-sm font-black leading-6 text-blue-300 sm:text-base">
                {seasonStatus}
              </div>
            </div>
          </div>

          {/* DATABASE ERROR */}
          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            >
              Не вдалося завантажити результати з бази даних.
            </div>
          )}

        </div>
      </section>


      {/* TABLE */}

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Чемпіонат
          </div>

          <h2 className="mt-3 text-3xl font-black">
            Турнірна таблиця
          </h2>
        </div>

        {divisionPlayersIds.length ===
        0 ? (
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] px-8 py-16 text-center">
            <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[90px]" />

            <div className="relative">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-2xl font-black text-blue-300">
                {division}
              </div>

              <h3 className="mt-6 text-3xl font-black">
                {emptyTitle}
              </h3>

              <p className="mx-auto mt-4 max-w-xl leading-7 text-white/40">
                {emptyText}
              </p>
            </div>
          </div>
        ) : (
          <>
            
<div className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] shadow-2xl">

  {/* MOBILE STANDINGS */}
  <div className="lg:hidden">
    <div className="grid grid-cols-[28px_minmax(0,1fr)_30px_38px_14px] items-center gap-2 border-b border-white/10 bg-white/[0.04] px-3 py-3 text-[10px] font-bold uppercase text-white/70">
      <span className="text-center">#</span>
      <span>Гравець</span>
      <span className="text-center">І</span>
      <span className="text-center">О</span>
      <span />
    </div>

    {table.map((row, index) => (
      <details
        key={row.playerId}
        className="group border-b border-white/5 last:border-b-0"
      >
        <summary className="grid cursor-pointer list-none grid-cols-[28px_minmax(0,1fr)_30px_38px_14px] items-center gap-2 px-3 py-3.5 transition-colors hover:bg-white/[0.04] [&::-webkit-details-marker]:hidden">

          {/* POSITION */}
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black ${
              index < 3
                ? "bg-blue-500/15 text-blue-300"
                : "bg-white/[0.05] text-white/60"
            }`}
          >
            {index + 1}
          </span>

          {/* PLAYER */}
          <span className="min-w-0">
            <span className="block truncate text-xs font-bold text-white">
              {row.player.nickname}
            </span>

            {row.player.account && (
              <span className="mt-0.5 block truncate text-[10px] text-white/75">
                ({row.player.account})
              </span>
            )}
          </span>

          {/* MATCHES */}
          <span className="text-center text-xs tabular-nums text-white/60">
            {row.played}
          </span>

          {/* POINTS */}
          <span className="text-center text-base font-black tabular-nums text-white">
            {row.points}
          </span>

          {/* EXPAND */}
          <span
            aria-hidden="true"
            className="text-center text-xs text-blue-300/70 transition-transform group-open:rotate-180"
          >
            ⌄
          </span>
        </summary>

        {/* EXPANDED PLAYER STATS */}
        <div className="border-t border-white/5 bg-[#0a1526] px-3 pb-4 pt-3">

          <dl className="grid grid-cols-3 gap-2">
            {[
              {
                label: "Перемоги",
                value: row.wins,
              },
              {
                label: "Нічиї",
                value: row.draws,
              },
              {
                label: "Поразки",
                value: row.losses,
              },
              {
                label: "Забиті",
                value: row.goalsFor,
              },
              {
                label: "Пропущені",
                value: row.goalsAgainst,
              },
              {
                label: "Різниця",
                value:
                  row.goalDifference > 0
                    ? `+${row.goalDifference}`
                    : row.goalDifference,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="min-w-0 rounded-lg border border-white/5 bg-white/[0.025] p-2"
              >
                <dt className="text-[10px] text-white/45">
                  {stat.label}
                </dt>

                <dd className="mt-1 text-base font-black tabular-nums text-white">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>

          <a
            href={`/players/${row.player.id}?season=${season}`}
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-300 transition hover:text-blue-200"
          >
            Профіль гравця
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </details>
    ))}
  </div>

  {/* DESKTOP STANDINGS — ORIGINAL TABLE */}
  <div className="hidden overflow-x-auto lg:block">
    <table className="w-full min-w-[1000px]">

                  <thead className="border-b border-white/10 bg-white/[0.035]">
                    <tr className="text-xs font-bold uppercase tracking-wider text-white/70">
                      <th className="px-5 py-4 text-center">
                        #
                      </th>

                      <th className="px-5 py-4 text-left">
                        Гравець
                      </th>

                      <th className="px-4 py-4 text-center">
                        І
                      </th>

                      <th className="px-4 py-4 text-center">
                        В
                      </th>

                      <th className="px-4 py-4 text-center">
                        Н
                      </th>

                      <th className="px-4 py-4 text-center">
                        П
                      </th>

                      <th className="px-4 py-4 text-center">
                        ЗМ
                      </th>

                      <th className="px-4 py-4 text-center">
                        ПМ
                      </th>

                      <th className="px-4 py-4 text-center">
                        РМ
                      </th>

                      <th className="px-5 py-4 text-center">
                        О
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {table.map(
                      (
                        row,
                        index
                      ) => (
                        <tr
                          key={
                            row.playerId
                          }
                          className="border-b border-white/5 transition last:border-b-0 hover:bg-white/[0.04]"
                        >
                          <td className="px-5 py-4 text-center">
                            <div
                              className={`mx-auto flex h-9 w-9 items-center justify-center rounded-lg font-black ${
                                index <
                                3
                                  ? "bg-blue-500/15 text-blue-300"
                                  : "bg-white/[0.05] text-white/60"
                              }`}
                            >
                              {index +
                                1}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <a
                              href={`/players/${row.player.id}?season=${season}`}
                              className="group"
                            >
                              <div className="font-bold transition group-hover:text-blue-300">
                                {
                                  row
                                    .player
                                    .nickname
                                }
                              </div>

                              {row
                                .player
                                .account && (
                                <div className="mt-1 text-xs text-white/75">
                                  (
                                  {
                                    row
                                      .player
                                      .account
                                  }
                                  )
                                </div>
                              )}
                            </a>
                          </td>

                          <td className="px-4 py-4 text-center text-white/60">
                            {
                              row.played
                            }
                          </td>

                          <td className="px-4 py-4 text-center text-white/60">
                            {row.wins}
                          </td>

                          <td className="px-4 py-4 text-center text-white/60">
                            {row.draws}
                          </td>

                          <td className="px-4 py-4 text-center text-white/60">
                            {
                              row.losses
                            }
                          </td>

                          <td className="px-4 py-4 text-center text-white/60">
                            {
                              row.goalsFor
                            }
                          </td>

                          <td className="px-4 py-4 text-center text-white/60">
                            {
                              row.goalsAgainst
                            }
                          </td>

                          <td
                            className={`px-4 py-4 text-center font-semibold ${
                              row.goalDifference >
                              0
                                ? "text-green-400"
                                : row.goalDifference <
                                    0
                                  ? "text-red-400"
                                  : "text-white/50"
                            }`}
                          >
                            {row.goalDifference >
                            0
                              ? `+${row.goalDifference}`
                              : row.goalDifference}
                          </td>

                          <td className="px-5 py-4 text-center text-xl font-black">
                            {
                              row.points
                            }
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MOBILE TABLE LEGEND */}
<div className="mt-4 flex flex-wrap gap-5 px-1 text-xs text-white/45 lg:hidden">
  <span>
    <b className="text-white/70">І</b> — ігри
  </span>

  <span>
    <b className="text-white/70">О</b> — очки
  </span>
</div>

            <div className="mt-6 hidden flex-wrap gap-6 text-xs text-white/35 lg:flex">
              <span>
                <b className="text-white/60">
                  І
                </b>{" "}
                — ігри
              </span>

              <span>
                <b className="text-white/60">
                  В
                </b>{" "}
                — перемоги
              </span>

              <span>
                <b className="text-white/60">
                  Н
                </b>{" "}
                — нічиї
              </span>

              <span>
                <b className="text-white/60">
                  П
                </b>{" "}
                — поразки
              </span>

              <span>
                <b className="text-white/60">
                  ЗМ
                </b>{" "}
                — забиті м&apos;ячі
              </span>

              <span>
                <b className="text-white/60">
                  ПМ
                </b>{" "}
                — пропущені м&apos;ячі
              </span>

              <span>
                <b className="text-white/60">
                  РМ
                </b>{" "}
                — різниця м&apos;ячів
              </span>

              <span>
                <b className="text-white/60">
                  О
                </b>{" "}
                — очки
              </span>
            </div>
          </>
        )}
      </section>

      {/* CALENDAR */}

      {!divisionDidNotExist && (
        <DivisionSchedule
          season={season}
          division={division}
          results={databaseMatches}
        />
      )}
    </main>
  );
}