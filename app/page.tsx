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
  id: "season-qualification",
  name: "Кваліфікація",
  short: "КВ",
  href: "/tournaments/qualification",
},
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
    (competition) =>
      competition.id
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

type HomeNewsItem = {
  id: string;

  title: string;

  slug: string;

  excerpt: string | null;

  category: string;

  image_url: string | null;

  published_at: string | null;
};

type FeaturedAssignment = {
  id: string;

  match_id: string;

  feature_date: string;

  position: number;
};

type FeaturedDatabaseMatch = {
  id: string;

  competition: string;

  division: number | null;

  stage: string | null;

  group_name: string | null;

  round: number | null;

  participant_type: string;

  home_id: string;
  away_id: string;

  home_goals: number | null;
  away_goals: number | null;

  status: string;
};

type FeaturedMatch = FeaturedDatabaseMatch & {
  position: number;
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
    competition ===
      "division" &&
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
      "iron-coop-cup" ||
    competition ===
      "coop-cup"
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
  УЧАСНИК МАТЧУ ДНЯ
  ========================================
*/

function getFeaturedParticipantName(
  match: FeaturedDatabaseMatch,
  participantId: string
) {
  if (
    match.participant_type ===
    "player"
  ) {
    return getPlayerName(
      participantId
    );
  }

  return participantId;
}

/*
  ========================================
  ДАТА В ЧАСОВОМУ ПОЯСІ УКРАЇНИ
  ========================================
*/

function getKyivDate() {
  const parts =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone:
          "Europe/Kyiv",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      }
    ).formatToParts(
      new Date()
    );

  const year =
    parts.find(
      (part) =>
        part.type ===
        "year"
    )?.value;

  const month =
    parts.find(
      (part) =>
        part.type ===
        "month"
    )?.value;

  const day =
    parts.find(
      (part) =>
        part.type ===
        "day"
    )?.value;

  return `${year}-${month}-${day}`;
}

/*
  ========================================
  ВІДОБРАЖЕННЯ ДАТИ МАТЧУ
  ========================================
*/

function formatFeaturedDate(
  date: string
) {
  const [
    year,
    month,
    day,
  ] =
    date.split("-");

  return `${day}.${month}.${year}`;
}

/*
  ========================================
  ДАТА НОВИНИ
  ========================================
*/

