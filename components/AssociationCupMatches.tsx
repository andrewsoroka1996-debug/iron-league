import Link from "next/link";

import { players } from "../data/players";

import {
  getSeasonAssociationSquads,
} from "../lib/association-squads";

import { supabaseAdmin } from "../lib/supabase-admin";

type SeasonNumber =
  | 2
  | 3
  | 4;

type MatchRow = {
  id: string;

  stage: string | null;

  round: number | null;

  home_id: string;

  away_id: string;

  home_goals:
    number | null;

  away_goals:
    number | null;

  status: string;

  series_id:
    string | null;

  series_home_id:
    string | null;

  series_away_id:
    string | null;

  is_tiebreak: boolean;
};

type SeriesGroup = {
  seriesId: string;

  stage: string;

  homeAssociationId:
    string | null;

  awayAssociationId:
    string | null;

  matches: MatchRow[];
};

/*
  ========================================
  STAGES
  ========================================
*/


function getBracketSlot(seriesId: string): number | null {
  const match = /-slot-(\d+)-/.exec(seriesId);
  if (!match) return null;
  const slot = Number(match[1]);
  return Number.isInteger(slot) && slot > 0 ? slot : null;
}

const STAGE_ORDER = [
  "quarterfinal",
  "semifinal",
  "final",
  "third-place",
] as const;

function getStageTitle(
  stage: string
) {
  if (
    stage ===
    "quarterfinal"
  ) {
    return "1/4 фіналу";
  }

  if (
    stage ===
    "semifinal"
  ) {
    return "Півфінал";
  }

  if (
    stage ===
    "final"
  ) {
    return "Фінал";
  }

  if (
    stage ===
    "third-place"
  ) {
    return "Матч за 3 місце";
  }

  return stage;
}

/*
  ========================================
  PLAYER
  ========================================
*/

function getPlayerName(
  playerId: string
) {
  return (
    players.find(
      (player) =>
        player.id ===
        playerId
    )?.nickname ??
    playerId
  );
}

/*
  ========================================
  SCORE
  ========================================
*/

function MatchScore({
  match,
}: {
  match: MatchRow;
}) {
  if (
    match.home_goals ===
      null ||
    match.away_goals ===
      null
  ) {
    return (
      <span className="text-white/25">
        —
      </span>
    );
  }

  return (
    <span className="font-black text-white">
      {match.home_goals}
      {" : "}
      {match.away_goals}
    </span>
  );
}

/*
  ========================================
  COMPONENT
  ========================================
*/

