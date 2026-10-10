import { players } from "../../../data/players";

import { season1 } from "../../../data/seasons/season-1";
import { season2 } from "../../../data/seasons/season-2";
import { season3 } from "../../../data/seasons/season-3";
import { season4 } from "../../../data/seasons/season-4";

import { buildStandings } from "../../../lib/standings";
import { supabaseAdmin } from "../../../lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/*
  ========================================
  TYPES
  ========================================
*/

type SeasonNumber = 1 | 2 | 3 | 4;

type PageProps = {
  searchParams: Promise<{
    season?: string;
  }>;
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
  PLAYER NAME
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
  PLAYER ACCOUNT
  ========================================
*/

function getPlayerAccount(
  playerId: string
) {
  return (
    players.find(
      (player) =>
        player.id === playerId
    )?.account ?? null
  );
}

/*
  ========================================
  QUALIFIED PLAYERS

  Правило:

  Якщо гравець є у складі
  хоча б одного дивізіону
  відповідного сезону,
  він вважається таким,
  що пройшов кваліфікацію.

  Місце у кваліфікаційній
  таблиці на цей статус
  не впливає.
  ========================================
*/

function getQualifiedPlayerIds(
  season: SeasonNumber
): Set<string> {
  /*
    СЕЗОН 1
    Було 3 дивізіони
  */

  if (season === 1) {
    return new Set<string>([
      ...season1.division1.players,
      ...season1.division2.players,
      ...season1.division3.players,
    ]);
  }

  /*
    СЕЗОН 2
  */

  if (season === 2) {
    return new Set<string>([
      ...season2.division1.players,
      ...season2.division2.players,
      ...season2.division3.players,
      ...season2.division4.players,
    ]);
  }

  /*
    СЕЗОН 3
  */

  if (season === 3) {
    return new Set<string>([
      ...season3.division1.players,
      ...season3.division2.players,
      ...season3.division3.players,
      ...season3.division4.players,
    ]);
  }

  /*
    СЕЗОН 4
  */

  return new Set<string>([
    ...season4.division1.players,
    ...season4.division2.players,
    ...season4.division3.players,
    ...season4.division4.players,
  ]);
}

/*
  ========================================
  QUALIFICATION PAGE
  ========================================
*/

export default async function QualificationPage({
  searchParams,
}: PageProps) {
  /*
    ========================================
    SEASON
    ========================================
  */

  const params = await searchParams;

  const requestedSeason =
    Number(params.season);

  const season: SeasonNumber =
    requestedSeason >= 1 &&
    requestedSeason <= 4
      ? (requestedSeason as SeasonNumber)
      : 1;

  /*
    ========================================
    QUALIFIED PLAYER IDS
    ========================================
  */

  const qualifiedPlayerIds =
    getQualifiedPlayerIds(
      season
    );

  /*
    ========================================
    MATCHES
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
      "qualification"
    )
    .order(
      "round",
      {
        ascending: true,
        nullsFirst: false,
      }
    );

  if (error) {
    throw new Error(
      `Qualification loading error: ${error.message}`
    );
  }

  const databaseMatches =
    (data ?? []) as DatabaseMatch[];

  /*
    ========================================
    PARTICIPANTS
    ========================================

    Список учасників кваліфікації
    беремо безпосередньо з матчів.
  */

  const participantIds =
    Array.from(
      new Set(
        databaseMatches.flatMap(
          (match) => [
            match.home_id,
            match.away_id,
          ]
        )
      )
    );

  /*
    ========================================
    STANDINGS
    ========================================
  */

  const standings =
    buildStandings({
      participantIds,

      matches:
        databaseMatches.map(
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
        "division-qualification",
    });

  /*
    ========================================
    PLAYER DATA
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
    MATCH SUMMARY
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

  const scheduledMatches =
    databaseMatches.filter(
      (match) =>
        match.status !==
          "finished" ||
        match.home_goals ===
          null ||
        match.away_goals ===
          null
    ).length;

  /*
    ========================================
    QUALIFIED COUNT

    Рахуємо лише учасників
    цієї кваліфікації, які
    реально потрапили у дивізіони.
    ========================================
  */

  const qualifiedCount =
    table.filter(
      (row) =>
        qualifiedPlayerIds.has(
          row.playerId
        )
    ).length;

  /*
    ========================================
    ROUNDS
    ========================================
  */

  const roundsMap =
    new Map<
      number,
      DatabaseMatch[]
    >();

  for (
    const match of databaseMatches
  ) {
    if (
      match.round === null
    ) {
      continue;
    }

    const currentMatches =
      roundsMap.get(
        match.round
      ) ?? [];

    currentMatches.push(
      match
    );

    roundsMap.set(
      match.round,
      currentMatches
    );
  }

  const rounds =
    Array.from(
      roundsMap.entries()
    ).sort(
      (
        [roundA],
        [roundB]
      ) =>
        roundA - roundB
    );

  /*
    ========================================
    PAGE
    ========================================
  */

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
                Кваліфікація
              </div>
            </div>
          </a>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-white/60 lg:flex">
            <a
              href="/"
              className="transition hover:text-white"
            >
              Головна
            </a>

            <a
              href="/matches"
              className="transition hover:text-white"
            >
              Матчі
            </a>

            <a
              href="/divisions"
              className="transition hover:text-white"
            >
              Дивізіони
            </a>

            <a
              href="/#tournaments"
              className="text-white"
            >
              Турніри
            </a>

            <a
              href="/players"
              className="transition hover:text-white"
            >
              Гравці
            </a>

            <a
              href="/history"
              className="transition hover:text-white"
            >
              Історія
            </a>
          </nav>
        </div>
      </header>

      {/* HERO */}

      <section className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-blue-400">
            Iron League
          </div>

          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">
            Кваліфікація
          </h1>

          <p className="mt-4 max-w-3xl text-white/50">
            Кваліфікаційний етап
            Iron League.
          </p>

          {/* SEASON SELECTOR */}

          <div className="mt-8 flex flex-wrap gap-3">
            {(
              [
                1,
                2,
                3,
                4,
              ] as SeasonNumber[]
            ).map(
              (
                seasonNumber
              ) => (
                <a
                  key={
                    seasonNumber
                  }
                  href={`/tournaments/qualification?season=${seasonNumber}`}
                  className={`
                    rounded-xl
                    border
                    px-5
                    py-3
                    text-sm
                    font-bold
                    transition

                    ${
                      season ===
                      seasonNumber
                        ? "border-blue-400/40 bg-blue-500/15 text-blue-300"
                        : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-white"
                    }
                  `}
                >
                  Сезон{" "}
                  {
                    seasonNumber
                  }
                </a>
              )
            )}
          </div>

          {/* SUMMARY */}

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-xs uppercase tracking-wider text-white/40">
                Учасники
              </div>

              <div className="mt-2 text-3xl font-black">
                {
                  table.length
                }
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-xs uppercase tracking-wider text-white/40">
                Зіграно матчів
              </div>

              <div className="mt-2 text-3xl font-black">
                {
                  playedMatches
                }
              </div>

              {scheduledMatches >
                0 && (
                <div className="mt-1 text-xs text-white/30">
                  Ще{" "}
                  {
                    scheduledMatches
                  }{" "}
                  без результату
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-xs uppercase tracking-wider text-white/40">
                Тури
              </div>

              <div className="mt-2 text-3xl font-black">
                {
                  rounds.length
                }
              </div>
            </div>

            <div className="rounded-2xl border border-green-400/20 bg-green-400/[0.05] p-5">
              <div className="text-xs uppercase tracking-wider text-green-300/60">
                Пройшли
                кваліфікацію
              </div>

              <div className="mt-2 text-3xl font-black text-green-300">
                {
                  qualifiedCount
                }
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EMPTY SEASON */}

      {databaseMatches.length ===
        0 && (
        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-8">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
              Сезон{" "}
              {season}
            </div>

            <h2 className="mt-3 text-2xl font-black">
              Дані
              кваліфікації ще
              не додані
            </h2>

            <p className="mt-3 text-white/40">
              Після імпорту
              матчів таблиця та
              календар
              з&apos;являться
              автоматично.
            </p>
          </div>
        </section>
      )}

      {/* STANDINGS */}

      {databaseMatches.length >
        0 && (
        <>
          <section className="mx-auto max-w-7xl px-6 py-12">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-white/35">
                  Сезон{" "}
                  {season}
                </div>

                <h2 className="mt-2 text-2xl font-black">
                  Турнірна
                  таблиця
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <span className="flex items-center gap-2 text-white/50">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400" />

                  Пройшов
                </span>

                <span className="flex items-center gap-2 text-white/50">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />

                  Не пройшов
                </span>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse">
                  <thead className="border-b border-white/10 bg-white/[0.03]">
                    <tr className="text-xs uppercase tracking-wider text-white/40">
                      <th className="px-4 py-4 text-center">
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

                      <th className="px-5 py-4 text-center">
                        Статус
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {table.map(
                      (
                        row,
                        index
                      ) => {
                        const position =
                          index +
                          1;

                        /*
                          Статус НЕ залежить
                          від position.

                          Перевіряємо лише
                          фактичний склад
                          дивізіонів сезону.
                        */

                        const qualified =
                          qualifiedPlayerIds.has(
                            row.playerId
                          );

                        return (
                          <tr
                            key={
                              row.playerId
                            }
                            className={`
                              border-b
                              border-white/[0.06]
                              transition
                              hover:bg-white/[0.035]

                              ${
                                qualified
                                  ? "bg-green-400/[0.015]"
                                  : "bg-red-400/[0.015]"
                              }
                            `}
                          >
                            {/* POSITION */}

                            <td className="px-4 py-4 text-center">
                              <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-sm font-black text-white/70">
                                {
                                  position
                                }
                              </div>
                            </td>

                            {/* PLAYER */}

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
                                  <div className="mt-1 text-xs text-white/30">
                                    @
                                    {
                                      row
                                        .player
                                        .account
                                    }
                                  </div>
                                )}
                              </a>
                            </td>

                            {/* PLAYED */}

                            <td className="px-4 py-4 text-center text-white/60">
                              {
                                row.played
                              }
                            </td>

                            {/* WINS */}

                            <td className="px-4 py-4 text-center text-white/60">
                              {
                                row.wins
                              }
                            </td>

                            {/* DRAWS */}

                            <td className="px-4 py-4 text-center text-white/60">
                              {
                                row.draws
                              }
                            </td>

                            {/* LOSSES */}

                            <td className="px-4 py-4 text-center text-white/60">
                              {
                                row.losses
                              }
                            </td>

                            {/* GF */}

                            <td className="px-4 py-4 text-center text-white/60">
                              {
                                row.goalsFor
                              }
                            </td>

                            {/* GA */}

                            <td className="px-4 py-4 text-center text-white/60">
                              {
                                row.goalsAgainst
                              }
                            </td>

                            {/* GD */}

                            <td
                              className={`
                                px-4
                                py-4
                                text-center
                                font-semibold

                                ${
                                  row.goalDifference >
                                  0
                                    ? "text-green-400"
                                    : row.goalDifference <
                                        0
                                      ? "text-red-400"
                                      : "text-white/50"
                                }
                              `}
                            >
                              {row.goalDifference >
                              0
                                ? `+${row.goalDifference}`
                                : row.goalDifference}
                            </td>

                            {/* POINTS */}

                            <td className="px-5 py-4 text-center text-lg font-black">
                              {
                                row.points
                              }
                            </td>

                            {/* STATUS */}

                            <td className="px-5 py-4 text-center">
                              <span
                                className={`
                                  inline-flex
                                  rounded-full
                                  px-3
                                  py-1
                                  text-[10px]
                                  font-black
                                  uppercase
                                  tracking-wider

                                  ${
                                    qualified
                                      ? "bg-green-400/10 text-green-300 ring-1 ring-green-400/20"
                                      : "bg-red-400/10 text-red-300 ring-1 ring-red-400/20"
                                  }
                                `}
                              >
                                {qualified
                                  ? "Пройшов"
                                  : "Не пройшов"}
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

            {/* TABLE LEGEND */}

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-xs text-white/35">
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
                м&apos;ячі
              </span>

              <span>
                <b className="text-white/60">
                  ПМ
                </b>{" "}
                — пропущені
                м&apos;ячі
              </span>

              <span>
                <b className="text-white/60">
                  РМ
                </b>{" "}
                — різниця
                м&apos;ячів
              </span>

              <span>
                <b className="text-white/60">
                  О
                </b>{" "}
                — очки
              </span>
            </div>

            {/* QUALIFICATION RULE */}

            <div className="mt-6 rounded-xl border border-blue-400/15 bg-blue-500/[0.04] px-5 py-4 text-sm leading-6 text-white/45">
              Статус проходження
              визначається за
              фактичним складом
              дивізіонів відповідного
              сезону. Якщо гравець
              увійшов до складу хоча
              б одного дивізіону,
              він позначається як
              «Пройшов» незалежно
              від місця у
              кваліфікаційній
              таблиці.
            </div>
          </section>

          {/* MATCHES */}

          <section className="border-t border-white/10">
            <div className="mx-auto max-w-7xl px-6 py-12">
              <div className="mb-8">
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-white/35">
                  Сезон{" "}
                  {season}
                </div>

                <h2 className="mt-2 text-3xl font-black">
                  Матчі
                  кваліфікації
                </h2>
              </div>

              <div className="space-y-4">
                {rounds.map(
                  ([
                    round,
                    matches,
                  ]) => (
                    <details
                      key={
                        round
                      }
                      open={
                        round ===
                        1
                      }
                      className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 transition hover:bg-white/[0.035]">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                            Кваліфікація
                          </div>

                          <div className="mt-1 text-xl font-black">
                            Тур{" "}
                            {
                              round
                            }
                          </div>
                        </div>

                        <div className="flex items-center gap-5">
                          <div className="text-sm text-white/40">
                            {
                              matches.length
                            }{" "}
                            матчів
                          </div>

                          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-lg text-white/50 transition group-open:rotate-180">
                            ↓
                          </div>
                        </div>
                      </summary>

                      <div className="border-t border-white/10 p-4 md:p-6">
                        <div className="grid gap-3 lg:grid-cols-2">
                          {matches.map(
                            (
                              match
                            ) => {
                              const isFinished =
                                match.status ===
                                  "finished" &&
                                match.home_goals !==
                                  null &&
                                match.away_goals !==
                                  null;

                              return (
                                <div
                                  key={
                                    match.id
                                  }
                                  className="rounded-xl border border-white/[0.08] bg-black/20 px-4 py-4 transition hover:border-white/15 hover:bg-white/[0.025]"
                                >
                                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                                    {/* HOME */}

                                    <div className="min-w-0 text-right">
                                      <a
                                        href={`/players/${match.home_id}?season=${season}`}
                                        className="font-bold transition hover:text-blue-300"
                                      >
                                        {getPlayerName(
                                          match.home_id
                                        )}
                                      </a>

                                      {getPlayerAccount(
                                        match.home_id
                                      ) && (
                                        <div className="mt-1 truncate text-[10px] text-white/25">
                                          @
                                          {getPlayerAccount(
                                            match.home_id
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* SCORE */}

                                    <div className="min-w-[78px] text-center">
                                      {isFinished ? (
                                        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-lg font-black">
                                          {
                                            match.home_goals
                                          }

                                          <span className="mx-2 text-white/25">
                                            :
                                          </span>

                                          {
                                            match.away_goals
                                          }
                                        </div>
                                      ) : (
                                        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-bold uppercase tracking-wider text-white/30">
                                          VS
                                        </div>
                                      )}
                                    </div>

                                    {/* AWAY */}

                                    <div className="min-w-0">
                                      <a
                                        href={`/players/${match.away_id}?season=${season}`}
                                        className="font-bold transition hover:text-blue-300"
                                      >
                                        {getPlayerName(
                                          match.away_id
                                        )}
                                      </a>

                                      {getPlayerAccount(
                                        match.away_id
                                      ) && (
                                        <div className="mt-1 truncate text-[10px] text-white/25">
                                          @
                                          {getPlayerAccount(
                                            match.away_id
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>
                    </details>
                  )
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}