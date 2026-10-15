import StadiumBackground from "./StadiumBackground";
import SiteHeader from "./public/SiteHeader";
import { connection } from "next/server";
import Link from "next/link";

import { players } from "../data/players";

import { getCompetitionGroups } from "../data/competitions/get-competition-groups";
import { getCompetitionPlayers } from "../data/competitions/get-competition-players";
import EuropeanPlayoffBracket from "./EuropeanPlayoffBracket";

import { buildStandings } from "../lib/standings";
import {
  getSeasonPlayerReplacements,
  applyPlayerReplacements,
} from "../lib/player-replacements";
import { supabase } from "../lib/supabase";
import Image from "next/image";

type Competition =
  | "championsLeague"
  | "europaLeague"
  | "conferenceLeague";

type SeasonNumber = 1 | 2 | 3 | 4;

type GroupStagePageProps = {
  competition: Competition;
  season: SeasonNumber;
};

type DatabaseMatch = {
  id: string;

  group_name: string | null;

  home_id: string;
  away_id: string;

  home_goals: number | null;
  away_goals: number | null;

  status: string;
};

const competitionNames: Record<
  Competition,
  string
> = {
  championsLeague:
    "Ліга чемпіонів",

  europaLeague:
    "Ліга Європи",

  conferenceLeague:
    "Ліга конференцій",
};

const competitionIds: Record<
  Competition,
  string
> = {
  championsLeague:
    "champions-league",

  europaLeague:
    "europa-league",

  conferenceLeague:
    "conference-league",
};

const competitionRoutes: Record<
  Competition,
  string
> = {
  championsLeague:
    "champions-league",

  europaLeague:
    "europa-league",

  conferenceLeague:
    "conference-league",
};

