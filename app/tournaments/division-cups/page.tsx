import StadiumBackground from "../../../components/StadiumBackground";
import SiteHeader from "../../../components/public/SiteHeader";
import { players } from "../../../data/players";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import Link from "next/link";

type SeasonNumber = 1 | 2 | 3 | 4;

type PageProps = {
  searchParams: Promise<{
    season?: string;
  }>;
};

type CupMatch = {
  id: string;

  competition: string;
  division: number | null;

  stage: string | null;
  round: number | null;
  leg: number | null;

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
  STAGE TITLE
  ========================================
*/

function getStageTitle(
  stage: string
) {
  if (
    stage === "round-of-16"
  ) {
    return "1/8 фіналу";
  }

  if (
    stage === "quarterfinal"
  ) {
    return "1/4 фіналу";
  }

  if (
    stage === "semifinal"
  ) {
    return "1/2 фіналу";
  }

  if (
    stage === "final"
  ) {
    return "Фінал";
  }

  return stage;
}

/*
  ========================================
  STAGE ORDER
  ========================================
*/

function getStageOrder(
  stage: string | null
) {
  if (
    stage === "round-of-16"
  ) {
    return 1;
  }

  if (
    stage === "quarterfinal"
  ) {
    return 2;
  }

  if (
    stage === "semifinal"
  ) {
    return 3;
  }

  if (
    stage === "final"
  ) {
    return 4;
  }

  return 99;
}

/*
  ========================================
  MATCH CARD
  ========================================
*/

function MatchCard({
  match,
  season,
}: {
  match: CupMatch;
  season: SeasonNumber;
}) {
  const finished =
    match.status ===
      "finished" &&
    match.home_goals !==
      null &&
    match.away_goals !==
      null;

  const homeWinner =
    finished &&
    match.home_goals! >
      match.away_goals!;

  const awayWinner =
    finished &&
    match.away_goals! >
      match.home_goals!;

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#081321]">
      {/* HOME */}

      <div
        className={`flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 ${
          homeWinner
            ? "bg-blue-500/15"
            : ""
        }`}
      >
        <div
          className={`h-5 w-1 shrink-0 rounded-full ${
            homeWinner
              ? "bg-blue-400"
              : "bg-transparent"
          }`}
        />

        <a
          href={`/players/${match.home_id}?season=${season}`}
          className={`min-w-0 flex-1 truncate font-bold transition hover:text-blue-300 ${
            homeWinner
              ? "text-white"
              : "text-white/80"
          }`}
        >
          {getPlayerName(
            match.home_id
          )}
        </a>

        <div
          className={`w-8 text-right text-lg font-black ${
            homeWinner
              ? "text-blue-300"
              : "text-white"
          }`}
        >
          {finished
            ? match.home_goals
            : "—"}
        </div>
      </div>

      {/* AWAY */}

      <div
        className={`flex items-center gap-3 px-4 py-3 ${
          awayWinner
            ? "bg-blue-500/15"
            : ""
        }`}
      >
        <div
          className={`h-5 w-1 shrink-0 rounded-full ${
            awayWinner
              ? "bg-blue-400"
              : "bg-transparent"
          }`}
        />

        <a
          href={`/players/${match.away_id}?season=${season}`}
          className={`min-w-0 flex-1 truncate font-bold transition hover:text-blue-300 ${
            awayWinner
              ? "text-white"
              : "text-white/80"
          }`}
        >
          {getPlayerName(
            match.away_id
          )}
        </a>

        <div
          className={`w-8 text-right text-lg font-black ${
            awayWinner
              ? "text-blue-300"
              : "text-white"
          }`}
        >
          {finished
            ? match.away_goals
            : "—"}
        </div>
      </div>
    </div>
  );
}

/*
  ========================================
  BRACKET
  ========================================
*/

