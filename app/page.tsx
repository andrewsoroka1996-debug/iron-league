
import Image from "next/image";
import PlayerTableEmblem from "../components/PlayerTableEmblem";
import { getPlayerEmblemUrls } from "../lib/player-emblem-urls";
import SiteHeader from "../components/public/SiteHeader";
import SiteFooter from "../components/public/SiteFooter";
import { seasonCompetitions } from "../data/competitions/season-competitions";
import { players } from "../data/players";
import { season3 } from "../data/seasons/season-3";
import { buildStandings } from "../lib/standings";
import { supabase } from "../lib/supabase";
import { supabaseAdmin } from "../lib/supabase-admin";
import {
  applyPlayerReplacements,
  getSeasonPlayerReplacements,
  resolveReplacementPlayerId,
} from "../lib/player-replacements";

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
  id: number;
  match_id: string;
  position: number;
  display_date: string | null;
  display_time: string | null;
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
    display_date: string | null;
    display_time: string | null;
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

// Only individual players have profile emblems. Team/association IDs must
// never be treated as player IDs (for example in Iron Co-op Cup matches).
function getMatchPlayerEmblemUrl(
  match: { participant_type: string },
  participantId: string,
  emblemUrls: Record<string, string>
) {
  return match.participant_type === "player"
    ? emblemUrls[participantId]
    : undefined;
}

/* ========================================
   OPTIONAL EDITORIAL DATE / TIME
   Stored in Kyiv local time, independently from played_at.
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
  // Same profile emblems as the division and European cup tables.
  const emblemUrls = await getPlayerEmblemUrls();

  /* ========================================
     FEATURED MATCHES
  ======================================== */

  const {
    data: featuredAssignmentsData,
    error: featuredAssignmentsError,
  } = await supabaseAdmin
    .from("weekly_featured_matches")
    .select(
      "id, match_id, position, display_date, display_time"
    )
    .eq("season", currentSeason)
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
          display_date: assignment.display_date,
          display_time: assignment.display_time,
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
      homeEmblemUrl: getMatchPlayerEmblemUrl(
        match, match.home_id, emblemUrls
      ),

      away: getPlayerName(match.away_id),
      awayEmblemUrl: getMatchPlayerEmblemUrl(
        match, match.away_id, emblemUrls
      ),

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

     Use the same matches, replacement rules and
     standings algorithm as components/DivisionPage.tsx.
  ======================================== */

  const divisionNumbers: DivisionNumber[] = [1, 2, 3, 4];

  // Each division has its own query, as on the official division page.
  // This also avoids the default row limit for a combined all-division query.
  const [seasonReplacements, divisionMatchResults] = await Promise.all([
    getSeasonPlayerReplacements(currentSeason),
    Promise.all(
      divisionNumbers.map((division) =>
        supabaseAdmin
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
          .eq("division", division)
          .order("round", {
            ascending: true,
            nullsFirst: false,
          })
      )
    ),
  ]);

  const divisions = divisionNumbers.map((division, index) => {
    const result = divisionMatchResults[index];

    if (result.error) {
      console.error("HOME DIVISION MATCHES ERROR:", division, result.error);
    }

    const databaseMatches =
      (result.data ?? []) as DivisionDatabaseMatch[];

    const replacements = seasonReplacements.filter(
      (replacement) => replacement.division === division
    );

    const participantIds = applyPlayerReplacements(
      getSeason3DivisionPlayers(division),
      replacements
    );

    // Preserve the original home-page empty state before any results.
    const hasFinishedMatches = databaseMatches.some(
      (match) =>
        match.status === "finished" &&
        match.home_goals !== null &&
        match.away_goals !== null
    );

    if (!hasFinishedMatches) {
      return {
        number: String(division).padStart(2, "0"),
        name: `${division} Дивізіон`,
        leader: "—",
        leaderId: null as string | null,
        points: 0,
      };
    }

    const standings = buildStandings({
      participantIds,
      matches: databaseMatches.map((match) => ({
        home_id: resolveReplacementPlayerId(match.home_id, replacements),
        away_id: resolveReplacementPlayerId(match.away_id, replacements),
        home_goals: match.home_goals,
        away_goals: match.away_goals,
        status: match.status,
      })),
      format: "division-qualification",
    });

    // Same visible rows/order as the official table: only known players.
    const leader = standings.find((row) =>
      players.some((player) => player.id === row.playerId)
    );

    return {
      number: String(division).padStart(2, "0"),
      name: `${division} Дивізіон`,
      leader: leader ? getPlayerName(leader.playerId) : "—",
      leaderId: leader?.playerId ?? null,
      points: leader?.points ?? 0,
    };
  });

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

        <div className="relative mx-auto grid max-w-7xl items-center gap-5 px-4 py-7 sm:gap-10 sm:px-6 sm:py-16 lg:min-h-[640px] lg:grid-cols-2 lg:gap-12 lg:py-20">

          {/* HERO LEFT */}

          <div>

            <div className="mb-3 inline-flex items-center gap-3 rounded-full border border-blue-400/20 sm:mb-6 bg-blue-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-blue-300">

              <span className="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_12px_#60a5fa]" />

              eFootball Competition

            </div>

            <div className="-mx-2 max-w-none sm:mx-0 sm:max-w-2xl">

              <Image
  src="/iron-league-logo.jpg"
  alt="Iron League"
  width={420}
  height={420}
  fetchPriority="high"
  sizes="(min-width: 1024px) 320px, (min-width: 640px) 288px, (min-width: 400px) 380px, calc(100vw - 16px)"
  quality={75}
  className="mx-auto h-auto w-full max-w-[380px] object-contain drop-shadow-lg sm:mx-0 sm:w-72 lg:w-80"
