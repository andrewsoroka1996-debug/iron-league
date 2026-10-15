
import Image from "next/image";
import SiteHeader from "../components/public/SiteHeader";
import SiteFooter from "../components/public/SiteFooter";
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

/* ========================================
   CURRENT SEASON
======================================== */

const currentSeason = 3 as const;

/* ========================================
   TOURNAMENT CARDS
======================================== */

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

/* ========================================
   CURRENT SEASON COMPETITIONS
======================================== */

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
      competition.category === "division-cup"
  );

const tournaments = tournamentCards.filter(
  (tournament) => {
    if (tournament.id === "division-cups") {
      return hasDivisionCups;
    }

    return currentCompetitionIds.has(
      tournament.id
    );
  }
);

/* ========================================
   TYPES
======================================== */

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

type DivisionNumber = 1 | 2 | 3 | 4;

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

type FeaturedMatch =
  FeaturedDatabaseMatch & {
    position: number;
  };

/* ========================================
   PLAYER NAME
======================================== */

function getPlayerName(playerId: string) {
  return (
    players.find(
      (player) => player.id === playerId
    )?.nickname ?? playerId
  );
}

/* ========================================
   TOURNAMENT NAME
======================================== */

function getTournamentName(
  competition: string,
  division: number | null
) {
  if (competition === "division" && division) {
    return `${division} Дивізіон`;
  }

  if (competition === "champions-league") {
    return "Ліга чемпіонів";
  }

  if (competition === "europa-league") {
    return "Ліга Європи";
  }

  if (competition === "conference-league") {
    return "Ліга конференцій";
  }

  if (competition === "european-super-cup") {
    return "Суперкубок Європи";
  }

  if (competition === "associations-cup") {
    return "Кубок асоціацій";
  }

  if (
    competition === "iron-coop-cup" ||
    competition === "coop-cup"
  ) {
    return "Iron Co-op Cup";
  }

  const divisionCupMatch = competition.match(
    /^division-(\d)-cup$/
  );

  if (divisionCupMatch) {
    return `Кубок ${divisionCupMatch[1]} Дивізіону`;
  }

  return competition;
}

/* ========================================
   FEATURED PARTICIPANT
======================================== */

function getFeaturedParticipantName(
  match: FeaturedDatabaseMatch,
  participantId: string
) {
  if (match.participant_type === "player") {
    return getPlayerName(participantId);
  }

  return participantId;
}

/* ========================================
   KYIV DATE
======================================== */

function getKyivDate() {
  const parts = new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone: "Europe/Kyiv",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(new Date());

  const year = parts.find(
    (part) => part.type === "year"
  )?.value;

  const month = parts.find(
    (part) => part.type === "month"
  )?.value;

  const day = parts.find(
    (part) => part.type === "day"
  )?.value;

  return `${year}-${month}-${day}`;
}

/* ========================================
   DATE FORMATTING
======================================== */

function formatFeaturedDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}`;
}

function formatNewsDate(date: string | null) {
  if (!date) {
    return "";
  }

  return new Date(date).toLocaleDateString(
    "uk-UA",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );
}

/* ========================================
   SEASON 3 DIVISION PLAYERS
======================================== */

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

/* ========================================
   HOME PAGE
======================================== */

export default async function Home() {
  const today = getKyivDate();

  /* ========================================
     FEATURED MATCHES
  ======================================== */

  const {
    data: featuredAssignmentsData,
    error: featuredAssignmentsError,
  } = await supabase
    .from("featured_matches")
    .select(
      "id, match_id, feature_date, position"
    )
    .eq("feature_date", today)
    .order("position", {
      ascending: true,
    });

  if (featuredAssignmentsError) {
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
      (item) => item.match_id
    );

  let featuredDatabaseMatches:
    FeaturedDatabaseMatch[] = [];

  if (featuredMatchIds.length > 0) {
    const {
      data: featuredMatchesData,
      error: featuredMatchesError,
    } = await supabase
      .from("matches")
      .select(
        `id,
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
         status`
      )
      .in("id", featuredMatchIds);

    if (featuredMatchesError) {
      console.error(
        "HOME FEATURED MATCHES ERROR:",
        featuredMatchesError
      );
    }

    featuredDatabaseMatches =
      (featuredMatchesData ??
        []) as FeaturedDatabaseMatch[];
  }

  const featuredMatchMap = new Map(
    featuredDatabaseMatches.map(
      (match) => [match.id, match]
    )
  );

  const featuredMatches = featuredAssignments
    .map(
      (
        assignment
      ): FeaturedMatch | null => {
        const match = featuredMatchMap.get(
          assignment.match_id
        );

        if (!match) {
          return null;
        }

        return {
          ...match,
          position: assignment.position,
        };
      }
    )
    .filter(
      (match): match is FeaturedMatch =>
        match !== null
    )
    .sort(
      (a, b) => a.position - b.position
    );

  const mainFeaturedMatch =
    featuredMatches.find(
      (match) => match.position === 1
    ) ??
    featuredMatches[0] ??
    null;

  const secondaryFeaturedMatches =
    mainFeaturedMatch
      ? featuredMatches.filter(
          (match) =>
            match.id !== mainFeaturedMatch.id
        )
      : [];

  /* ========================================
     RECENT RESULTS
  ======================================== */

  const {
    data: recentMatchesData,
    error: recentMatchesError,
  } = await supabase
    .from("matches")
    .select(
      `id,
       competition,
       division,
       participant_type,
       home_id,
       away_id,
       home_goals,
       away_goals,
       played_at`
    )
    .eq("season", currentSeason)
    .eq("status", "finished")
    .not("home_goals", "is", null)
    .not("away_goals", "is", null)
    .order("played_at", {
      ascending: false,
      nullsFirst: false,
    })
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

  const results = recentMatches.map(
    (match) => ({
      id: match.id,

      home: getPlayerName(match.home_id),

      away: getPlayerName(match.away_id),

      score:
        `${match.home_goals} : ${match.away_goals}`,

      tournament: getTournamentName(
        match.competition,
        match.division
      ),
    })
  );

  /* ========================================
     DIVISIONS
  ======================================== */

  const {
    data: divisionMatchesData,
    error: divisionMatchesError,
  } = await supabase
    .from("matches")
    .select(
      `id,
       division,
       round,
       home_id,
       away_id,
       home_goals,
       away_goals,
       status`
    )
    .eq("season", currentSeason)
    .eq("competition", "division")
    .eq("status", "finished")
    .not("home_goals", "is", null)
    .not("away_goals", "is", null);

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
    DivisionNumber[] = [1, 2, 3, 4];

  const divisions = divisionNumbers.map(
    (division) => {
      const finishedMatches:
        LeagueMatch[] = divisionMatches
        .filter(
          (match) =>
            match.division === division
        )
        .map((match) => ({
          id: match.id,

          round:
            match.round ?? undefined,

          home: match.home_id,

          away: match.away_id,

          homeGoals: match.home_goals!,

          awayGoals: match.away_goals!,
        }));

      if (finishedMatches.length === 0) {
        return {
          number: String(division).padStart(
            2,
            "0"
          ),

          name: `${division} Дивізіон`,

          leader: "—",

          points: 0,
        };
      }

      const standings = calculateStandings(
        getSeason3DivisionPlayers(
          division
        ),
        finishedMatches
      );

      const leader = standings[0];

      return {
        number: String(division).padStart(
          2,
          "0"
        ),

        name: `${division} Дивізіон`,

        leader: leader
          ? getPlayerName(leader.playerId)
          : "—",

        points: leader?.points ?? 0,
      };
    }
  );

  /* ========================================
     LATEST NEWS
  ======================================== */

  const {
    data: latestNewsData,
    error: latestNewsError,
  } = await supabase
    .from("news")
    .select(
      `id,
       title,
       slug,
       excerpt,
       category,
       image_url,
       published_at`
    )
    .eq("published", true)
    .order("published_at", {
      ascending: false,
      nullsFirst: false,
    })
    .limit(3);

  if (latestNewsError) {
    console.error(
      "HOME NEWS ERROR:",
      latestNewsError
    );
  }

  const latestNews =
    (latestNewsData ??
      []) as HomeNewsItem[];

  /* ========================================
     PAGE RENDER
  ======================================== */

  return (
    <main className="min-h-screen bg-[#030711] text-white">

      {/* GLOBAL HEADER */}
      <SiteHeader />

      {/* =====================================
          HERO
      ===================================== */}

      <section className="relative overflow-hidden border-b border-white/10">

        {/* Responsive stadium background: on smaller screens it stays near
            the top instead of stretching over the entire tall hero. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[800px] sm:h-[860px] lg:inset-0 lg:h-auto"
        >
          <Image
            src="/backgrounds/iron-league-home-bg.webp"
            alt=""
            fill
            preload
            sizes="100vw"
            quality={75}
            className="object-cover object-[73%_40%] sm:object-[65%_center] lg:object-center"
          />

          {/* Keep the content readable without hiding the right-side lights. */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#020611]/75 via-[#030711]/50 to-[#020611]/25 lg:from-[#020611]/90 lg:via-[#030711]/65 lg:to-[#020611]/35" />

          {/* Fade the image naturally into the site's dark background. */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#030711]/10 via-[#030711]/20 to-[#030711] lg:bg-gradient-to-t lg:from-[#030711] lg:via-transparent lg:to-[#030711]/35" />
        </div>

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:min-h-[640px] lg:grid-cols-2 lg:gap-12 lg:py-20">

          {/* HERO LEFT */}

          <div>

            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-blue-300">

              <span className="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_12px_#60a5fa]" />

              eFootball Competition

            </div>

            <div className="max-w-2xl">

              <Image
                src="/iron-league-logo.jpg"
                alt="Iron League"
                width={420}
                height={420}
                preload
                fetchPriority="high"
                sizes="(max-width: 768px) 90vw, 420px"
                quality={75}
                className="h-auto w-52 max-w-full object-contain drop-shadow-lg sm:w-72 lg:w-80"
              />

            </div>

            <p className="mt-7 max-w-xl text-lg leading-8 text-white/85 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
  Єдина платформа Iron League: матчі,
  дивізіони, єврокубки, статистика,
  результати, турнірні таблиці та
  історія ліги.
</p>

            {/* HERO BUTTONS */}

            <div className="mt-7 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-4">

              <a
                href="/matches"
                className="flex min-h-12 min-w-0 items-center justify-center rounded-xl bg-blue-700 px-2 py-3 text-center text-sm font-bold leading-snug text-white transition hover:bg-blue-600 sm:px-6 sm:py-3.5 sm:text-base"
              >
                Переглянути матчі
              </a>

              <a
                href="/divisions"
                className="flex min-h-12 min-w-0 items-center justify-center rounded-xl border border-white/15 bg-[#07101d]/80 backdrop-blur-sm px-2 py-3 text-center text-sm font-bold leading-snug text-white transition hover:bg-white/10 sm:px-6 sm:py-3.5 sm:text-base"
              >
                Турнірні таблиці
              </a>

            </div>

            {/* HERO STATS */}

            <div className="mt-12 grid max-w-xl grid-cols-3 gap-4">

              <div>
                <div className="text-3xl font-black">
                  4
                </div>

                <div className="mt-1 text-xs uppercase tracking-widest text-white/70">
                  Дивізіони
                </div>
              </div>

              <div>
                <div className="text-3xl font-black">
                  {tournaments.length}+
                </div>

                <div className="mt-1 text-xs uppercase tracking-widest text-white/70">
                  Турнірів
                </div>
              </div>

              <div>
                <div className="text-3xl font-black">
                  ∞
                </div>

                <div className="mt-1 text-xs uppercase tracking-widest text-white/70">
                  Емоцій
                </div>
              </div>

            </div>

          </div>

          {/* =====================================
              MATCHES OF THE DAY
          ===================================== */}

          <div className="relative">

            <div className="absolute -inset-8 rounded-[40px] bg-blue-500/10 blur-3xl" />

            <div className="relative space-y-4">

              {mainFeaturedMatch ? (
                <>

                  {/* MAIN FEATURED MATCH */}

                  <div className="overflow-hidden rounded-[28px] border border-blue-400/20 bg-[#07101d]/90 shadow-2xl backdrop-blur-xl">

                    {/* MATCH HEADER */}

                    <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-7 py-5">

                      <div>

                        <div className="text-xs font-bold uppercase tracking-[0.28em] text-blue-300">
                          Матч дня
                        </div>

                        <div className="mt-1 text-sm text-white/70">
                          {formatFeaturedDate(today)}
                        </div>

                      </div>

                      <div className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-300">
                        Головний
                      </div>

                    </div>

                    {/* MAIN MATCH CONTENT */}

                    <div className="px-7 py-8 text-center">

                      <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-400">
                        {getTournamentName(
                          mainFeaturedMatch.competition,
                          mainFeaturedMatch.division
                        )}
                      </div>

                      {mainFeaturedMatch.round && (
                        <div className="mt-2 text-xs text-white/30">
                          Тур {mainFeaturedMatch.round}
                        </div>
                      )}

                      <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4">

                        {/* HOME PLAYER */}

                        <div className="min-w-0 break-words text-right text-xl font-black sm:text-2xl">
                          {getFeaturedParticipantName(
                            mainFeaturedMatch,
                            mainFeaturedMatch.home_id
                          )}
                        </div>

                        {/* MATCH SCORE */}

                        <div
                          className={`flex min-w-[88px] items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-4 font-black text-blue-300 ${
                            mainFeaturedMatch.status ===
                            "finished"
                              ? "text-2xl"
                              : "text-xl"
                          }`}
                        >
                          {mainFeaturedMatch.status === "finished" &&
mainFeaturedMatch.home_goals !== null &&
mainFeaturedMatch.away_goals !== null
  ? `${mainFeaturedMatch.home_goals} : ${mainFeaturedMatch.away_goals}`
  : mainFeaturedMatch.status === "closed_unplayed"
    ? "—"
    : "VS"}
                        </div>

                        {/* AWAY PLAYER */}

                        <div className="min-w-0 break-words text-left text-xl font-black sm:text-2xl">
                          {getFeaturedParticipantName(
                            mainFeaturedMatch,
                            mainFeaturedMatch.away_id
                          )}
                        </div>

                      </div>

                      <div className="mt-8 text-sm text-white/35">
                        {mainFeaturedMatch.status === "finished"
  ? "Матч завершено"
  : mainFeaturedMatch.status === "closed_unplayed"
    ? "Завершено без результату"
    : "Iron League • Match of the Day"}
                      </div>

                    </div>

                  </div>

                  {/* SECONDARY FEATURED MATCHES */}

                  {secondaryFeaturedMatches.length >
                    0 && (
                    <div className="grid gap-3 sm:grid-cols-2">

                      {secondaryFeaturedMatches.map(
                        (match) => (
                          <div
                            key={match.id}
                            className="rounded-2xl border border-white/10 bg-[#07101d]/90 p-5 backdrop-blur-xl"
                          >

                            <div className="flex items-center justify-between gap-3">

                              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-400">
                                Матч дня {match.position}
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
                                {match.status === "finished" &&
match.home_goals !== null &&
match.away_goals !== null
  ? `${match.home_goals}:${match.away_goals}`
  : match.status === "closed_unplayed"
    ? "—"
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

                /* =====================================
                   EMPTY FEATURED MATCH
                   ONLY ONE CARD
                ===================================== */

                <div className="overflow-hidden rounded-2xl border border-blue-400/20 bg-[#07101d]/95 shadow-2xl backdrop-blur-xl">

                  {/* EMPTY MATCH HEADER */}

                  <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-7">

                    <div>

                      <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
                        Матч дня
                      </div>

                      <div className="mt-1 text-xs text-white/50">
                        Сезон {currentSeason}
                      </div>

                    </div>

                    <div className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-300">
                      Очікується
                    </div>

                  </div>

                  {/* EMPTY MATCH CONTENT */}

                  <div className="flex items-center gap-4 px-5 py-6 sm:gap-5 sm:px-7 sm:py-8">

                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-xl font-black text-blue-300">
                      VS
                    </div>

                    <div className="min-w-0">

                      <h3 className="text-lg font-black leading-tight text-white sm:text-xl">
                        Матч ще не призначено
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-white/50">
                        Центральний матч з&apos;явиться
                        тут після його призначення.
                      </p>

                    </div>

                  </div>

                  {/* EMPTY MATCH FOOTER */}

                  <div className="border-t border-white/10 px-5 py-3 sm:px-7">

                    <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/70">
                      Iron League • Match of the Day
                    </div>

                  </div>

                </div>
              )}

            </div>

          </div>

        </div>

      </section>

      

{/* =====================================
    RECENT RESULTS
===================================== */}

<section
  id="matches"
  className="mx-auto max-w-7xl scroll-mt-24 px-4 py-8 sm:px-6 sm:py-14"
>
  {/* SECTION HEADER */}
  <div className="mb-5 flex items-end justify-between gap-3">
    <div>
      <div className="text-xs font-bold uppercase tracking-widest text-blue-400">
        Матч-центр
      </div>

      <h2 className="mt-2 text-2xl font-black sm:text-3xl">
        Останні результати
      </h2>
    </div>

    <a
      href="/matches"
      className="hidden text-sm font-semibold text-blue-300 transition hover:text-blue-200 sm:block"
    >
      Усі матчі →
    </a>
  </div>

  {/* MATCH LIST */}
  <div className="grid gap-2">
    {results.length === 0 ? (
      <div className="rounded-xl border border-white/10 bg-[#07101d] p-5 text-center">
        <div className="font-bold text-white/60">
          Завершених матчів поки немає
        </div>

        <p className="mt-2 text-sm text-white/50">
          Результати з&apos;являться після внесення рахунків.
        </p>
      </div>
    ) : (
      results.map((match) => (
        <div
          key={match.id}
          className="rounded-xl border border-white/10 bg-[#07101d] px-3 py-3 transition hover:border-blue-400/30 sm:px-4 lg:py-3"
        >
          {/* MOBILE AND TABLET VERSION */}
          <div className="lg:hidden">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-blue-300 sm:text-xs">
                {match.tournament}
              </span>

              <span className="shrink-0 text-[10px] text-white/70 sm:text-xs">
                Завершено
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1 break-words text-right text-xs font-bold leading-4 text-white sm:text-sm">
                {match.home}
              </div>

              <div className="flex min-w-16 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 px-2 py-2 text-base font-black tabular-nums text-blue-300 sm:text-lg">
                {match.score}
              </div>

              <div className="min-w-0 flex-1 break-words text-left text-xs font-bold leading-4 text-white sm:text-sm">
                {match.away}
              </div>
            </div>
          </div>

          {/* DESKTOP VERSION */}
          <div className="hidden lg:grid lg:grid-cols-12 lg:items-center lg:gap-3">
            {/* TOURNAMENT */}
            <div className="col-span-2 text-xs font-bold uppercase tracking-wide text-blue-300">
              {match.tournament}
            </div>

            {/* HOME PLAYER */}
            <div className="col-span-3 min-w-0 break-words text-right text-sm font-bold text-white xl:text-base">
              {match.home}
            </div>

            {/* SCORE */}
            <div className="col-span-2 flex justify-center">
              <div className="min-w-20 rounded-lg border border-blue-400/10 bg-blue-500/15 px-3 py-2 text-center text-lg font-black tabular-nums text-blue-300">
                {match.score}
              </div>
            </div>

            {/* AWAY PLAYER */}
            <div className="col-span-3 min-w-0 break-words text-left text-sm font-bold text-white xl:text-base">
              {match.away}
            </div>

            {/* MATCH STATUS */}
            <div className="col-span-2 text-right text-xs font-medium text-white/70">
              Завершено
            </div>
          </div>
        </div>
      ))
    )}
  </div>

  {/* MOBILE ALL MATCHES LINK */}
  <a
    href="/matches"
    className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-blue-300 sm:hidden"
  >
    Усі матчі
    <span aria-hidden="true">→</span>
  </a>
</section>



      

{/* DIVISIONS */}
<section
  id="divisions"
  className="border-y border-white/10 bg-white/[0.02]"
>
  <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-16">

    <div className="mb-5">
      <div className="text-xs font-bold uppercase tracking-widest text-blue-400">
        Чемпіонат
      </div>

      <h2 className="mt-2 text-3xl font-black sm:text-4xl">
        Дивізіони
      </h2>

      <p className="mt-2 text-sm text-white/50">
        Поточні лідери чотирьох дивізіонів Iron League.
      </p>
    </div>

    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {divisions.map((division) => (
        <a
          key={division.number}
          href={`/divisions/${Number(division.number)}`}
          className="group block rounded-xl border border-white/10 bg-[#07101d] px-4 py-3 transition-all duration-200 hover:border-blue-400/40 hover:bg-[#0b1729] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 sm:p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-black uppercase tracking-wide text-blue-400 sm:text-sm">
              {division.name}
            </div>

          </div>

          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
                Лідер
              </div>

              <div className="mt-1 break-words text-base font-black leading-tight text-white sm:text-lg">
                {division.leader}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div className="text-2xl font-black leading-none tabular-nums text-white">
                {division.points}
              </div>

              <div className="mt-1 text-[10px] uppercase text-white/50">
                Очок
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2">
            <span className="text-xs font-semibold text-blue-300">
              Турнірна таблиця
            </span>

            <span
              aria-hidden="true"
              className="text-base text-blue-300 transition-transform group-hover:translate-x-1"
            >
              →
            </span>
          </div>
        </a>
      ))}
    </div>
  </div>
</section>



      

{/* TOURNAMENTS */}
<section
  id="tournaments"
  className="mx-auto max-w-7xl scroll-mt-24 px-4 py-10 sm:px-6 sm:py-16"
>
  <div className="mb-6">
    <div className="text-xs font-bold uppercase tracking-widest text-blue-400">
      IRON LEAGUE
    </div>

    <h2 className="mt-2 text-3xl font-black sm:text-4xl">
      Турніри
    </h2>

    <p className="mt-2 text-sm text-white/50">
      Сезон {currentSeason} • Усі змагання ліги
    </p>
  </div>

  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {tournaments.map((tournament) => {
      const accents: Record<string, string> = {
        "season-qualification": "#60A5FA",
        "champions-league": "#E9A83B",
        "europa-league": "#F59E0B",
        "conference-league": "#34D399",
        "european-super-cup": "#FBBF24",
        "division-cups": "#60A5FA",
        "associations-cup": "#A78BFA",
        "iron-coop-cup": "#22D3EE",
      };

      const accent = accents[tournament.id] ?? "#60A5FA";

      return (
        <a
          key={tournament.id}
          href={tournament.href}
          className="group relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#07101d] px-4 py-3.5 transition-all duration-200 hover:border-white/25 hover:bg-[#0b1729] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 sm:p-5"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(circle at top right, ${accent}18, transparent 70%)`,
            }}
          />

          <div
            aria-hidden="true"
            className="absolute left-0 top-4 h-8 w-0.5 rounded-r"
            style={{ backgroundColor: accent }}
          />

          <div className="relative flex items-center justify-between gap-3">
            <div
              className="flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-xs font-black"
              style={{
                color: accent,
                borderColor: `${accent}44`,
                backgroundColor: `${accent}16`,
              }}
            >
              {tournament.short}
            </div>

            <div
              aria-hidden="true"
              className="select-none text-4xl font-black leading-none text-white/[0.05]"
            >
              {tournament.short}
            </div>
          </div>

          <div className="relative mt-3">
            <h3 className="text-lg font-black leading-tight text-white sm:text-xl">
              {tournament.name}
            </h3>

            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-white/55 group-hover:text-white">
                Відкрити турнір
              </span>

              <span
                aria-hidden="true"
                className="text-lg font-bold transition-transform group-hover:translate-x-1"
                style={{ color: accent }}
              >
                →
              </span>
            </div>
          </div>
        </a>
      );
    })}
  </div>
