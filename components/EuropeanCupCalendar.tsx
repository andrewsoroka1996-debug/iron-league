import { players } from "../data/players";
import { supabaseAdmin } from "../lib/supabase-admin";

type EuropeanCompetition =
  | "champions-league"
  | "europa-league"
  | "conference-league";

type Props = {
  season: number;
  competition: EuropeanCompetition;
};

type Match = {
  id: string;
  stage: string | null;
  group_name: string | null;
  round: number | null;
  leg: number | null;
  home_id: string;
  away_id: string;
  home_goals: number | null;
  away_goals: number | null;
  status: string;
};

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

function getCompetitionName(
  competition: EuropeanCompetition
) {
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

  return "Ліга конференцій";
}

function stageTitle(
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

export default async function EuropeanCupCalendar({
  season,
  competition,
}: Props) {
  const competitionName =
    getCompetitionName(
      competition
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
        stage,
        group_name,
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
    .eq(
      "competition",
      competition
    );

  if (error) {
    return (
      <section className="bg-[#030711] px-6 py-16 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-red-200">
            Не вдалося
            завантажити календар
            турніру.
          </div>
        </div>
      </section>
    );
  }

  const matches =
    (data ?? []) as Match[];

  if (
    matches.length === 0
  ) {
    return null;
  }

  /*
    ========================================
    GROUP STAGE
    ========================================
  */

  const groupMatches =
    matches.filter(
      (match) =>
        match.stage ===
        "group"
    );

  const groupRounds =
    new Map<
      number,
      Match[]
    >();

  for (
    const match of groupMatches
  ) {
    if (
      match.round === null
    ) {
      continue;
    }

    const current =
      groupRounds.get(
        match.round
      ) ?? [];

    current.push(match);

    groupRounds.set(
      match.round,
      current
    );
  }

  const sortedGroupRounds =
    Array.from(
      groupRounds.entries()
    ).sort(
      (
        [roundA],
        [roundB]
      ) =>
        roundA - roundB
    );

  /*
    ========================================
    PLAYOFF
    ========================================
  */

  const playoffStages = [
    "round-of-16",
    "quarterfinal",
    "semifinal",
    "final",
  ];

  /*
    ========================================
    MATCH CARD
    ========================================
  */

  function MatchCard({
    match,
    showGroup = false,
  }: {
    match: Match;
    showGroup?: boolean;
  }) {
    const finished =
      match.status ===
        "finished" &&
      match.home_goals !==
        null &&
      match.away_goals !==
        null;

    return (
      <div className="rounded-xl border border-white/10 bg-[#081321] px-4 py-4 text-white shadow-sm transition hover:border-blue-400/30 hover:bg-[#0b192a]">
        {showGroup &&
          match.group_name && (
            <div className="mb-3 text-center text-[11px] font-black uppercase tracking-[0.2em] text-blue-400">
              Група{" "}
              {
                match.group_name
              }
            </div>
          )}

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="min-w-0 text-right">
            <a
              href={`/players/${match.home_id}?season=${season}`}
              className="font-bold text-white transition hover:text-blue-300"
            >
              {getPlayerName(
                match.home_id
              )}
            </a>
          </div>

          <div className="min-w-[82px] text-center">
            {finished ? (
              <div className="rounded-lg border border-white/15 bg-white/[0.08] px-3 py-2 text-lg font-black text-white shadow-inner">
                {
                  match.home_goals
                }

                <span className="mx-2 text-white/40">
                  :
                </span>

                {
                  match.away_goals
                }
              </div>
            ) : (
              <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-white/45">
                VS
              </div>
            )}
          </div>

          <div className="min-w-0">
            <a
              href={`/players/${match.away_id}?season=${season}`}
              className="font-bold text-white transition hover:text-blue-300"
            >
              {getPlayerName(
                match.away_id
              )}
            </a>
          </div>
        </div>

        {match.stage !==
          "group" &&
          match.stage !==
            "final" &&
          match.leg && (
            <div className="mt-3 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
              {match.leg === 1
                ? "1-й матч"
                : "Матч-відповідь"}
            </div>
          )}
      </div>
    );
  }

  return (
    <section
      id="calendar"
      className="border-t border-white/10 bg-[#030711] text-white"
    >
      <div className="mx-auto max-w-7xl px-6 py-16">
        {/* HEADER */}

        <div className="mb-10">
          <div className="text-xs font-black uppercase tracking-[0.25em] text-blue-400">
            {competitionName}
          </div>

          <h2 className="mt-3 text-4xl font-black text-white">
            Календар матчів
          </h2>

          <p className="mt-3 max-w-2xl leading-7 text-white/50">
            Усі матчі турніру{" "}
            {competitionName} у
            Сезоні {season}:
            груповий етап та
            плей-оф.
          </p>
        </div>

        {/* GROUP STAGE */}

        {sortedGroupRounds.length >
          0 && (
          <div>
            <div className="mb-6">
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                Груповий етап
              </div>

              <h3 className="mt-2 text-2xl font-black text-white">
                Тури
              </h3>
            </div>

            <div className="space-y-4">
              {sortedGroupRounds.map(
                ([
                  round,
                  roundMatches,
                ]) => {
                  const sortedMatches =
                    [
                      ...roundMatches,
                    ].sort(
                      (
                        a,
                        b
                      ) =>
                        (
                          a.group_name ??
                          ""
                        ).localeCompare(
                          b.group_name ??
                            ""
                        )
                    );

                  return (
                    <details
                      key={
                        round
                      }
                      open={
                        round ===
                        1
                      }
                      className="group overflow-hidden rounded-2xl border border-white/10 bg-[#07101d]"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 transition hover:bg-white/[0.04]">
                        <div>
                          <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">
                            Груповий
                            етап
                          </div>

                          <div className="mt-1 text-xl font-black text-white">
                            Тур{" "}
                            {
                              round
                            }
                          </div>
                        </div>

                        <div className="flex items-center gap-5">
                          <div className="text-sm font-medium text-white/50">
                            {
                              roundMatches.length
                            }{" "}
                            матчів
                          </div>

                          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/60 transition group-open:rotate-180">
                            ↓
                          </div>
                        </div>
                      </summary>

                      <div className="border-t border-white/10 bg-[#050c16] p-4 md:p-6">
                        <div className="grid gap-3 lg:grid-cols-2">
                          {sortedMatches.map(
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
                                showGroup
                              />
                            )
                          )}
                        </div>
                      </div>
                    </details>
                  );
                }
              )}
            </div>
          </div>
        )}

        {/* PLAYOFF */}

        <div className="mt-16">
          <div className="mb-6">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
              Плей-оф
            </div>

            <h3 className="mt-2 text-3xl font-black text-white">
              Матчі плей-оф
            </h3>
          </div>

          <div className="space-y-4">
            {playoffStages.map(
              (stage) => {
                const stageMatches =
                  matches
                    .filter(
                      (match) =>
                        match.stage ===
                        stage
                    )
                    .sort(
                      (
                        a,
                        b
                      ) => {
                        const roundDifference =
                          (a.round ??
                            0) -
                          (b.round ??
                            0);

                        if (
                          roundDifference !==
                          0
                        ) {
                          return roundDifference;
                        }

                        return (
                          (a.leg ??
                            0) -
                          (b.leg ??
                            0)
                        );
                      }
                    );

                if (
                  stageMatches.length ===
                  0
                ) {
                  return null;
                }

                const pairs =
                  new Map<
                    number,
                    Match[]
                  >();

                for (
                  const match of
                    stageMatches
                ) {
                  const slot =
                    match.round ??
                    1;

                  const current =
                    pairs.get(
                      slot
                    ) ?? [];

                  current.push(
                    match
                  );

                  pairs.set(
                    slot,
                    current
                  );
                }

                const sortedPairs =
                  Array.from(
                    pairs.entries()
                  ).sort(
                    (
                      [slotA],
                      [slotB]
                    ) =>
                      slotA -
                      slotB
                  );

                return (
                  <details
                    key={
                      stage
                    }
                    open={
                      stage ===
                      "round-of-16"
                    }
                    className="group overflow-hidden rounded-2xl border border-white/10 bg-[#07101d]"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 transition hover:bg-white/[0.04]">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">
                          Плей-оф
                        </div>

                        <div className="mt-1 text-xl font-black text-white">
                          {stageTitle(
                            stage
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-5">
                        <div className="text-sm font-medium text-white/50">
                          {
                            stageMatches.length
                          }{" "}
                          {stageMatches.length ===
                          1
                            ? "матч"
                            : "матчів"}
                        </div>

                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/60 transition group-open:rotate-180">
                          ↓
                        </div>
                      </div>
                    </summary>

                    <div className="border-t border-white/10 bg-[#050c16] p-4 md:p-6">
                      <div className="grid gap-5 lg:grid-cols-2">
                        {sortedPairs.map(
                          ([
                            slot,
                            pairMatches,
                          ]) => {
                            const sortedPairMatches =
                              [
                                ...pairMatches,
                              ].sort(
                                (
                                  a,
                                  b
                                ) =>
                                  (a.leg ??
                                    0) -
                                  (b.leg ??
                                    0)
                              );

                            return (
                              <div
                                key={`${stage}-${slot}`}
                                className="rounded-2xl border border-white/10 bg-[#07101d] p-4"
                              >
                                {stage !==
                                  "final" && (
                                  <div className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-white/40">
                                    Пара{" "}
                                    {
                                      slot
                                    }
                                  </div>
                                )}

                                <div className="space-y-3">
                                  {sortedPairMatches.map(
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
                                      />
                                    )
                                  )}
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  </details>
                );
              }
            )}
          </div>
        </div>
      </div>
    </section>
  );
}