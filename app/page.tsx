import { seasonCompetitions } from "../data/competitions/season-competitions";
import { players } from "../data/players";
import { season3 } from "../data/seasons/season-3";

import {
  calculateStandings,
  type LeagueMatch,
} from "../lib/calculateStandings";

import { supabase } from "../lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/*
  ========================================
  ПОТОЧНИЙ СЕЗОН
  ========================================
*/

const currentSeason = 3 as const;

/*
  ========================================
  КАРТКИ ТУРНІРІВ
  ========================================
*/

const tournamentCards = [
  {
    id: "champions-league",
    name: "Ліга чемпіонів",
    short: "ЛЧ",
    href: "/tournaments/champions-league",
  },
  {
    id: "europa-league",
    name: "Ліга Європи",
    short: "ЛЄ",
    href: "/tournaments/europa-league",
  },
  {
    id: "conference-league",
    name: "Ліга конференцій",
    short: "ЛК",
    href: "/tournaments/conference-league",
  },
  {
    id: "european-super-cup",
    name: "Суперкубок Європи",
    short: "СК",
    href: "/tournaments/european-super-cup",
  },
  {
    id: "division-cups",
    name: "Кубки дивізіонів",
    short: "КД",
    href: "/tournaments/division-cups",
  },
  {
    id: "associations-cup",
    name: "Кубок асоціацій",
    short: "КА",
    href: "/tournaments/associations",
  },
  {
    id: "iron-coop-cup",
    name: "Iron Co-op Cup",
    short: "CO",
    href: "/tournaments/coop-cup",
  },
];

/*
  ========================================
  ТУРНІРИ ПОТОЧНОГО СЕЗОНУ
  ========================================
*/

const currentSeasonCompetitions =
  seasonCompetitions[currentSeason];

const currentCompetitionIds = new Set(
  currentSeasonCompetitions.map(
    (competition) => competition.id
  )
);

const hasDivisionCups =
  currentSeasonCompetitions.some(
    (competition) =>
      competition.category ===
      "division-cup"
  );

const tournaments =
  tournamentCards.filter(
    (tournament) => {
      if (
        tournament.id ===
        "division-cups"
      ) {
        return hasDivisionCups;
      }

      return currentCompetitionIds.has(
        tournament.id
      );
    }
  );

/*
  ========================================
  TYPES
  ========================================
*/

type RecentMatch = {
  id: string;

  competition: string;

  division: number | null;

  participant_type: string;

  home_id: string;
  away_id: string;

  home_goals: number;
  away_goals: number;

  played_at: string | null;
};

type DivisionNumber =
  | 1
  | 2
  | 3
  | 4;

type DivisionDatabaseMatch = {
  id: string;

  division: number | null;

  round: number | null;

  home_id: string;
  away_id: string;

  home_goals: number | null;
  away_goals: number | null;

  status: string;
};

/*
  ========================================
  НІКНЕЙМ ГРАВЦЯ
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
  НАЗВА ТУРНІРУ
  ========================================
*/

function getTournamentName(
  competition: string,
  division: number | null
) {
  if (
    competition === "division" &&
    division
  ) {
    return `${division} Дивізіон`;
  }

  if (
    competition ===
    "champions-league"
  ) {
    return "Ліга чемпіонів";
  }

  if (
    competition ===
    "europa-league"
  ) {
    return "Ліга Європи";
  }

  if (
    competition ===
    "conference-league"
  ) {
    return "Ліга конференцій";
  }

  if (
    competition ===
    "european-super-cup"
  ) {
    return "Суперкубок Європи";
  }

  if (
    competition ===
    "associations-cup"
  ) {
    return "Кубок асоціацій";
  }

  if (
    competition ===
    "iron-coop-cup"
  ) {
    return "Iron Co-op Cup";
  }

  const divisionCupMatch =
    competition.match(
      /^division-(\d)-cup$/
    );

  if (divisionCupMatch) {
    return `Кубок ${divisionCupMatch[1]} Дивізіону`;
  }

  return competition;
}

/*
  ========================================
  СКЛАДИ ДИВІЗІОНІВ СЕЗОНУ 3
  ========================================
*/