function formatNewsDate(
  date: string | null
) {
  if (!date) {
    return "";
  }

  return new Date(
    date
  ).toLocaleDateString(
    "uk-UA",
    {
      day:
        "2-digit",

      month:
        "long",

      year:
        "numeric",
    }
  );
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
    СЬОГОДНІ
    ========================================
  */

  const today =
    getKyivDate();

  /*
    ========================================
    МАТЧІ ДНЯ
    ========================================
  */

  const {
    data:
      featuredAssignmentsData,
    error:
      featuredAssignmentsError,
  } = await supabase
    .from(
      "featured_matches"
    )
    .select(
      `
        id,
        match_id,
        feature_date,
        position
      `
    )
    .eq(
      "feature_date",
      today
    )
    .order(
      "position",
      {
        ascending: true,
      }
    );

  if (
    featuredAssignmentsError
  ) {
    console.error(
      "HOME FEATURED ASSIGNMENTS ERROR:",
      featuredAssignmentsError
    );
  }

  const featuredAssignments =
    (featuredAssignmentsData ??
      []) as FeaturedAssignment[];

  const featuredMatchIds =
    featuredAssignments.map(
      (item) =>
        item.match_id
    );

  let featuredDatabaseMatches:
    FeaturedDatabaseMatch[] =
      [];

  if (
    featuredMatchIds.length >
    0
  ) {
    const {
      data:
        featuredMatchesData,
      error:
        featuredMatchesError,
    } = await supabase
      .from("matches")
      .select(
        `
          id,
          competition,
          division,
          stage,
          group_name,
          round,
          participant_type,
          home_id,
          away_id,
          home_goals,
          away_goals,
          status
        `
      )
      .in(
        "id",
        featuredMatchIds
      );

    if (
      featuredMatchesError
    ) {
      console.error(
        "HOME FEATURED MATCHES ERROR:",
        featuredMatchesError
      );
    }

    featuredDatabaseMatches =
      (featuredMatchesData ??
        []) as FeaturedDatabaseMatch[];
  }

  const featuredMatchMap =
    new Map(
      featuredDatabaseMatches.map(
        (match) => [
          match.id,
          match,
        ]
      )
    );

  const featuredMatches =
    featuredAssignments
      .map(
        (
          assignment
        ):
          | FeaturedMatch
          | null => {
          const match =
            featuredMatchMap.get(
              assignment.match_id
            );

          if (!match) {
            return null;
          }

          return {
            ...match,

            position:
              assignment.position,
          };
        }
      )
      .filter(
        (
          match
        ): match is FeaturedMatch =>
          match !== null
      )
      .sort(
        (a, b) =>
          a.position -
          b.position
      );

  /*
    Позиція 1 —
    головний матч.

    Якщо позиція 1
    раптом порожня —
    показуємо перший
    наявний матч.
  */

  const mainFeaturedMatch =
    featuredMatches.find(
      (match) =>
        match.position === 1
    ) ??
    featuredMatches[0] ??
    null;

  const secondaryFeaturedMatches =
    mainFeaturedMatch
      ? featuredMatches.filter(
          (match) =>
            match.id !==
            mainFeaturedMatch.id
        )
      : [];

  /*
    ========================================
    ОСТАННІ РЕЗУЛЬТАТИ
    ========================================
  */

  const {
    data:
      recentMatchesData,
    error:
      recentMatchesError,
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

  if (
    recentMatchesError
  ) {
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
        id:
          match.id,

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
    data:
      divisionMatchesData,
    error:
      divisionMatchesError,
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

  if (
    divisionMatchesError
  ) {
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
                id:
                  match.id,

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

            leader:
              "—",

            points:
              0,
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
            leader?.points ??
            0,
        };
      }
    );

  /*
    ========================================
    ОСТАННІ НОВИНИ
    ========================================
  */

  const {
    data:
      latestNewsData,
    error:
      latestNewsError,
  } = await supabase
    .from("news")
    .select(
      `
        id,
        title,
        slug,
        excerpt,
        category,
        image_url,
        published_at
      `
    )
    .eq(
      "published",
      true
    )
    .order(
      "published_at",
      {
        ascending: false,
        nullsFirst: false,
      }
    )
    .limit(3);

  if (
    latestNewsError
  ) {
    console.error(
      "HOME NEWS ERROR:",
      latestNewsError
    );
  }

  const latestNews =
    (latestNewsData ??
      []) as HomeNewsItem[];

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
  href="/coefficients"
  className="transition hover:text-white"
>
  Коефіцієнти
</a>

            <a
              href="/history"
              className="transition hover:text-white"
            >
              Історія
            </a>

            <a
              href="/news"
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
              League: матчі,
              дивізіони, єврокубки,
              статистика, результати,
              турнірні таблиці та
              історія ліги.
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

          {/* MATCHES OF THE DAY */}

          <div className="relative">
            <div className="absolute -inset-8 rounded-[40px] bg-blue-500/10 blur-3xl" />

            <div className="relative space-y-4">
              {mainFeaturedMatch ? (
                <>
                  {/* MAIN FEATURED MATCH */}

                  <div className="overflow-hidden rounded-[28px] border border-blue-400/20 bg-[#07101d]/90 shadow-2xl backdrop-blur-xl">
                    <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-7 py-5">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-[0.28em] text-blue-300">
                          Матч дня
                        </div>

                        <div className="mt-1 text-sm text-white/40">
                          {formatFeaturedDate(
                            today
                          )}
                        </div>
                      </div>

                      <div className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-300">
                        Головний
                      </div>
                    </div>

                    <div className="px-7 py-8 text-center">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-400">
                        {getTournamentName(
                          mainFeaturedMatch.competition,
                          mainFeaturedMatch.division
                        )}
                      </div>

                      {mainFeaturedMatch.round && (
                        <div className="mt-2 text-xs text-white/30">
                          Тур{" "}
                          {
                            mainFeaturedMatch.round
                          }
                        </div>
                      )}

                      <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                        <div className="text-right text-xl font-black sm:text-2xl">
                          {getFeaturedParticipantName(
                            mainFeaturedMatch,
                            mainFeaturedMatch.home_id
                          )}
                        </div>

                        <div
                          className={`flex min-w-[88px] items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-4 font-black text-blue-300 ${
                            mainFeaturedMatch.status ===
                              "finished"
                              ? "text-2xl"
                              : "text-xl"
                          }`}
                        >
                          {mainFeaturedMatch.status ===
                            "finished" &&
                          mainFeaturedMatch.home_goals !==
                            null &&
                          mainFeaturedMatch.away_goals !==
                            null
                            ? `${mainFeaturedMatch.home_goals} : ${mainFeaturedMatch.away_goals}`
                            : "VS"}
                        </div>

                        <div className="text-left text-xl font-black sm:text-2xl">
                          {getFeaturedParticipantName(
                            mainFeaturedMatch,
                            mainFeaturedMatch.away_id
                          )}
                        </div>
                      </div>

                      <div className="mt-8 text-sm text-white/35">
                        {mainFeaturedMatch.status ===
                        "finished"
                          ? "Матч завершено"
                          : "Iron League • Match of the Day"}
                      </div>
                    </div>
                  </div>

                  {/* SECONDARY FEATURED MATCHES */}

                  {secondaryFeaturedMatches.length >
                    0 && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {secondaryFeaturedMatches.map(
                        (
                          match
                        ) => (
                          <div
                            key={
                              match.id
                            }
                            className="rounded-2xl border border-white/10 bg-[#07101d]/90 p-5 backdrop-blur-xl"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-400">
                                Матч дня{" "}
                                {
                                  match.position
                                }
                              </div>

                              <div className="text-[10px] text-white/25">
                                {getTournamentName(
                                  match.competition,
                                  match.division
                                )}
                              </div>
                            </div>

                            <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm font-black">
                              <div className="truncate text-right">
                                {getFeaturedParticipantName(
                                  match,
                                  match.home_id
                                )}
                              </div>

                              <div className="rounded-lg bg-blue-500/10 px-2.5 py-1.5 text-blue-300">
                                {match.status ===
                                  "finished" &&
                                match.home_goals !==
                                  null &&
                                match.away_goals !==
                                  null
                                  ? `${match.home_goals}:${match.away_goals}`
                                  : "VS"}
                              </div>

                              <div className="truncate">
                                {getFeaturedParticipantName(
                                  match,
                                  match.away_id
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </>
              ) : (
                /* EMPTY FEATURED */

                <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#07101d]/85 shadow-2xl backdrop-blur-xl">
                  <div className="border-b border-white/10 bg-white/[0.03] px-7 py-5">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.28em] text-blue-300">
                        Матч дня
                      </div>

                      <div className="mt-1 text-sm text-white/40">
                        Сезон{" "}
                        {
                          currentSeason
                        }
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
              )}
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
          {results.length ===
          0 ? (
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
                  key={
                    match.id
                  }
                  className="grid items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.025] px-6 py-5 transition hover:border-blue-400/30 hover:bg-white/[0.04] sm:grid-cols-[140px_1fr_auto_1fr]"
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-white/30">
                    {
                      match.tournament
                    }
                  </div>

                  <div className="text-right font-bold">
                    {
                      match.home
                    }
                  </div>

                  <div className="rounded-lg bg-blue-500/15 px-5 py-2 text-xl font-black text-blue-300">
                    {
                      match.score
                    }
                  </div>

                  <div className="font-bold">
                    {
                      match.away
                    }
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
            {
              currentSeason
            }
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.map(
            (
              tournament
            ) => (
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
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                Новини
              </div>

              <h2 className="mt-3 text-4xl font-black">
                Новини Iron League
              </h2>

              <p className="mt-3 max-w-2xl leading-7 text-white/40">
                Офіційні
                оголошення,
                результати,
                жеребкування та
                головні події ліги.
              </p>
            </div>

            <a
              href="/news"
              className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-5 py-3 text-sm font-black text-blue-300 transition hover:border-blue-400/40 hover:bg-blue-500/15"
            >
              Усі новини →
            </a>
          </div>

          {latestNews.length ===
          0 ? (
            <a
              href="/news"
              className="group relative mt-10 block overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] px-8 py-14 text-center transition hover:border-blue-400/30"
            >
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

                <div className="mt-7 font-black text-blue-300">
                  Перейти до розділу
                  новин →
                </div>
              </div>
            </a>
          ) : (
            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {latestNews.map(
                (
                  item,
                  index
                ) => (
                  <a
                    key={
                      item.id
                    }
                    href={`/news/${item.slug}`}
                    className={`group overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] transition duration-300 hover:-translate-y-1 hover:border-blue-400/30 ${
                      index ===
                      0
                        ? "lg:col-span-2"
                        : ""
                    }`}
                  >
                    <div
                      className={`relative overflow-hidden bg-[#030711] ${
                        index ===
                        0
                          ? "h-72"
                          : "h-52"
                      }`}
                    >
                      {item.image_url ? (
                        <img
                          src={
                            item.image_url
                          }
                          alt={
                            item.title
                          }
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-500/10 to-[#030711]">
                          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-2xl font-black text-blue-300">
                            IL
                          </div>
                        </div>
                      )}

                      <div className="absolute left-5 top-5 rounded-full border border-blue-400/20 bg-[#030711]/80 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.15em] text-blue-300 backdrop-blur">
                        {
                          item.category
                        }
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="text-xs text-white/25">
                        {formatNewsDate(
                          item.published_at
                        )}
                      </div>

                      <h3
                        className={`mt-3 font-black leading-tight ${
                          index ===
                          0
                            ? "text-3xl"
                            : "text-2xl"
                        }`}
                      >
                        {
                          item.title
                        }
                      </h3>

                      {item.excerpt && (
                        <p className="mt-4 line-clamp-3 leading-7 text-white/40">
                          {
                            item.excerpt
                          }
                        </p>
                      )}

                      <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5">
                        <span className="text-sm text-white/30">
                          Читати новину
                        </span>

                        <span className="text-blue-400 transition group-hover:translate-x-1">
                          →
                        </span>
                      </div>
                    </div>
                  </a>
                )
              )}
            </div>
          )}
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