export default async function GroupStagePage({
  competition,
  season,
}: GroupStagePageProps) {
  /*
    Щоб результати Supabase
    не залишалися статичними
    після build.
  */

  await connection();

  const competitionName =
    competitionNames[
      competition
    ];

  const competitionId =
    competitionIds[
      competition
    ];

  const competitionRoute =
    competitionRoutes[
      competition
    ];

  /*
    ========================================
    ГРУПИ СЕЗОНУ
    ========================================
  */

  const groupNames =
    getCompetitionGroups({
      season,
      competition:
        competitionId,
    });

  /*
    ========================================
    УСІ МАТЧІ ГРУПОВОГО ЕТАПУ
    ========================================
  */

  const {
    data,
    error,
  } = await supabase
    .from("matches")
    .select(
      `
        id,
        group_name,
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
      competitionId
    )
    .eq(
      "stage",
      "group"
    );

  const databaseMatches =
    (data ?? []) as DatabaseMatch[];
    /*
  ========================================
  АКТУАЛЬНІ ГРАВЦІ ПІСЛЯ ЗАМІН
  ========================================
*/

const replacements =
  season === 3
    ? await getSeasonPlayerReplacements(season)
    : [];

const resolveCurrentPlayerId = (
  playerId: string
): string => {
  return (
    applyPlayerReplacements(
      [playerId],
      replacements
    )[0] ?? playerId
  );
};

  /*
    ========================================
    ДАНІ КОЖНОЇ ГРУПИ
    ========================================
  */

  const groups =
    groupNames.map(
      (groupName) => {
        const participantIds =
  applyPlayerReplacements(
    getCompetitionPlayers({
      season,
      competition: competitionId,
      groupName,
    }),
    replacements
  );

        const groupMatches =
          databaseMatches.filter(
            (match) =>
              match.group_name ===
              groupName
          );

        /*
          Автоматична таблиця:

          1. Очки
          2. Різниця голів
          3. Особисті зустрічі
             тільки для 2 гравців
          4. Забиті голи
        */

        const standings =
          buildStandings({
            participantIds,

            matches:
              groupMatches.map(
                (match) => ({
                  home_id:
  resolveCurrentPlayerId(
    match.home_id
  ),

away_id:
  resolveCurrentPlayerId(
    match.away_id
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
              "europe-group",
          });

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

        const playedMatches =
          groupMatches.filter(
            (match) =>
              match.status ===
                "finished" &&
              match.home_goals !==
                null &&
              match.away_goals !==
                null
          ).length;

        return {
          name:
            groupName,

          participantIds,

          table,

          playedMatches,
        };
      }
    );

  /*
    ========================================
    ЗАГАЛЬНІ ПОКАЗНИКИ
    ========================================
  */

  const totalPlayers =
    groups.reduce(
      (
        total,
        group
      ) =>
        total +
        group.participantIds
          .length,
      0
    );

  const totalPlayedMatches =
    groups.reduce(
      (
        total,
        group
      ) =>
        total +
        group.playedMatches,
      0
    );

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
    ПОРОЖНІЙ СТАН
    ========================================
  */

  const emptyTitle =
    season === 4
      ? "Жеребкування ще не проведено"
      : "Дані групового етапу відсутні";

  const emptyText =
    season === 4
      ? `Групи турніру «${competitionName}» Сезону 4 будуть сформовані перед стартом турніру.`
      : `Для турніру «${competitionName}» Сезону ${season} групи поки не налаштовані.`;

        // ВІЗУАЛЬНА ТЕМА ЄВРОКУБКА
  const visualTheme = {
    championsLeague: {
      accent: "text-blue-400",
      accentSoft: "text-blue-300",
      active: "bg-blue-600 shadow-blue-500/20",
    },

    europaLeague: {
      accent: "text-orange-400",
      accentSoft: "text-orange-300",
      active: "bg-orange-700 shadow-orange-500/20",
    },

    conferenceLeague: {
      accent: "text-emerald-400",
      accentSoft: "text-emerald-300",
      active: "bg-emerald-700 shadow-emerald-500/20",
    },
  }[competition];

  return (
    <main className="min-h-screen bg-[#030711] text-white">

      {/* HEADER */}
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10">
        {competition === "championsLeague" ? (
  <Image
    src="/backgrounds/iron-league-champions-league-bg.webp"
    alt=""
    fill
    preload
    sizes="100vw"
    quality={75}
    className={
  competition === "championsLeague"
    ? "object-cover object-[88%_center] opacity-85 sm:object-[75%_center] lg:object-[center_30%]"
    : "object-cover object-center opacity-60"
}
  />
) : (
  <StadiumBackground opacity="25" preload />
)}

        {/* BACKGROUND */}
        <div
  className={
    competition === "championsLeague"
      ? "absolute inset-0 bg-gradient-to-r from-[#030711]/90 via-[#030711]/60 to-[#030711]/25 lg:from-[#030711]/85 lg:via-[#030711]/45 lg:to-[#030711]/20"
      : "absolute inset-0 bg-gradient-to-r from-[#030711] via-[#030711]/85 to-[#030711]/60"
  }
/>
        <div
  className={
    competition === "championsLeague"
      ? "absolute inset-0 bg-gradient-to-t from-[#030711] via-[#030711]/10 to-[#030711]/35"
      : "absolute inset-0 bg-gradient-to-t from-[#030711] via-transparent to-[#030711]/70"
  }
/>

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:py-14">

          {/* BACK LINK */}
          <a
            href="/"
            className={`inline-flex items-center gap-2 text-xs font-semibold transition hover:text-white sm:text-sm ${visualTheme.accentSoft}`}
          >
            <span aria-hidden="true">←</span>
            На головну
          </a>

          {/* TITLE */}
          <div className="mt-5">

            <div
              className={`text-[10px] font-bold uppercase tracking-[0.2em] sm:text-xs ${visualTheme.accent}`}
            >
              IRON LEAGUE EUROPEAN CUPS
            </div>

            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
              {competitionName}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
              Груповий етап, результати та турнірні таблиці
              за сезонами Iron League.
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
                    href={`/tournaments/${competitionRoute}?season=${seasonNumber}`}
                    aria-current={
                      season === seasonNumber
                        ? "page"
                        : undefined
                    }
                    className={`flex min-h-10 items-center justify-center rounded-lg px-1 py-2 text-center text-[11px] font-bold transition-colors sm:text-sm ${
                      season === seasonNumber
                        ? `${visualTheme.active} text-white shadow-lg`
                        : "text-white/55 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    Сезон {seasonNumber}
                  </Link>
                )
              )}
            </nav>
          </div>

          {/* COMPETITION STATISTICS */}
          <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">

            {/* SEASON */}
            <div className="min-w-0 rounded-xl border border-white/10 bg-[#07101d]/90 px-3 py-3 backdrop-blur-sm sm:px-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/45 sm:text-xs">
                Сезон
              </div>

              <div
                className={`mt-1 text-xl font-black sm:text-2xl ${visualTheme.accentSoft}`}
              >
                {season}
              </div>
            </div>

            {/* GROUPS */}
            <div className="min-w-0 rounded-xl border border-white/10 bg-[#07101d]/90 px-3 py-3 backdrop-blur-sm sm:px-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/45 sm:text-xs">
                Груп
              </div>

              <div className="mt-1 text-xl font-black text-white sm:text-2xl">
                {groupNames.length}
              </div>
            </div>

            {/* PARTICIPANTS */}
            <div className="min-w-0 rounded-xl border border-white/10 bg-[#07101d]/90 px-3 py-3 backdrop-blur-sm sm:px-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/45 sm:text-xs">
                Учасників
              </div>

              <div className="mt-1 text-xl font-black text-white sm:text-2xl">
                {totalPlayers}
              </div>
            </div>

            {/* PLAYED MATCHES */}
            <div className="min-w-0 rounded-xl border border-white/10 bg-[#07101d]/90 px-3 py-3 backdrop-blur-sm sm:px-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/45 sm:text-xs">
                Зіграно матчів
              </div>

              <div className="mt-1 text-xl font-black text-white sm:text-2xl">
                {totalPlayedMatches}
              </div>
            </div>

            {/* STATUS */}
            <div className="col-span-2 min-w-0 rounded-xl border border-white/10 bg-[#07101d]/90 px-3 py-3 backdrop-blur-sm sm:col-span-1 sm:px-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/45 sm:text-xs">
                Статус
              </div>

              <div
                className={`mt-1 break-words text-sm font-black leading-6 sm:text-base ${visualTheme.accentSoft}`}
              >
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


      {/* GROUPS */}

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="mb-10">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Груповий етап
          </div>

          <h2 className="mt-3 text-3xl font-black">
            Турнірні таблиці
          </h2>
        </div>

        {totalPlayers === 0 ? (
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] px-8 py-16 text-center">
            <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[90px]" />

            <div className="relative">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-xl font-black text-blue-300">
                {season}
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
          <div className="grid gap-4 sm:gap-5 xl:grid-cols-2">
            {groups.map(
              (group) => (
                <div
                  key={
                    group.name
                  }
                  className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] shadow-xl"
                >
                  {/* GROUP HEADER */}


{/* COMPACT GROUP HEADER */}
<div className="flex items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-blue-500/15 to-transparent px-4 py-2.5 sm:px-5 sm:py-3">

  {/* GROUP NAME */}
  <div className="flex min-w-0 items-baseline gap-2">
    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-400 sm:text-xs">
      Група
    </span>

    <h3 className="text-[22px] font-black leading-none tracking-tight text-white sm:text-2xl">
      {group.name}
    </h3>
  </div>

  {/* MATCH COUNT */}
  <span className="shrink-0 text-[11px] text-white/40">
    {group.playedMatches} матчів
  </span>

</div>


                  {/* TABLE */}


{/* MOBILE GROUP STANDINGS */}
<div className="lg:hidden">

  {/* TABLE HEADER */}

<div className="grid grid-cols-[28px_minmax(0,1fr)_26px_34px_14px] items-center gap-2 border-b border-white/10 bg-white/[0.035] px-3 py-1.5 text-[10px] font-bold uppercase text-white/80">
    <span className="text-center">#</span>
    <span className="text-[9px] tracking-tight">
  Гравець
</span>
    <span className="text-center">І</span>
    <span className="text-center">О</span>
    <span />
  </div>

  {/* PLAYERS */}
  {group.table.map((row, index) => (
    <details
      key={row.playerId}
      className="group border-b border-white/5 last:border-b-0"
    >
      <summary className="grid cursor-pointer list-none grid-cols-[28px_minmax(0,1fr)_26px_34px_14px] items-center gap-2 px-3 py-2.5 transition-colors hover:bg-white/[0.04] [&::-webkit-details-marker]:hidden">

        {/* POSITION */}
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black ${
            index < 2
              ? "bg-blue-500/15 text-blue-300"
              : "bg-white/[0.05] text-white/55"
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

        {/* PLAYED */}
        <span className="text-center text-xs tabular-nums text-white/60">
          {row.played}
        </span>

        {/* POINTS */}
        <span className="text-center text-base font-black tabular-nums text-white">
          {row.points}
        </span>

        {/* EXPAND ICON */}
        <span
          aria-hidden="true"
          className="text-center text-xs text-blue-300/70 transition-transform group-open:rotate-180"
        >
          ⌄
        </span>
      </summary>

      {/* EXPANDED STATISTICS */}
      <div className="border-t border-white/5 bg-[#0a1526] px-2 pb-2 pt-2">

        <dl className="grid grid-cols-3 gap-1.5">
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
              className="min-w-0 rounded-md border border-white/5 bg-white/[0.025] px-2 py-1.5"
            >
              <dt className="text-[10px] text-white/45">
                {stat.label}
              </dt>

              <dd className="mt-0.5 text-sm font-black leading-5 tabular-nums text-white">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>

        {/* PLAYER PROFILE */}
        <a
          href={`/players/${row.player.id}?season=${season}`}
          className={`mt-3 inline-flex items-center gap-1 text-xs font-bold transition hover:text-white ${visualTheme.accentSoft}`}
        >
          Профіль гравця
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </details>
  ))}
</div>


                  <div className="hidden overflow-x-auto lg:block">
                    <table className="w-full min-w-[590px]">

<thead className="border-b border-white/10 bg-white/[0.025] [&_th]:py-1.5">
                        <tr className="text-[11px] font-bold uppercase text-white/35">
                          <th className="px-3 py-3 text-center">
                            #
                          </th>

                          <th className="px-3 py-3 text-left">
                            Гравець
                          </th>

                          <th className="px-2 py-3 text-center">
                            І
                          </th>

                          <th className="px-2 py-3 text-center">
                            В
                          </th>

                          <th className="px-2 py-3 text-center">
                            Н
                          </th>

                          <th className="px-2 py-3 text-center">
                            П
                          </th>

                          <th className="px-2 py-3 text-center">
                            ЗМ
                          </th>

                          <th className="px-2 py-3 text-center">
                            ПМ
                          </th>

                          <th className="px-2 py-3 text-center">
                            РМ
                          </th>

                          <th className="px-3 py-3 text-center">
                            О
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {group.table.map(
                          (
                            row,
                            index
                          ) => (
                            <tr
                              key={
                                row.playerId
                              }
                              className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.035]"
                            >
                              <td className="px-3 py-4 text-center">
                                <div
                                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black ${
                                    index <
                                    2
                                      ? "bg-blue-500/15 text-blue-300"
                                      : "bg-white/[0.05] text-white/50"
                                  }`}
                                >
                                  {index +
                                    1}
                                </div>
                              </td>

                              <td className="px-3 py-4">
                                <a
                                  href={`/players/${row.player.id}?season=${season}`}
                                  className="group/player"
                                >
                                  <div className="font-bold transition group-hover/player:text-blue-300">
                                    {
                                      row
                                        .player
                                        .nickname
                                    }
                                  </div>

                                  {row
                                    .player
                                    .account && (
                                    <div className="mt-1 text-[11px] text-white/30">
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

                              <td className="px-2 py-4 text-center text-white/55">
                                {
                                  row.played
                                }
                              </td>

                              <td className="px-2 py-4 text-center text-white/55">
                                {
                                  row.wins
                                }
                              </td>

                              <td className="px-2 py-4 text-center text-white/55">
                                {
                                  row.draws
                                }
                              </td>

                              <td className="px-2 py-4 text-center text-white/55">
                                {
                                  row.losses
                                }
                              </td>

                              <td className="px-2 py-4 text-center text-white/55">
                                {
                                  row.goalsFor
                                }
                              </td>

                              <td className="px-2 py-4 text-center text-white/55">
                                {
                                  row.goalsAgainst
                                }
                              </td>

                              <td
                                className={`px-2 py-4 text-center font-semibold ${
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

                              <td className="px-3 py-4 text-center text-lg font-black">
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
              )
            )}
          </div>
        )}


{/* MOBILE LEGEND */}
{totalPlayers > 0 && (
  <div className="mt-4 flex flex-wrap gap-5 px-1 text-xs text-white/80 lg:hidden">
    <span>
      <b className="text-white/70">І</b> — ігри
    </span>

    <span>
      <b className="text-white/70">О</b> — очки
    </span>
  </div>
)}


        {/* LEGEND */}

        {totalPlayers > 0 && (
            <div className="mt-8 hidden flex-wrap gap-5 text-xs text-white/35 lg:flex">
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
              — забиті
            </span>

            <span>
              <b className="text-white/60">
                ПМ
              </b>{" "}
              — пропущені
            </span>

            <span>
              <b className="text-white/60">
                РМ
              </b>{" "}
              — різниця
            </span>

            <span>
              <b className="text-white/60">
                О
              </b>{" "}
              — очки
            </span>
          </div>
        )}
            </section>

      {/* PLAYOFF */}

      <EuropeanPlayoffBracket
        season={season}
        competition={
          competitionId as
            | "champions-league"
            | "europa-league"
            | "conference-league"
        }
      />
    </main>
  );
}