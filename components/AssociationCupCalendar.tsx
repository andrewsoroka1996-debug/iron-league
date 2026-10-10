"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { players } from "../data/players";

type SeasonNumber = 2 | 3;

type Stage =
  | "quarterfinal"
  | "semifinal"
  | "final"
  | "third-place";

type SeriesMeta = {
  series_id: string;

  bracket_slot:
    | number
    | null;

  home_id:
    | string
    | null;

  home_name: string;

  away_id:
    | string
    | null;

  away_name: string;

  complete: boolean;

  winner_id:
    | string
    | null;

  winner_name:
    | string
    | null;

  status: string;
};

type PlayoffResponse = {
  success?: boolean;

  series?: SeriesMeta[];

  error?: string;
};

type SeriesMatch = {
  id: string;

  round:
    | number
    | null;

  home_id: string;

  away_id: string;

  home_goals:
    | number
    | null;

  away_goals:
    | number
    | null;

  status: string;

  is_tiebreak: boolean;
};

type SeriesSide = {
  points: number;

  goalsFor: number;

  goalsAgainst: number;

  goalDifference: number;

  wins: number;

  draws: number;

  losses: number;
};

type SeriesSummary = {
  regularMatchesPlayed: number;

  home: SeriesSide;

  away: SeriesSide;

  regularComplete: boolean;

  winner:
    | "home"
    | "away"
    | null;

  needsTiebreak: boolean;

  status: string;
};

type SeriesResponse = {
  success?: boolean;

  series: {
    id: string;

    season: number;

    stage:
      | string
      | null;

    home: {
      id: string;

      name: string;
    };

    away: {
      id: string;

      name: string;
    };
  };

  matches: SeriesMatch[];

  summary: SeriesSummary;

  error?: string;
};

type CalendarSeries = {
  stage: Stage;

  bracketSlot:
    | number
    | null;

  detail: SeriesResponse;
};

type Props = {
  season: SeasonNumber;
};

const stageNames: Record<
  Stage,
  string
