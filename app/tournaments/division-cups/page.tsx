import { players } from "../../../data/players";
import { supabaseAdmin } from "../../../lib/supabase-admin";

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
    <div className="overflow-x-auto pb-3">
      <div className="grid min-w-[1080px] grid-cols-4 gap-6">
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

                <div className="mb-5 border-b border-white/10 pb-3">
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">
                    {getStageTitle(
                      stage
                    )}
                  </div>

                  <div className="mt-1 text-xs text-white/35">
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
                      stage ===
                      "round-of-16"
                        ? "space-y-4"
                        : stage ===
                            "quarterfinal"
                          ? "space-y-10 pt-8"
                          : stage ===
                              "semifinal"
                            ? "space-y-24 pt-28"
                            : "pt-64"
                    }
                  >
                    {stageMatches.map(
                      (
                        match
                      ) => (
                        <MatchCard
                          key={
                            match.id
                          }
                          match={
                            match
                          }
                          season={
                            season
                          }
                        />
                      )
                    )}
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
                Кубки дивізіонів
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

        <div className="absolute inset-0 bg-gradient-to-r from-[#030711] via-[#030711]/85 to-[#030711]/60" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#030711] via-transparent to-[#030711]/70" />

        <div className="relative mx-auto max-w-7xl px-6 py-20">
          <div className="text-xs font-bold uppercase tracking-[0.28em] text-blue-400">
            Iron League
          </div>

          <h1 className="mt-4 text-5xl font-black sm:text-6xl">
            Кубки дивізіонів
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/55">
            Окремі турніри на
            вибування для
            учасників дивізіонів
            Iron League.
          </p>

          {/* SEASON SWITCHER */}

          <div className="mt-8">
            <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/35">
              Обрати сезон
            </div>

            <div className="inline-flex flex-wrap rounded-xl border border-white/10 bg-[#07101d] p-1">
              {(
                [
                  1,
                  2,
                  3,
                  4,
                ] as const
              ).map(
                (
                  seasonNumber
                ) => (
                  <a
                    key={
                      seasonNumber
                    }
                    href={`/tournaments/division-cups?season=${seasonNumber}`}
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

          {/* SUMMARY */}

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
                Кубків
              </span>

              <span className="ml-2 font-black">
                {
                  cupNumbers.length
                }
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">
                Учасників
              </span>

              <span className="ml-2 font-black">
                {
                  totalPlayers
                }
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">
                Статус
              </span>

              <span className="ml-2 font-black text-blue-300">
                {
                  seasonStatus
                }
              </span>
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

                        <div className="mt-3 text-sm text-white/35">
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