</section>



{/* NEWS */}
<section
  id="news"
  className="border-t border-white/10 bg-white/[0.02]"
>
  <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-16">

    {/* HEADER */}
    <div className="mb-5">
      <div className="text-xs font-bold uppercase tracking-widest text-blue-400">
        НОВИНИ
      </div>

      <h2 className="mt-2 text-2xl font-black sm:text-4xl">
        Новини Iron League
      </h2>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
        Оголошення, результати, жеребкування та
        головні події ліги.
      </p>

      <a
        href="/news"
        className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-300 hover:text-blue-200"
      >
        Усі новини
        <span aria-hidden="true">→</span>
      </a>
    </div>

    {/* NEWS LIST */}
    {latestNews.length === 0 ? (
      <a
        href="/news"
        className="block rounded-xl border border-white/10 bg-[#07101d] p-5 text-center"
      >
        <div className="font-bold text-white">
          Новин поки немає
        </div>

        <p className="mt-2 text-sm text-white/50">
          Новини з&apos;являться після публікації.
        </p>
      </a>
    ) : (
      <div className="grid gap-2 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {latestNews.map((item) => (
          <a
            key={item.id}
            href={`/news/${item.slug}`}
            className="group flex overflow-hidden rounded-xl border border-white/10 bg-[#07101d] transition hover:border-blue-400/30 sm:flex-col"
          >

            {/* IMAGE */}
            <div className="relative w-24 shrink-0 self-stretch overflow-hidden bg-[#0b1729] sm:h-44 sm:w-full sm:self-auto">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-500/15 to-[#030711]">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-400/20 bg-blue-500/10 text-sm font-black text-blue-300">
                    IL
                  </div>

                  <div className="mt-1 hidden text-[9px] font-bold uppercase tracking-wider text-white/70 sm:block">
                    IRON LEAGUE NEWS
                  </div>
                </div>
              )}
            </div>

            {/* CONTENT */}
            <div className="flex min-h-28 min-w-0 flex-1 flex-col p-3 sm:p-5">

              {/* CATEGORY */}
              <div className="text-[10px] font-bold uppercase tracking-wide text-blue-300 sm:text-xs">
                {item.category}
              </div>

              {/* TITLE */}
              <h3 className="mt-1 line-clamp-2 break-words text-sm font-black leading-5 text-white sm:mt-3 sm:text-xl sm:leading-7">
                {item.title}
              </h3>

              {/* DESCRIPTION — DESKTOP ONLY */}
              {item.excerpt && (
                <p className="mt-2 hidden line-clamp-2 text-sm leading-6 text-white/55 sm:block">
                  {item.excerpt}
                </p>
              )}

              {/* DATE AND LINK */}
              <div className="mt-auto flex items-center justify-between gap-2 pt-2 sm:mt-4 sm:border-t sm:border-white/10 sm:pt-3">

                <span className="text-[10px] text-white/50 sm:text-xs">
                  {formatNewsDate(item.published_at)}
                </span>

                <span
                  aria-hidden="true"
                  className="shrink-0 text-lg text-blue-300 transition-transform group-hover:translate-x-1"
                >
                  →
                </span>

              </div>
            </div>
          </a>
        ))}
      </div>
    )}
  </div>
</section>



      {/* =====================================
          FOOTER
      ===================================== */}

      <SiteFooter />

    </main>
  );
}