export default async function AssociationCupMatches({
  season,
}: {
  season: SeasonNumber;
}) {
  /*
    ========================================
    LOAD MATCHES
    ========================================
  */

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("matches")
      .select(`
        id,
        stage,
        round,
        home_id,
        away_id,
        home_goals,
        away_goals,
        status,
        series_id,
        series_home_id,
        series_away_id,
        is_tiebreak
      `)
      .eq(
        "season",
        season
      )
      .eq(
        "competition",
        "associations-cup"
      );

  if (error) {
    return (
      <div className="rounded-2xl border border-red-400/20 bg-red-500/[0.05] p-5 text-sm text-red-300">
        Не вдалося
        завантажити матчі
        Кубка асоціацій:
        {" "}
        {error.message}
      </div>
    );
  }

  const matches =
    (data ??
      []) as MatchRow[];

  if (
    matches.length ===
    0
  ) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-white/35">
        Матчів Кубка
        асоціацій у цьому
        сезоні немає.
      </div>
    );
  }

  /*
    ========================================
    ASSOCIATIONS
    ========================================

    Сезони 2–3:
    історичні склади.

    Сезон 4:
    динамічні склади
    з association_seed_ranks.
  */

  const associations =
    await getSeasonAssociationSquads(
      season
    );

  function getAssociationName(
    associationId:
      string | null
  ) {
    if (!associationId) {
      return "Асоціація";
    }

    return (
      associations.find(
        (association) =>
          association.id ===
          associationId
      )?.name ??
      associationId
    );
  }

  /*
    ========================================
    GROUP BY SERIES
    ========================================
  */

  const seriesMap =
    new Map<
      string,
      SeriesGroup
    >();

  for (
    const match of matches
  ) {
    if (
      !match.series_id ||
      !match.stage
    ) {
      continue;
    }

    const current =
      seriesMap.get(
        match.series_id
      );

    if (current) {
      current.matches.push(
        match
      );

      continue;
    }

    seriesMap.set(
      match.series_id,
      {
        seriesId:
          match.series_id,

        stage:
          match.stage,

        homeAssociationId:
          match.series_home_id,

        awayAssociationId:
          match.series_away_id,

        matches: [
          match,
        ],
      }
    );
  }

  const series =
    Array.from(
      seriesMap.values()
    );

  /*
    ========================================
    SORT MATCHES INSIDE SERIES
    ========================================
  */

  for (
    const item of series
  ) {
    item.matches.sort(
      (a, b) => {
        /*
          7-й матч
          ставимо останнім.
        */

        if (
          a.is_tiebreak !==
          b.is_tiebreak
        ) {
          return a.is_tiebreak
            ? 1
            : -1;
        }

        return (
          (a.round ?? 999) -
          (b.round ?? 999)
        );
      }
    );
  }

  return (
    <div className="space-y-14">
      {STAGE_ORDER.map(
        (stage) => {
          const stageSeries =
            series.filter(
              (item) =>
                item.stage ===
                stage
            ).sort((a, b) => {
              const aSlot = getBracketSlot(a.seriesId) ?? 999;
              const bSlot = getBracketSlot(b.seriesId) ?? 999;
              return aSlot - bSlot || a.seriesId.localeCompare(b.seriesId);
            });

          if (
            stageSeries.length ===
            0
          ) {
            return null;
          }

          return (
            <section
              key={stage}
            >
              <div className="mb-6 flex items-center gap-4">
                <h3 className="text-2xl font-black">
                  {
                    getStageTitle(
                      stage
                    )
                  }
                </h3>

                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                {stageSeries.map(
                  (
                    item,
                    seriesIndex
                  ) => (
                    <div
                      key={
                        item.seriesId
                      }
                      className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d]"
                    >
                      {/* SERIES HEADER */}

                      <div className="border-b border-white/10 bg-blue-500/[0.05] px-6 py-5">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
                          Пара №
                          {
                            getBracketSlot(item.seriesId) ?? seriesIndex + 1
                          }
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xl font-black">
                          <span>
                            {getAssociationName(
                              item.homeAssociationId
                            )}
                          </span>

                          <span className="text-blue-400">
                            VS
                          </span>

                          <span>
                            {getAssociationName(
                              item.awayAssociationId
                            )}
                          </span>
                        </div>
                      </div>

                      {/* MATCHES */}

                      <div className="divide-y divide-white/[0.06]">
                        {item.matches.map(
                          (
                            match,
                            index
                          ) => {
                            const rankLabel =
                              match.is_tiebreak
                                ? "7-й"
                                : `R${
                                    match.round ??
                                    index +
                                      1
                                  }`;

                            return (
                              <div
                                key={
                                  match.id
                                }
                                className="grid grid-cols-[50px_1fr_auto_1fr] items-center gap-3 px-5 py-4"
                              >
                                {/* RANK */}

                                <div
                                  className={`text-xs font-black ${
                                    match.is_tiebreak
                                      ? "text-yellow-300"
                                      : "text-blue-300"
                                  }`}
                                >
                                  {
                                    rankLabel
                                  }
                                </div>

                                {/* HOME */}

                                <Link
                                  href={`/players/${match.home_id}`}
                                  className="min-w-0 truncate text-right text-sm font-bold text-white/65 transition hover:text-blue-300"
                                >
                                  {getPlayerName(
                                    match.home_id
                                  )}
                                </Link>

                                {/* SCORE */}

                                <div className="min-w-[64px] rounded-lg border border-white/[0.07] bg-black/20 px-3 py-2 text-center text-sm">
                                  <MatchScore
                                    match={
                                      match
                                    }
                                  />
                                </div>

                                {/* AWAY */}

                                <Link
                                  href={`/players/${match.away_id}`}
                                  className="min-w-0 truncate text-sm font-bold text-white/65 transition hover:text-blue-300"
                                >
                                  {getPlayerName(
                                    match.away_id
                                  )}
                                </Link>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </section>
          );
        }
      )}
    </div>
  );
}