> = {
  quarterfinal:
    "Quarterfinals",

  semifinal:
    "Semifinals",

  final:
    "Final",

  "third-place":
    "Third Place",
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

function formatGoalDifference(
  value: number
) {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

function SeriesCard({
  item,
}: {
  item: CalendarSeries;
}) {
  const {
    detail,
    bracketSlot,
  } = item;

  const {
    series,
    matches,
    summary,
  } = detail;

  const orderedMatches = [
    ...matches,
  ].sort((a, b) => {
    if (
      a.is_tiebreak !==
      b.is_tiebreak
    ) {
      return a.is_tiebreak
        ? 1
        : -1;
    }

    return (
      (a.round ?? 99) -
      (b.round ?? 99)
    );
  });

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d]">
      {/* HEADER */}

      <div className="border-b border-white/10 bg-white/[0.025] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            {bracketSlot !==
              null && (
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
                Matchup #
                {bracketSlot}
              </div>
            )}

            <div className="mt-2 text-2xl font-black">
              {
                series.home
                  .name
              }
              {" — "}
              {
                series.away
                  .name
              }
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#030711] px-5 py-3 text-center">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-white/30">
              Points
            </div>

            <div className="mt-1 text-xl font-black">
              {
                summary.home
                  .points
              }
              {" : "}
              {
                summary.away
                  .points
              }
            </div>
          </div>
        </div>

        {/* SERIES STATS */}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/[0.06] bg-[#030711] px-4 py-3">
            <div className="font-black">
              {
                series.home
                  .name
              }
            </div>

            <div className="mt-1 text-sm text-white/40">
              Goals{" "}
              {
                summary.home
                  .goalsFor
              }
              :
              {
                summary.home
                  .goalsAgainst
              }
              {" · "}
              GD{" "}
              {formatGoalDifference(
                summary.home
                  .goalDifference
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-[#030711] px-4 py-3 sm:text-right">
            <div className="font-black">
              {
                series.away
                  .name
              }
            </div>

            <div className="mt-1 text-sm text-white/40">
              Goals{" "}
              {
                summary.away
                  .goalsFor
              }
              :
              {
                summary.away
                  .goalsAgainst
              }
              {" · "}
              GD{" "}
              {formatGoalDifference(
                summary.away
                  .goalDifference
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MATCHES */}

      <div className="divide-y divide-white/[0.06]">
        {orderedMatches.map(
          (
            match,
            index
          ) => {
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
              <div
                key={
                  match.id
                }
                className="grid items-center gap-3 px-5 py-4 sm:grid-cols-[40px_1fr_auto_1fr]"
              >
                <div className="text-xs font-black text-white/25">
                  {match.is_tiebreak
                    ? "TB"
                    : `R${
                        match.round ??
                        index +
                          1
                      }`}
                </div>

                <div
                  className={`min-w-0 font-bold ${
                    homeWinner
                      ? "text-white"
                      : "text-white/65"
                  }`}
                >
                  {getPlayerName(
                    match.home_id
                  )}
                </div>

                <div className="min-w-[72px] rounded-lg border border-white/10 bg-[#030711] px-3 py-2 text-center font-black">
                  {finished
                    ? `${match.home_goals} : ${match.away_goals}`
                    : "— : —"}
                </div>

                <div
                  className={`min-w-0 font-bold sm:text-right ${
                    awayWinner
                      ? "text-white"
                      : "text-white/65"
                  }`}
                >
                  {getPlayerName(
                    match.away_id
                  )}
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}

export default function AssociationCupCalendar({
  season,
}: Props) {
  const [
    calendar,
    setCalendar,
  ] = useState<
    CalendarSeries[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      setError("");

      try {
        const stages: Stage[] =
          season === 2
            ? [
                "quarterfinal",
                "semifinal",
                "final",
                "third-place",
              ]
            : [
                "quarterfinal",
                "semifinal",
                "final",
              ];

        const playoffResults =
          await Promise.all(
            stages.map(
              async (
                stage
              ) => {
                const params =
                  new URLSearchParams();

                params.set(
                  "season",
                  String(
                    season
                  )
                );

                params.set(
                  "stage",
                  stage
                );

                const response =
                  await fetch(
                    `/api/admin/association-playoff?${params.toString()}`,
                    {
                      cache:
                        "no-store",
                    }
                  );

                const result =
                  (await response.json()) as PlayoffResponse;

                if (
                  !response.ok
                ) {
                  throw new Error(
                    result.error ??
                      "Could not load Association Cup"
                  );
                }

                return {
                  stage,

                  series:
                    result.series ??
                    [],
                };
              }
            )
          );

        const seriesToLoad =
          playoffResults.flatMap(
            ({
              stage,
              series,
            }) =>
              series.map(
                (
                  item
                ) => ({
                  stage,

                  item,
                })
              )
          );

        const details =
          await Promise.all(
            seriesToLoad.map(
              async ({
                stage,
                item,
              }) => {
                const params =
                  new URLSearchParams();

                params.set(
                  "season",
                  String(
                    season
                  )
                );

                params.set(
                  "series_id",
                  item.series_id
                );

                const response =
                  await fetch(
                    `/api/admin/association-series?${params.toString()}`,
                    {
                      cache:
                        "no-store",
                    }
                  );

                const result =
                  (await response.json()) as SeriesResponse;

                if (
                  !response.ok
                ) {
                  throw new Error(
                    result.error ??
                      "Could not load matchup"
                  );
                }

                return {
                  stage,

                  bracketSlot:
                    item.bracket_slot,

                  detail:
                    result,
                } satisfies CalendarSeries;
              }
            )
          );

        if (cancelled) {
          return;
        }

        setCalendar(
          details
        );
      } catch (
        loadError
      ) {
        if (
          cancelled
        ) {
          return;
        }

        setError(
          loadError instanceof
            Error
            ? loadError.message
            : "Could not load match calendar"
        );
      } finally {
        if (
          !cancelled
        ) {
          setLoading(
            false
          );
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [season]);

  const grouped =
    useMemo(() => {
      const map: Record<
        Stage,
        CalendarSeries[]
      > = {
        quarterfinal:
          [],

        semifinal:
          [],

        final: [],

        "third-place":
          [],
      };

      for (
        const item of calendar
      ) {
        map[
          item.stage
        ].push(item);
      }

      for (
        const stage of Object.keys(
          map
        ) as Stage[]
      ) {
        map[stage].sort(
          (a, b) =>
            (a.bracketSlot ??
              99) -
            (b.bracketSlot ??
              99)
        );
      }

      return map;
    }, [calendar]);

  if (loading) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 text-white/40">
          Loading match
          calendar...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-red-200">
          {error}
        </div>
      </section>
    );
  }

  if (
    calendar.length === 0
  ) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 text-white/40">
          No matches
          available yet.
        </div>
      </section>
    );
  }

  const visibleStages: Stage[] =
    season === 2
      ? [
          "quarterfinal",
          "semifinal",
          "final",
          "third-place",
        ]
      : [
          "quarterfinal",
          "semifinal",
          "final",
        ];

  return (
    <section className="border-y border-white/10 bg-white/[0.015]">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
          Association Cup
        </div>

        <h2 className="mt-3 text-4xl font-black">
          Match Calendar
        </h2>

        <p className="mt-3 max-w-3xl leading-7 text-white/40">
          All individual
          matches inside each
          Association Cup
          matchup.
        </p>

        <div className="mt-12 space-y-14">
          {visibleStages.map(
            (stage) => {
              const items =
                grouped[
                  stage
                ];

              if (
                items.length ===
                0
              ) {
                return null;
              }

              return (
                <div
                  key={
                    stage
                  }
                >
                  <div className="mb-6 flex items-center gap-4">
                    <h3 className="text-2xl font-black">
                      {
                        stageNames[
                          stage
                        ]
                      }
                    </h3>

                    <div className="h-px flex-1 bg-white/10" />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    {items.map(
                      (
                        item
                      ) => (
                        <SeriesCard
                          key={
                            item
                              .detail
                              .series
                              .id
                          }
                          item={
                            item
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
    </section>
  );
}