function getSeason3DivisionPlayers(
  division: DivisionNumber
): readonly string[] {
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
  ========================================
  HOME
  ========================================
*/

export default async function Home() {
  /*
    ========================================
    ОСТАННІ РЕЗУЛЬТАТИ
    ========================================
  */

  const {
    data: recentMatchesData,
    error: recentMatchesError,
  } = await supabase
    .from("matches")
    .select(
      `
        id,
        competition,
        division,
        participant_type,
        home_id,
        away_id,
        home_goals,
        away_goals,
        played_at
      `
    )
    .eq(
      "season",
      currentSeason
    )
    .eq(
      "status",
      "finished"
    )
    .not(
      "home_goals",
      "is",
      null
    )
    .not(
      "away_goals",
      "is",
      null
    )
    .order(
      "played_at",
      {
        ascending: false,
        nullsFirst: false,
      }
    )
    .limit(3);

  if (recentMatchesError) {
    console.error(
      "HOME RECENT RESULTS ERROR:",
      recentMatchesError
    );
  }

  const recentMatches =
    (recentMatchesData ??
      []) as RecentMatch[];

  const results =
    recentMatches.map(
      (match) => ({
        id: match.id,

        home:
          getPlayerName(
            match.home_id
          ),

        away:
          getPlayerName(
            match.away_id
          ),

        score:
          `${match.home_goals} : ${match.away_goals}`,

        tournament:
          getTournamentName(
            match.competition,
            match.division
          ),
      })
    );

  /*
    ========================================
    ДИВІЗІОНИ
    ========================================
  */

  const {
    data: divisionMatchesData,
    error: divisionMatchesError,
  } = await supabase
    .from("matches")
    .select(
      `
        id,
        division,
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
      currentSeason
    )
    .eq(
      "competition",
      "division"
    )
    .eq(
      "status",
      "finished"
    )
    .not(
      "home_goals",
      "is",
      null
    )
    .not(
      "away_goals",
      "is",
      null
    );

  if (divisionMatchesError) {
    console.error(
      "HOME DIVISIONS ERROR:",
      divisionMatchesError
    );
  }

  const divisionMatches =
    (divisionMatchesData ??
      []) as DivisionDatabaseMatch[];

  const divisionNumbers:
    DivisionNumber[] = [
      1,
      2,
      3,
      4,
    ];

  const divisions =
    divisionNumbers.map(
      (division) => {
        const finishedMatches:
          LeagueMatch[] =
          divisionMatches
            .filter(
              (match) =>
                match.division ===
                division
            )
            .map(
              (match) => ({
                id: match.id,

                round:
                  match.round ??
                  undefined,

                home:
                  match.home_id,

                away:
                  match.away_id,

                homeGoals:
                  match.home_goals!,

                awayGoals:
                  match.away_goals!,
              })
            );

        if (
          finishedMatches.length ===
          0
        ) {
          return {
            number:
              String(
                division
              ).padStart(
                2,
                "0"
              ),

            name:
              `${division} Дивізіон`,

            leader: "—",

            points: 0,
          };
        }

        const standings =
          calculateStandings(
            getSeason3DivisionPlayers(
              division
            ),
            finishedMatches
          );

        const leader =
          standings[0];

        return {
          number:
            String(
              division
            ).padStart(
              2,
              "0"
            ),

          name:
            `${division} Дивізіон`,

          leader:
            leader
              ? getPlayerName(
                  leader.playerId
                )
              : "—",

          points:
            leader?.points ?? 0,
        };
      }
    );

  return (
    <main className="min-h-screen bg-[#030711] text-white">
      {/* HEADER */}

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#030711]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a
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
          </a>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-white/60 lg:flex">
            <a
              href="/"
              className="text-white"
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
              href="#tournaments"
              className="transition hover:text-white"
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

            <a
              href="#news"
              className="transition hover:text-white"
            >
              Новини
            </a>
          </nav>
        </div>
      </header>

      {/* HERO */}

      <section className="relative overflow-hidden border-b border-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('/stadium-bg.jpg')",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#020611]/95 via-[#030711]/80 to-[#020611]/60" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#030711] via-transparent to-[#030711]/40" />

        <div className="relative mx-auto grid min-h-[720px] max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr]">
          {/* HERO LEFT */}

          <div>
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-blue-300">
              <span className="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_12px_#60a5fa]" />

              eFootball Competition
            </div>

            <div className="max-w-2xl">
              <img
                src="/iron-league-logo.jpg"
                alt="Iron League"
                className="w-full max-w-[420px] object-contain drop-shadow-[0_0_40px_rgba(59,130,246,0.30)]"
              />
            </div>

            <p className="mt-7 max-w-xl text-lg leading-8 text-white/65">
              Єдина платформа Iron
              League: матчі, дивізіони,
              єврокубки, статистика,
              результати, турнірні
              таблиці та історія ліги.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <a
                href="/matches"
                className="rounded-xl bg-blue-500 px-6 py-3.5 font-bold shadow-[0_0_30px_rgba(59,130,246,0.3)] transition hover:bg-blue-400"
              >
                Переглянути матчі
              </a>

              <a
                href="/divisions"
                className="rounded-xl border border-white/15 bg-white/[0.06] px-6 py-3.5 font-bold backdrop-blur transition hover:bg-white/[0.10]"
              >
                Турнірні таблиці
              </a>
            </div>

            <div className="mt-12 grid max-w-xl grid-cols-3 gap-4">
              <div>
                <div className="text-3xl font-black">
                  4
                </div>

                <div className="mt-1 text-xs uppercase tracking-widest text-white/40">
                  Дивізіони
                </div>
              </div>

              <div>
                <div className="text-3xl font-black">
                  {tournaments.length}+
                </div>

                <div className="mt-1 text-xs uppercase tracking-widest text-white/40">
                  Турнірів
                </div>
              </div>

              <div>
                <div className="text-3xl font-black">
                  ∞
                </div>

                <div className="mt-1 text-xs uppercase tracking-widest text-white/40">
                  Емоцій
                </div>
              </div>
            </div>
          </div>

          {/* MATCH OF THE DAY */}

          <div className="relative">
            <div className="absolute -inset-8 rounded-[40px] bg-blue-500/10 blur-3xl" />

            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#07101d]/85 shadow-2xl backdrop-blur-xl">
              <div className="border-b border-white/10 bg-white/[0.03] px-7 py-5">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.28em] text-blue-300">
                    Матч дня
                  </div>

                  <div className="mt-1 text-sm text-white/40">
                    Сезон{" "}
                    {currentSeason}
                  </div>
                </div>
              </div>

              <div className="flex min-h-[330px] flex-col items-center justify-center px-7 py-10 text-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full border border-blue-400/20 bg-blue-500/10">
                  <span className="text-4xl font-black text-blue-300">
                    VS
                  </span>
                </div>

                <div className="mt-7 text-2xl font-black">
                  Матч дня ще не
                  визначено
                </div>

                <div className="mt-3 max-w-sm text-sm leading-6 text-white/40">
                  Центральний матч
                  з&apos;явиться тут
                  після його
                  призначення.
                </div>

                <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-white/35">
                  Iron League • Match
                  of the Day
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RESULTS */}

      <section
        id="matches"
        className="mx-auto max-w-7xl px-6 py-20"
      >
        <div className="mb-10 flex items-end justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
              Матч-центр
            </div>

            <h2 className="mt-3 text-4xl font-black">
              Останні результати
            </h2>
          </div>

          <a
            href="/matches"
            className="hidden text-sm font-bold text-blue-400 transition hover:text-blue-300 sm:block"
          >
            Усі матчі →
          </a>
        </div>

        <div className="grid gap-4">
          {results.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] px-6 py-10 text-center">
              <div className="font-bold text-white/45">
                Завершених матчів
                поки немає
              </div>

              <div className="mt-2 text-sm text-white/25">
                Результати
                автоматично
                з&apos;являться тут
                після внесення
                рахунків.
              </div>
            </div>
          ) : (
            results.map(
              (match) => (
                <div
                  key={match.id}
                  className="grid items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.025] px-6 py-5 transition hover:border-blue-400/30 hover:bg-white/[0.04] sm:grid-cols-[140px_1fr_auto_1fr]"
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-white/30">
                    {
                      match.tournament
                    }
                  </div>

                  <div className="text-right font-bold">
                    {match.home}
                  </div>

                  <div className="rounded-lg bg-blue-500/15 px-5 py-2 text-xl font-black text-blue-300">
                    {match.score}
                  </div>

                  <div className="font-bold">
                    {match.away}
                  </div>
                </div>
              )
            )
          )}
        </div>
      </section>

      {/* DIVISIONS */}

      <section
        id="divisions"
        className="border-y border-white/10 bg-white/[0.02]"
      >
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-10">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
              Чемпіонат
            </div>

            <h2 className="mt-3 text-4xl font-black">
              Дивізіони
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {divisions.map(
              (division) => (
                <a
                  key={
                    division.number
                  }
                  href={`/divisions/${Number(
                    division.number
                  )}`}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] p-6 transition duration-300 hover:-translate-y-1 hover:border-blue-400/40"
                >
                  <div className="absolute right-3 top-0 text-7xl font-black text-white/[0.025]">
                    {
                      division.number
                    }
                  </div>

                  <div className="relative">
                    <div className="text-sm font-black uppercase tracking-wider text-blue-400">
                      {
                        division.name
                      }
                    </div>

                    <div className="mt-10 text-xs uppercase tracking-[0.2em] text-white/30">
                      Лідер
                    </div>

                    <div className="mt-2 text-2xl font-black">
                      {
                        division.leader
                      }
                    </div>

                    <div className="mt-7 flex items-end justify-between border-t border-white/10 pt-5">
                      <span className="text-sm text-white/35">
                        Очки
                      </span>

                      <span className="text-4xl font-black">
                        {
                          division.points
                        }
                      </span>
                    </div>
                  </div>
                </a>
              )
            )}
          </div>
        </div>
      </section>

      {/* TOURNAMENTS */}

      <section
        id="tournaments"
        className="mx-auto max-w-7xl px-6 py-20"
      >
        <div className="mb-10">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Iron League
          </div>

          <h2 className="mt-3 text-4xl font-black">
            Турніри
          </h2>

          <div className="mt-2 text-sm text-white/35">
            Сезон{" "}
            {currentSeason}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.map(
            (tournament) => (
              <a
                key={
                  tournament.id
                }
                href={
                  tournament.href
                }
                className="group relative min-h-52 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/10 via-[#07101d] to-[#030711] p-7 transition duration-300 hover:-translate-y-1 hover:border-blue-400/40"
              >
                <div className="absolute -right-5 -top-7 text-[110px] font-black text-white/[0.025]">
                  {
                    tournament.short
                  }
                </div>

                <div className="relative flex h-full flex-col justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 font-black text-blue-300">
                    {
                      tournament.short
                    }
                  </div>

                  <div>
                    <div className="text-2xl font-black">
                      {
                        tournament.name
                      }
                    </div>

                    <div className="mt-2 text-sm text-white/35">
                      Перейти до
                      турніру →
                    </div>
                  </div>
                </div>
              </a>
            )
          )}
        </div>
      </section>

      {/* NEWS */}

      <section
        id="news"
        className="border-t border-white/10 bg-white/[0.02]"
      >
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-10">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
              Новини
            </div>

            <h2 className="mt-3 text-4xl font-black">
              Останні події
            </h2>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] px-8 py-14 text-center">
            <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[90px]" />

            <div className="relative">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-2xl font-black text-blue-300">
                IL
              </div>

              <h3 className="mt-6 text-2xl font-black">
                Новин поки немає
              </h3>

              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/40">
                Офіційні новини,
                анонси та головні
                події Iron League
                з&apos;являться тут
                після публікації.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}

      <footer className="border-t border-white/10 bg-[#02050b]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-black tracking-[0.16em]">
              IRON LEAGUE
            </div>

            <div className="mt-1 text-xs text-white/30">
              Більше ніж гра
            </div>
          </div>

          <div className="text-sm text-white/30">
            © 2026 Iron League
          </div>
        </div>
      </footer>
    </main>
  );
}