function CupBracket({
  matches,
  season,
}: {
  matches: CupMatch[];
  season: SeasonNumber;
}) {
  const stages = [
    "round-of-16",
    "quarterfinal",
    "semifinal",
    "final",
  ];

  return (
  <div className="overflow-visible pb-0 xl:overflow-x-auto xl:pb-3">
    <div className="grid grid-cols-1 gap-4 xl:min-w-[1080px] xl:grid-cols-4 xl:gap-6">
        {stages.map(
          (stage) => {
            const stageMatches =
              matches
                .filter(
                  (match) =>
                    match.stage ===
                    stage
                )
                .sort(
                  (a, b) =>
                    (a.round ??
                      0) -
                    (b.round ??
                      0)
                );

            return (
              <div
                key={stage}
                className="min-w-0"
              >
                {/* STAGE HEADER */}

                <div className="mb-3 border-b border-white/10 pb-2 xl:mb-5 xl:pb-3">
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">
                    {getStageTitle(
                      stage
                    )}
                  </div>

                  <div className="mt-1 text-xs text-white/70">
                    {
                      stageMatches.length
                    }{" "}
                    {stageMatches.length ===
                    1
                      ? "матч"
                      : "матчів"}
                  </div>
                </div>

                {/* MATCHES */}

                {stageMatches.length >
                0 ? (

<div
  className={
    stage === "round-of-16"
  ? "space-y-4 xl:space-y-4"
      : stage === "quarterfinal"
        ? "space-y-3 xl:space-y-10 xl:pt-8"
        : stage === "semifinal"
          ? "space-y-3 xl:space-y-24 xl:pt-28"
          : "space-y-3 xl:pt-64"
  }
>


{stageMatches.map((match) => (
  <div
    key={match.id}
    className="rounded-xl ring-1 ring-blue-400/25 shadow-[0_8px_24px_rgba(0,0,0,0.30)] xl:ring-0 xl:shadow-none"
  >
    <MatchCard
      match={match}
      season={season}
    />
  </div>
))}

                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-white/25">
                    Даних немає
                  </div>
                )}
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}

/*
  ========================================
  PAGE
  ========================================
*/

export default async function DivisionCupsPage({
  searchParams,
}: PageProps) {
  const params =
    await searchParams;

  const requestedSeason =
    Number(params.season);

  const season: SeasonNumber =
    requestedSeason >= 1 &&
    requestedSeason <= 4
      ? (requestedSeason as SeasonNumber)
      : 3;

  /*
    ========================================
    CUP NUMBERS

    Season 1:
    only Divisions 1-3 existed.

    Seasons 2-4:
    Divisions 1-4.
    ========================================
  */

  const cupNumbers =
    season === 1
      ? [1, 2, 3]
      : [1, 2, 3, 4];

  const competitionIds =
    cupNumbers.map(
      (number) =>
        `division-${number}-cup`
    );

  /*
    ========================================
    LOAD MATCHES
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
        competition,
        division,
        stage,
        round,
        leg,
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
    .in(
      "competition",
      competitionIds
    );

  const allMatches =
    ((data ?? []) as CupMatch[])
      .sort(
        (a, b) => {
          const competitionCompare =
            a.competition.localeCompare(
              b.competition
            );

          if (
            competitionCompare !==
            0
          ) {
            return competitionCompare;
          }

          const stageCompare =
            getStageOrder(
              a.stage
            ) -
            getStageOrder(
              b.stage
            );

          if (
            stageCompare !== 0
          ) {
            return stageCompare;
          }

          return (
            (a.round ?? 0) -
            (b.round ?? 0)
          );
        }
      );

  /*
    ========================================
    CUP DATA
    ========================================
  */

  const cups =
    cupNumbers.map(
      (number) => {
        const competition =
          `division-${number}-cup`;

        const matches =
          allMatches.filter(
            (match) =>
              match.competition ===
              competition
          );

        const participantIds =
          new Set<string>();

        for (
          const match of matches
        ) {
          participantIds.add(
            match.home_id
          );

          participantIds.add(
            match.away_id
          );
        }

        return {
          number,
          competition,

          name:
            `Кубок ${number} Дивізіону`,

          matches,

          participantIds:
            Array.from(
              participantIds
            ),
        };
      }
    );

  /*
    ========================================
    TOTAL PARTICIPANTS
    ========================================
  */

  const allParticipantIds =
    new Set<string>();

  for (
    const cup of cups
  ) {
    for (
      const playerId of
        cup.participantIds
    ) {
      allParticipantIds.add(
        playerId
      );
    }
  }

  const totalPlayers =
    allParticipantIds.size;

  /*
    ========================================
    STATUS
    ========================================
  */

  const seasonStatus =
    season === 1 ||
    season === 2
      ? "Архів"
      : season === 3
        ? "Поточний сезон"
        : "Підготовка";

  return (
    <main className="min-h-screen bg-[#030711] text-white">

      {/* HEADER */}
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10">
        <StadiumBackground
          opacity="25"
          preload
        />

        {/* BACKGROUND OVERLAYS */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#030711] via-[#030711]/85 to-[#030711]/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#030711] via-transparent to-[#030711]/70" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:py-14">

          {/* BACK LINK */}
          <a
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-300 transition hover:text-blue-200 sm:text-sm"
          >
            <span aria-hidden="true">←</span>
            На головну
          </a>

          {/* TITLE */}
          <div className="mt-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 sm:text-xs">
              IRON LEAGUE CUPS
            </div>

            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
              Кубки дивізіонів
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
              Окремі турніри на вибування для учасників
              дивізіонів Iron League.
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
                    href={`/tournaments/division-cups?season=${seasonNumber}`}
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

          {/* CUP STATISTICS */}
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

            {/* CUPS */}
            <div className="min-w-0 rounded-xl border border-white/10 bg-[#07101d]/90 px-3 py-3 backdrop-blur-sm sm:px-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/45 sm:text-xs">
                Кубків
              </div>

              <div className="mt-1 text-xl font-black text-white sm:text-2xl">
                {cupNumbers.length}
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
        </div>
      </section>


      {/* CONTENT */}

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Плей-оф
          </div>

          <h2 className="mt-3 text-3xl font-black">
            Кубки
          </h2>
        </div>

        {/* DATABASE ERROR */}

        {error ? (
          <div className="rounded-3xl border border-red-400/20 bg-red-500/10 px-8 py-12 text-center text-red-200">
            Не вдалося
            завантажити Кубки
            дивізіонів.
          </div>
        ) : (
          <div className="space-y-10">
            {cups.map(
              (cup) => (
                <article
                  key={
                    cup.number
                  }
                  className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] shadow-xl"
                >
                  {/* CUP HEADER */}

                  <div className="relative border-b border-white/10 bg-gradient-to-r from-blue-500/15 to-transparent px-7 py-6">
                    <div className="absolute right-5 top-0 text-[100px] font-black text-white/[0.025]">
                      {
                        cup.number
                      }
                    </div>

                    <div className="relative">
                      <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                        Knockout
                        Tournament
                      </div>

                      <h3 className="mt-2 text-3xl font-black">
                        {
                          cup.name
                        }
                      </h3>

                      <div className="mt-3 flex flex-wrap gap-5 text-sm text-white/40">
                        <span>
                          {
                            cup
                              .participantIds
                              .length
                          }{" "}
                          учасників
                        </span>

                        <span>
                          {
                            cup.matches
                              .length
                          }{" "}
                          матчів
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* CUP CONTENT */}

                  <div className="p-5 md:p-7">
                    {cup.matches
                      .length >
                    0 ? (
                      <CupBracket
                        matches={
                          cup.matches
                        }
                        season={
                          season
                        }
                      />
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-8 py-12 text-center">
                        <div className="text-xl font-black">
                          Дані цього
                          кубка ще не
                          додано
                        </div>

                        <div className="mt-3 text-sm text-white/80">
                          Матчі{" "}
                          {
                            cup.name
                          }{" "}
                          Сезону{" "}
                          {season} ще
                          відсутні в
                          базі.
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>
    </main>
  );
}