import { players } from "../data/players";

import { season1 } from "../data/seasons/season-1";
import { season2 } from "../data/seasons/season-2";
import { season3 } from "../data/seasons/season-3";
import { season4 } from "../data/seasons/season-4";

import {
  calculateStandings,
  type LeagueMatch,
} from "../lib/calculateStandings";

import { supabase } from "../lib/supabase";

import DivisionSchedule from "./DivisionSchedule";

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

function getDivisionPlayers(
  season: SeasonNumber,
  division: DivisionNumber
): readonly string[] {
  // СЕЗОН 1 — тільки 3 дивізіони
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

  // СЕЗОН 2 — 4 дивізіони
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

  // СЕЗОН 3
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

  // СЕЗОН 4
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
  const divisionPlayersIds =
    getDivisionPlayers(season, division);

  /*
    МАТЧІ З SUPABASE
  */

  const { data, error } = await supabase
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
    .eq("season", season)
    .eq("competition", "division")
    .eq("division", division)
    .order("round", {
      ascending: true,
    });

  const databaseMatches =
    (data ?? []) as DatabaseMatch[];

  /*
    Для таблиці враховуємо
    тільки завершені матчі.
  */

  const finishedMatches: LeagueMatch[] =
    databaseMatches
      .filter(
        (match) =>
          match.status === "finished" &&
          match.home_goals !== null &&
          match.away_goals !== null
      )
      .map((match) => ({
        id: match.id,
        round: match.round ?? undefined,
        home: match.home_id,
        away: match.away_id,
        homeGoals: match.home_goals,
        awayGoals: match.away_goals,
      }));

  /*
    АВТОМАТИЧНА ТУРНІРНА ТАБЛИЦЯ
  */

  const standings =
    calculateStandings(
      divisionPlayersIds,
      finishedMatches
    );

  const table = standings
    .map((row) => {
      const player = players.find(
        (player) =>
          player.id === row.playerId
      );

      if (!player) {
        return null;
      }

      return {
        ...row,
        player,
      };
    })
    .filter(
      (
        row
      ): row is NonNullable<typeof row> =>
        row !== null
    );

  const playedMatches =
    finishedMatches.length;

  /*
    СТАТУС СЕЗОНУ
  */

  const seasonStatus =
    season === 1 || season === 2
      ? "Архів"
      : season === 3
        ? "Поточний сезон"
        : "Підготовка";

  /*
    ОСОБЛИВІ ВИПАДКИ
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
                {division} Дивізіон
              </div>
            </div>
          </a>

          <a
            href="/divisions"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-blue-300 transition hover:border-blue-400/30 hover:bg-blue-500/10"
          >
            ← Усі дивізіони
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{
            backgroundImage:
              "url('/stadium-bg.jpg')",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#030711] via-[#030711]/85 to-[#030711]/60" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#030711] via-transparent to-[#030711]/70" />

        <div className="relative mx-auto max-w-7xl px-6 py-20">
          <div className="text-xs font-bold uppercase tracking-[0.28em] text-blue-400">
            Iron League Championship
          </div>

          <h1 className="mt-4 text-5xl font-black sm:text-6xl">
            {division} Дивізіон
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/55">
            Турнірна таблиця, результати та склад
            учасників {division} Дивізіону Iron League.
          </p>

          {/* SEASON SWITCHER */}
          <div className="mt-8">
            <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/35">
              Обрати сезон
            </div>

            <div className="inline-flex flex-wrap rounded-xl border border-white/10 bg-[#07101d] p-1">
              {([1, 2, 3, 4] as const).map(
                (seasonNumber) => (
                  <a
                    key={seasonNumber}
                    href={`/divisions/${division}?season=${seasonNumber}`}
                    className={`rounded-lg px-5 py-2.5 text-sm font-bold transition ${
                      season === seasonNumber
                        ? "bg-blue-500 text-white"
                        : "text-white/45 hover:text-white"
                    }`}
                  >
                    Сезон {seasonNumber}
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
                Учасників
              </span>

              <span className="ml-2 font-black">
                {divisionPlayersIds.length}
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">
                Зіграно матчів
              </span>

              <span className="ml-2 font-black">
                {playedMatches}
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
              Не вдалося завантажити результати
              з бази даних.
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

        {divisionPlayersIds.length === 0 ? (
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
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                  <thead className="border-b border-white/10 bg-white/[0.035]">
                    <tr className="text-xs font-bold uppercase tracking-wider text-white/35">
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
                      (row, index) => (
                        <tr
                          key={row.playerId}
                          className="border-b border-white/5 transition last:border-b-0 hover:bg-white/[0.04]"
                        >
                          <td className="px-5 py-4 text-center">
                            <div
                              className={`mx-auto flex h-9 w-9 items-center justify-center rounded-lg font-black ${
                                index < 3
                                  ? "bg-blue-500/15 text-blue-300"
                                  : "bg-white/[0.05] text-white/60"
                              }`}
                            >
                              {index + 1}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <a
                              href={`/players/${row.player.id}?season=${season}`}
                              className="group"
                            >
                              <div className="font-bold transition group-hover:text-blue-300">
                                {row.player.nickname}
                              </div>

                              {row.player.account && (
                                <div className="mt-1 text-xs text-white/35">
                                  ({row.player.account})
                                </div>
                              )}
                            </a>
                          </td>

                          <td className="px-4 py-4 text-center text-white/60">
                            {row.played}
                          </td>

                          <td className="px-4 py-4 text-center text-white/60">
                            {row.wins}
                          </td>

                          <td className="px-4 py-4 text-center text-white/60">
                            {row.draws}
                          </td>

                          <td className="px-4 py-4 text-center text-white/60">
                            {row.losses}
                          </td>

                          <td className="px-4 py-4 text-center text-white/60">
                            {row.goalsFor}
                          </td>

                          <td className="px-4 py-4 text-center text-white/60">
                            {row.goalsAgainst}
                          </td>

                          <td
                            className={`px-4 py-4 text-center font-semibold ${
                              row.goalDifference > 0
                                ? "text-green-400"
                                : row.goalDifference < 0
                                  ? "text-red-400"
                                  : "text-white/50"
                            }`}
                          >
                            {row.goalDifference > 0
                              ? `+${row.goalDifference}`
                              : row.goalDifference}
                          </td>

                          <td className="px-5 py-4 text-center text-xl font-black">
                            {row.points}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-6 text-xs text-white/35">
              <span>
                <b className="text-white/60">І</b> — ігри
              </span>

              <span>
                <b className="text-white/60">В</b> — перемоги
              </span>

              <span>
                <b className="text-white/60">Н</b> — нічиї
              </span>

              <span>
                <b className="text-white/60">П</b> — поразки
              </span>

              <span>
                <b className="text-white/60">ЗМ</b> — забиті м&apos;ячі
              </span>

              <span>
                <b className="text-white/60">ПМ</b> — пропущені м&apos;ячі
              </span>

              <span>
                <b className="text-white/60">РМ</b> — різниця м&apos;ячів
              </span>

              <span>
                <b className="text-white/60">О</b> — очки
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