/>

            </div>

            <p className="mt-4 max-w-xl text-base leading-7 text-white/85 sm:mt-7 sm:text-lg sm:leading-8 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
  Єдина платформа Iron League: матчі,
  дивізіони, єврокубки, статистика,
  результати, турнірні таблиці та
  історія ліги.
</p>

            {/* HERO BUTTONS */}

            <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-7 sm:flex sm:flex-wrap sm:gap-4">

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

            <div className="mt-7 grid max-w-xl grid-cols-3 gap-2 sm:mt-12 sm:gap-4">

              <div>
                <div className="text-2xl font-black sm:text-3xl">
                  4
                </div>

                <div className="mt-0.5 text-[11px] uppercase tracking-wider text-white/70 sm:mt-1 sm:text-xs sm:tracking-widest">
                  Дивізіони
                </div>
              </div>

              <div>
                <div className="text-2xl font-black sm:text-3xl">
                  {tournaments.length}+
                </div>

                <div className="mt-0.5 text-[11px] uppercase tracking-wider text-white/70 sm:mt-1 sm:text-xs sm:tracking-widest">
                  Турнірів
                </div>
              </div>

              <div>
                <div className="text-2xl font-black sm:text-3xl">
                  ∞
                </div>

                <div className="mt-0.5 text-[11px] uppercase tracking-wider text-white/70 sm:mt-1 sm:text-xs sm:tracking-widest">
                  Емоцій
                </div>
              </div>

            </div>

          </div>

          {/* =====================================
              FIVE MANUALLY CURATED MATCHES OF THE WEEK
              No expiry by date; display until removed by admin.
          ===================================== */}
          <div className="relative min-w-0">
            <div aria-hidden="true" className="pointer-events-none absolute -inset-6 rounded-[32px] bg-blue-500/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[24px] border border-blue-400/25 bg-[#07101d]/95 shadow-2xl backdrop-blur-xl sm:rounded-[28px]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-4 sm:px-6 sm:py-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true" className="text-lg text-blue-400">🏆</span>
                    <h2 className="text-lg font-black uppercase tracking-wide text-white sm:text-2xl">5 матчів тижня</h2>
                  </div>
                  <p className="mt-1 text-xs text-white/55">Сезон {currentSeason} · Вибір організаторів</p>
                </div>
                <span className="rounded-full border border-blue-400/25 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-300">
                  {featuredMatches.length} із 5
                </span>
              </div>

              {featuredMatches.length > 0 ? (
                <div className="space-y-2 p-3 sm:space-y-2.5 sm:p-4">
                  {featuredMatches.map(match => {
                    const played = match.status === "finished" && match.home_goals !== null && match.away_goals !== null;
                    const hasDate = Boolean(match.display_date);
                    const hasTime = Boolean(match.display_time);
                    return (
                      <a key={match.id} href="/matches"
                        className={`block min-w-0 rounded-xl border bg-[#0b1729]/95 p-3 transition hover:border-blue-400/50 hover:bg-blue-500/10 sm:px-4 sm:py-3.5 ${match.position === 1 ? "border-amber-400/45" : "border-white/10"}`}>
                        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                          <span className={`flex h-8 w-7 shrink-0 items-center justify-center text-base font-black tabular-nums ${match.position === 1 ? "text-amber-300" : "text-white/65"}`}>{match.position}</span>
                          <div className="min-w-0 flex-1">
                            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
                              <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">
                                <span className="min-w-0 truncate text-right text-xs font-black text-white sm:text-sm" title={getFeaturedParticipantName(match,match.home_id)}>{getFeaturedParticipantName(match,match.home_id)}</span>
                                <PlayerTableEmblem src={getMatchPlayerEmblemUrl(match,match.home_id,emblemUrls)} size="featured" />
                              </div>
                              <span className="shrink-0 rounded-lg bg-blue-500/10 px-2 py-1.5 text-center text-xs font-black tabular-nums text-blue-300 sm:text-sm">
                                {played ? `${match.home_goals}:${match.away_goals}` : match.status === "closed_unplayed" ? "—" : "VS"}
                              </span>
                              <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                                <PlayerTableEmblem src={getMatchPlayerEmblemUrl(match,match.away_id,emblemUrls)} size="featured" />
                                <span className="min-w-0 truncate text-left text-xs font-black text-white sm:text-sm" title={getFeaturedParticipantName(match,match.away_id)}>{getFeaturedParticipantName(match,match.away_id)}</span>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[10px] sm:text-[11px]">
                              <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-2 py-0.5 font-bold text-blue-300">{getTournamentName(match.competition,match.division)}</span>
                              {played ? <span className="font-semibold text-emerald-300">Зіграно</span> : match.status === "closed_unplayed" ? <span className="text-white/50">Не відбувся</span> : null}
                              <span className="text-white/50">
                                {hasDate ? formatFeaturedDate(match.display_date!) : played ? "Дата не вказана" : "Дата уточнюється"}
                                {hasDate && (hasTime ? ` · ${match.display_time!.slice(0,5)}` : " · Час уточнюється")}
                              </span>
                            </div>
                          </div>
                          <span aria-hidden="true" className="shrink-0 text-blue-300/65">›</span>
                        </div>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <div className="px-5 py-10 text-center">
                  <div className="text-3xl text-blue-300/50">⚽</div>
                  <h3 className="mt-3 text-base font-black">Матчі тижня ще не обрано</h3>
                  <p className="mt-2 text-sm text-white/50">П'ять найцікавіших протистоянь з'являться тут після публікації організатором.</p>
                </div>
              )}
              <div className="border-t border-white/10 px-5 py-3">
                <a href="/matches" className="text-xs font-bold uppercase tracking-[0.12em] text-blue-300 transition hover:text-blue-200">Усі матчі →</a>
              </div>
            </div>
          </div>

        </div>

      </section>

      

{/* =====================================
    RECENT RESULTS
===================================== */}

<section
  id="matches"
  className="relative isolate mx-auto max-w-7xl scroll-mt-24 px-4 py-5 sm:px-6 sm:py-14"
>
  {/* BACKGROUND: RECENT RESULTS */}
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2 bg-cover bg-center"
    style={{
      backgroundImage:
        "linear-gradient(to bottom, #030711 0%, rgba(3,7,17,0.66) 30%, rgba(3,7,17,0.70) 75%, #030711 100%), url('/backgrounds/iron-league-results-bg.webp')",
    }}
  />
  {/* SECTION HEADER */}
  <div className="mb-3 flex items-end justify-between gap-3 sm:mb-5">
    <div>
      <div className="text-xs font-bold uppercase tracking-widest text-blue-400">
        Матч-центр
      </div>

      <h2 className="mt-1 text-2xl font-black sm:mt-2 sm:text-3xl">
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
          className="rounded-xl border border-white/10 bg-[#07101d] px-3 py-2.5 transition hover:border-blue-400/30 sm:px-4 sm:py-3"
        >
          {/* MOBILE AND TABLET VERSION */}
          <div className="lg:hidden">
            <div className="mb-1.5 flex items-center justify-between gap-2 sm:mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-blue-300 sm:text-xs">
                {match.tournament}
              </span>

              <span className="shrink-0 text-[10px] text-white/70 sm:text-xs">
                Завершено
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 text-right text-xs font-bold leading-4 text-white sm:text-sm">
                <span className="min-w-0 break-words">{match.home}</span>
                <PlayerTableEmblem src={match.homeEmblemUrl} size="compact" />
              </div>

              <div className="flex min-w-16 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 px-2 py-1.5 text-base font-black tabular-nums text-blue-300 sm:py-2 sm:text-lg">
                {match.score}
              </div>

              <div className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-xs font-bold leading-4 text-white sm:text-sm">
                <PlayerTableEmblem src={match.awayEmblemUrl} size="compact" />
                <span className="min-w-0 break-words">{match.away}</span>
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
            <div className="col-span-3 flex min-w-0 items-center justify-end gap-2 text-right text-sm font-bold text-white xl:text-base">
              <span className="min-w-0 break-words">{match.home}</span>
              <PlayerTableEmblem src={match.homeEmblemUrl} size="compact" />
            </div>

            {/* SCORE */}
            <div className="col-span-2 flex justify-center">
              <div className="min-w-20 rounded-lg border border-blue-400/10 bg-blue-500/15 px-3 py-2 text-center text-lg font-black tabular-nums text-blue-300">
                {match.score}
              </div>
            </div>

            {/* AWAY PLAYER */}
            <div className="col-span-3 flex min-w-0 items-center gap-2 text-left text-sm font-bold text-white xl:text-base">
              <PlayerTableEmblem src={match.awayEmblemUrl} size="compact" />
              <span className="min-w-0 break-words">{match.away}</span>
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

              <div className="mt-1 flex min-w-0 items-center gap-2 text-base font-black leading-tight text-white sm:text-lg">
                <PlayerTableEmblem
                  src={division.leaderId ? emblemUrls[division.leaderId] : undefined}
                />
                <span className="min-w-0 break-words">{division.leader}</span>
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
