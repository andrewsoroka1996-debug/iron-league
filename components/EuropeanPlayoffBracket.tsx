import { players } from "../data/players";
import { supabase } from "../lib/supabase";
import { calculateTwoLegSeries } from "../lib/two-leg-series";

type Props = {
  season: 1 | 2 | 3 | 4;

  competition:
    | "champions-league"
    | "europa-league"
    | "conference-league";
};

type Match = {
  id: string;

  stage: string | null;
  leg: number | null;

  home_id: string;
  away_id: string;

  home_goals: number | null;
  away_goals: number | null;

  status: string;

  series_id: string | null;
  series_home_id: string | null;
  series_away_id: string | null;
};

const stages = [
  {
    id: "round-of-16",
    name: "1/8 фіналу",
  },
  {
    id: "quarterfinal",
    name: "1/4 фіналу",
  },
  {
    id: "semifinal",
    name: "1/2 фіналу",
  },
  {
    id: "final",
    name: "Фінал",
  },
] as const;

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

export default async function EuropeanPlayoffBracket({
  season,
  competition,
}: Props) {
  const {
    data,
    error,
  } = await supabase
    .from("matches")
    .select(
      `
        id,
        stage,
        leg,
        home_id,
        away_id,
        home_goals,
        away_goals,
        status,
        series_id,
        series_home_id,
        series_away_id
      `
    )
    .eq(
      "season",
      season
    )
    .eq(
      "competition",
      competition
    )
    .in(
      "stage",
      stages.map(
        (stage) =>
          stage.id
      )
    );

  if (error) {
    return (
      <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-6 text-red-200">
        Не вдалося завантажити
        плей-оф.
      </div>
    );
  }

  const matches =
    (data ?? []) as Match[];

  /*
    Якщо плей-оф ще не внесено,
    просто нічого не показуємо.
  */

  if (matches.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl px-6 pb-16">
      <div className="mb-10">
        <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
          Плей-оф
        </div>

        <h2 className="mt-3 text-3xl font-black">
          Турнірна сітка
        </h2>
      </div>

      <div className="grid gap-6 xl:grid-cols-4">
        {stages.map(
          (stage) => {
            const stageMatches =
              matches.filter(
                (match) =>
                  match.stage ===
                  stage.id
              );

            /*
              Групуємо двоматчеві
              серії по series_id.
            */

            const seriesMap =
              new Map<
                string,
                Match[]
              >();

            const singleMatches:
              Match[] = [];

            for (
              const match of stageMatches
            ) {
              if (
                match.series_id
              ) {
                const current =
                  seriesMap.get(
                    match.series_id
                  ) ?? [];

                current.push(
                  match
                );

                seriesMap.set(
                  match.series_id,
                  current
                );
              } else {
                singleMatches.push(
                  match
                );
              }
            }

            const series =
              Array.from(
                seriesMap.entries()
              );

            return (
              <div
                key={
                  stage.id
                }
                className="space-y-4"
              >
                {/* STAGE HEADER */}

                <div className="rounded-2xl border border-white/10 bg-[#07101d] px-5 py-4">
                  <div className="text-center text-lg font-black text-blue-300">
                    {
                      stage.name
                    }
                  </div>
                </div>

                {/* TWO LEG SERIES */}

                {series.map(
                  ([
                    seriesId,
                    seriesMatches,
                  ]) => {
                    const first =
                      seriesMatches[0];

                    if (
                      !first
                        .series_home_id ||
                      !first
                        .series_away_id
                    ) {
                      return null;
                    }

                    const summary =
                      calculateTwoLegSeries({
                        seriesHomeId:
                          first.series_home_id,

                        seriesAwayId:
                          first.series_away_id,

                        matches:
                          seriesMatches.map(
                            (
                              match
                            ) => ({
                              id:
                                match.id,

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

                              leg:
                                match.leg,
                            })
                          ),
                      });

                    const homeName =
                      getPlayerName(
                        first
                          .series_home_id
                      );

                    const awayName =
                      getPlayerName(
                        first
                          .series_away_id
                      );

                    const homeWinner =
                      summary.winner ===
                      "home";

                    const awayWinner =
                      summary.winner ===
                      "away";

                    return (
                      <div
                        key={
                          seriesId
                        }
                        className="overflow-hidden rounded-2xl border border-white/10 bg-[#07101d]"
                      >
                        <div
                          className={`flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3 ${
                            homeWinner
                              ? "bg-blue-500/10"
                              : ""
                          }`}
                        >
                          <span className="truncate font-bold">
                            {
                              homeName
                            }
                          </span>

                          <span className="font-black">
                            {
                              summary.aggregateHomeGoals
                            }
                          </span>
                        </div>

                        <div
                          className={`flex items-center justify-between gap-3 px-4 py-3 ${
                            awayWinner
                              ? "bg-blue-500/10"
                              : ""
                          }`}
                        >
                          <span className="truncate font-bold">
                            {
                              awayName
                            }
                          </span>

                          <span className="font-black">
                            {
                              summary.aggregateAwayGoals
                            }
                          </span>
                        </div>

                        <div className="border-t border-white/5 px-4 py-2 text-center text-[11px] text-white/30">
                          {
                            summary.matchesPlayed
                          }
                          /2 матчів
                        </div>
                      </div>
                    );
                  }
                )}

                {/* SINGLE MATCHES */}

                {singleMatches.map(
                  (match) => {
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
                        className="overflow-hidden rounded-2xl border border-white/10 bg-[#07101d]"
                      >
                        <div
                          className={`flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3 ${
                            homeWinner
                              ? "bg-blue-500/10"
                              : ""
                          }`}
                        >
                          <span className="truncate font-bold">
                            {getPlayerName(
                              match.home_id
                            )}
                          </span>

                          <span className="font-black">
                            {finished
                              ? match.home_goals
                              : "—"}
                          </span>
                        </div>

                        <div
                          className={`flex items-center justify-between gap-3 px-4 py-3 ${
                            awayWinner
                              ? "bg-blue-500/10"
                              : ""
                          }`}
                        >
                          <span className="truncate font-bold">
                            {getPlayerName(
                              match.away_id
                            )}
                          </span>

                          <span className="font-black">
                            {finished
                              ? match.away_goals
                              : "—"}
                          </span>
                        </div>
                      </div>
                    );
                  }
                )}

                {series.length ===
                  0 &&
                  singleMatches.length ===
                    0 && (
                    <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center text-sm text-white/25">
                      Пари ще не
                      визначені
                    </div>
                  )}
              </div>
            );
          }
        )}
      </div>
    </section>
  );
}