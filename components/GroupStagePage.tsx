import { connection } from "next/server";

import { players } from "../data/players";

import { getCompetitionGroups } from "../data/competitions/get-competition-groups";
import { getCompetitionPlayers } from "../data/competitions/get-competition-players";
import EuropeanPlayoffBracket from "./EuropeanPlayoffBracket";

import { buildStandings } from "../lib/standings";
import { supabase } from "../lib/supabase";

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
    ДАНІ КОЖНОЇ ГРУПИ
    ========================================
  */

  const groups =
    groupNames.map(
      (groupName) => {
        const participantIds =
          getCompetitionPlayers({
            season,

            competition:
              competitionId,

            groupName,
          });

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
                    match.home_id,

                  away_id:
                    match.away_id,

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

  return (
    <main className="min-h-screen bg-[#030711] text-white">
      {/* HEADER */}

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#030711]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a
            href="/"
            className="flex items-center gap-4"
          >
            <img
              src="/iron-league-logo.jpg"
              alt="Iron League"
              className="h-14 w-auto object-contain"
            />

            <div>
              <div className="font-black tracking-[0.18em]">
                IRON LEAGUE
              </div>

              <div className="text-xs text-white/40">
                {competitionName}
              </div>
            </div>
          </a>

          <a
            href="/"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-blue-300 transition hover:border-blue-400/30 hover:bg-blue-500/10"
          >
            ← На головну
          </a>
        </div>
      </header>

      {/* HERO */}

      <section className="relative overflow-hidden border-b border-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{
            backgroundImage:
              "url('/stadium-bg.jpg')",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#030711] via-[#030711]/85 to-[#030711]/65" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#030711] via-transparent to-[#030711]/70" />

        <div className="relative mx-auto max-w-7xl px-6 py-20">
          <div className="text-xs font-bold uppercase tracking-[0.28em] text-blue-400">
            Iron League
          </div>

          <h1 className="mt-4 text-5xl font-black sm:text-6xl">
            {competitionName}
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/55">
            Груповий етап,
            результати та
            турнірні таблиці
            за сезонами
            Iron League.
          </p>

          {/* SEASON SWITCHER */}

          <div className="mt-8">
            <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/35">
              Обрати сезон
            </div>

            <div className="inline-flex flex-wrap rounded-xl border border-white/10 bg-[#07101d] p-1">
              {(
                [1, 2, 3, 4] as const
              ).map(
                (
                  seasonNumber
                ) => (
                  <a
                    key={
                      seasonNumber
                    }
                    href={`/tournaments/${competitionRoute}?season=${seasonNumber}`}
                    className={`rounded-lg px-5 py-2.5 text-sm font-bold transition ${
                      season ===
                      seasonNumber
                        ? "bg-blue-500 text-white"
                        : "text-white/45 hover:text-white"
                    }`}
                  >
                    Сезон{" "}
                    {
                      seasonNumber
                    }
                  </a>
                )
              )}
            </div>
          </div>

          {/* INFO */}

          <div className="mt-8 flex flex-wrap gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">
                Сезон
              </span>

              <span className="ml-2 font-black text-blue-300">
                {season}
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">
                Груп
              </span>

              <span className="ml-2 font-black">
                {
                  groupNames.length
                }
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">
                Учасників
              </span>

              <span className="ml-2 font-black">
                {totalPlayers}
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">
                Зіграно матчів
              </span>

              <span className="ml-2 font-black">
                {
                  totalPlayedMatches
                }
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">
                Статус
              </span>

              <span className="ml-2 font-black text-blue-300">
                {seasonStatus}
              </span>
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-400/20 bg-red-500/10 px-5 py-4 text-sm text-red-200">
              Не вдалося
              завантажити
              результати з бази
              даних.
            </div>
          )}
        </div>
      </section>

      {/* GROUPS */}

      <section className="mx-auto max-w-7xl px-6 py-16">
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
          <div className="grid gap-6 xl:grid-cols-2">
            {groups.map(
              (group) => (
                <div
                  key={
                    group.name
                  }
                  className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] shadow-xl"
                >
                  {/* GROUP HEADER */}

                  <div className="flex items-end justify-between border-b border-white/10 bg-gradient-to-r from-blue-500/15 to-transparent px-6 py-5">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                        Група
                      </div>

                      <div className="mt-1 text-4xl font-black">
                        {
                          group.name
                        }
                      </div>
                    </div>

                    <div className="text-xs text-white/35">
                      {
                        group.playedMatches
                      }{" "}
                      матчів
                    </div>
                  </div>

                  {/* TABLE */}

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[690px]">
                      <thead className="border-b border-white/10 bg-white/[0.025]">
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

        {/* LEGEND */}

        {totalPlayers > 0 && (
          <div className="mt-8 flex flex-wrap gap-5 text-xs text-white/35">
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