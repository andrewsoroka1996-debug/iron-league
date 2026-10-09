import { players } from "../../data/players";

import { season1 } from "../../data/seasons/season-1";
import { season2 } from "../../data/seasons/season-2";
import { season3 } from "../../data/seasons/season-3";
import { season4 } from "../../data/seasons/season-4";

import { seasonCompetitions } from "../../data/competitions/season-competitions";

import { supabase } from "../../lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SeasonNumber = 1 | 2 | 3 | 4;

type PageProps = {
  searchParams: Promise<{
    season?: string;
    competition?: string;
    status?: string;
    player?: string;
  }>;
};

type Match = {
  id: string;

  season: number;
  competition: string;

  division: number | null;

  stage: string | null;
  group_name: string | null;

  round: number | null;
  leg: number | null;

  participant_type: string;

  home_id: string;
  away_id: string;

  home_goals: number | null;
  away_goals: number | null;

  status: string;

  played_at: string | null;
};

type CoopTeam = {
  id: string;
  name: string;

  player_1_id: string;
  player_2_id: string;
};

type MatchGroup = {
  key: string;

  title: string;

  subtitle: string | null;

  matches: Match[];
};

/*
  ========================================
  ГРАВЕЦЬ
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
  ГРАВЦІ СЕЗОНУ
  ========================================
*/

function getSeasonPlayerIds(
  season: SeasonNumber
) {
  let ids: readonly string[] = [];

  if (season === 1) {
    ids = [
      ...season1.division1.players,
      ...season1.division2.players,
      ...season1.division3.players,
    ];
  }

  if (season === 2) {
    ids = [
      ...season2.division1.players,
      ...season2.division2.players,
      ...season2.division3.players,
      ...season2.division4.players,
    ];
  }

  if (season === 3) {
    ids = [
      ...season3.division1.players,
      ...season3.division2.players,
      ...season3.division3.players,
      ...season3.division4.players,
    ];
  }

  if (season === 4) {
    ids = [
      ...season4.division1.players,
      ...season4.division2.players,
      ...season4.division3.players,
      ...season4.division4.players,
    ];
  }

  return Array.from(
    new Set(ids)
  );
}

/*
  ========================================
  НАЗВА ТУРНІРУ
  ========================================
*/

function getCompetitionName(
  competition: string,
  division: number | null = null
) {
  if (
    competition === "division"
  ) {
    return division
      ? `${division} Дивізіон`
      : "Дивізіони";
  }

  if (
    competition ===
    "season-qualification"
  ) {
    return "Кваліфікація сезону";
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

  const divisionCup =
    competition.match(
      /^division-(\d)-cup$/
    );

  if (divisionCup) {
    return `Кубок ${divisionCup[1]} Дивізіону`;
  }

  return competition;
}

function getTournamentName(
  match: Match
) {
  return getCompetitionName(
    match.competition,
    match.division
  );
}

/*
  ========================================
  СТАДІЯ
  ========================================
*/

function getStageName(
  stage: string | null
) {
  if (!stage) {
    return null;
  }

  if (
    stage === "qualification"
  ) {
    return "Кваліфікація";
  }

  if (
    stage === "group"
  ) {
    return "Груповий етап";
  }

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

  if (
    stage === "third-place"
  ) {
    return "Матч за 3 місце";
  }

  return stage;
}

/*
  ========================================
  СТАТУС
  ========================================
*/

function getStatusName(
  status: string
) {
  if (
    status === "finished"
  ) {
    return "Завершено";
  }

  if (
    status === "scheduled"
  ) {
    return "Заплановано";
  }

  return status;
}

/*
  ========================================
  ПОРЯДОК СТАДІЙ
  ========================================
*/

function getStageOrder(
  stage: string | null
) {
  if (
    stage === "qualification"
  ) {
    return 1;
  }

  if (
    stage === "group"
  ) {
    return 2;
  }

  if (
    stage === "round-of-16"
  ) {
    return 3;
  }

  if (
    stage === "quarterfinal"
  ) {
    return 4;
  }

  if (
    stage === "semifinal"
  ) {
    return 5;
  }

  if (
    stage === "third-place"
  ) {
    return 6;
  }

  if (
    stage === "final"
  ) {
    return 7;
  }

  return 99;
}

/*
  ========================================
  ГРУПУВАННЯ
  ========================================
*/

function groupMatches(
  matches: Match[]
): MatchGroup[] {
  const groups =
    new Map<
      string,
      MatchGroup
    >();

  const sortedMatches =
    [...matches].sort(
      (a, b) => {
        /*
          Дивізіони
        */

        if (
          a.competition ===
            "division" &&
          b.competition ===
            "division"
        ) {
          const divisionCompare =
            (a.division ?? 99) -
            (b.division ?? 99);

          if (
            divisionCompare !== 0
          ) {
            return divisionCompare;
          }

          return (
            (a.round ?? 999) -
            (b.round ?? 999)
          );
        }

        /*
          Один турнір
        */

        if (
          a.competition ===
          b.competition
        ) {
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

          if (
            a.group_name &&
            b.group_name
          ) {
            const groupCompare =
              a.group_name.localeCompare(
                b.group_name,
                "uk"
              );

            if (
              groupCompare !== 0
            ) {
              return groupCompare;
            }
          }

          if (
            (a.round ?? 999) !==
            (b.round ?? 999)
          ) {
            return (
              (a.round ?? 999) -
              (b.round ?? 999)
            );
          }

          return (
            (a.leg ?? 999) -
            (b.leg ?? 999)
          );
        }

        return a.competition.localeCompare(
          b.competition,
          "uk"
        );
      }
    );

  for (
    const match of sortedMatches
  ) {
    let key = "";

    let title = "";

    let subtitle:
      | string
      | null = null;

    /*
      ========================================
      ДИВІЗІОНИ
      ========================================
    */

    if (
      match.competition ===
      "division"
    ) {
      key =
        `division-${match.division ?? "x"}-round-${match.round ?? "x"}`;

      title =
        match.division
          ? `${match.division} Дивізіон`
          : "Дивізіон";

      subtitle =
        match.round
          ? `${match.round} тур`
          : "Тур не вказано";
    }

    /*
      ========================================
      ГРУПОВИЙ ЕТАП
      ========================================
    */

    else if (
      match.stage === "group"
    ) {
      key =
        `${match.competition}-group-${match.group_name ?? "all"}`;

      title =
        getTournamentName(
          match
        );

      subtitle =
        match.group_name
          ? `Груповий етап • Група ${match.group_name}`
          : "Груповий етап";
    }

    /*
      ========================================
      ІНШІ СТАДІЇ
      ========================================
    */

    else {
      key =
        `${match.competition}-stage-${match.stage ?? "matches"}`;

      title =
        getTournamentName(
          match
        );

      subtitle =
        getStageName(
          match.stage
        ) ?? "Матчі";
    }

    const existing =
      groups.get(key);

    if (existing) {
      existing.matches.push(
        match
      );
    } else {
      groups.set(
        key,
        {
          key,
          title,
          subtitle,
          matches: [match],
        }
      );
    }
  }

  return Array.from(
    groups.values()
  );
}

/*
  ========================================
  ДЕТАЛІ МАТЧУ
  ========================================
*/

function getMatchDetails(
  match: Match
) {
  const parts: string[] = [];

  /*
    У дивізіонах тур уже
    показаний у заголовку блоку.
  */

  if (
    match.competition !==
      "division" &&
    match.stage === "group" &&
    match.round
  ) {
    parts.push(
      `${match.round} тур`
    );
  }

  /*
    Плей-оф
  */

  if (
    match.competition !==
      "division" &&
    match.stage !== "group" &&
    match.round
  ) {
    parts.push(
      `Пара №${match.round}`
    );
  }

  /*
    Матч серії
  */

  if (
    match.leg === 1 &&
    match.stage !== "group"
  ) {
    parts.push(
      "1-й матч"
    );
  }

  if (
    match.leg === 2
  ) {
    parts.push(
      "2-й матч"
    );
  }

  return parts.join(
    " • "
  );
}

/*
  ========================================
  PAGE
  ========================================
*/

export default async function MatchesPage({
  searchParams,
}: PageProps) {
  const params =
    await searchParams;

  /*
    ========================================
    СЕЗОН
    ========================================
  */

  const requestedSeason =
    Number(
      params.season
    );

  const season: SeasonNumber =
    requestedSeason >= 1 &&
    requestedSeason <= 4
      ? (
          requestedSeason as SeasonNumber
        )
      : 3;

  /*
    ========================================
    ФІЛЬТРИ
    ========================================
  */

  const competitionFilter =
    params.competition ?? "";

  const requestedStatus =
    params.status ?? "";

  const statusFilter =
    requestedStatus ===
      "finished" ||
    requestedStatus ===
      "scheduled"
      ? requestedStatus
      : "";

  const playerFilter =
    params.player ?? "";

  /*
    ========================================
    ОКРЕМІ ДИВІЗІОНИ
    ========================================
  */

  const divisionOptions =
    season === 1
      ? [
          {
            value:
              "division-1",

            label:
              "1 Дивізіон",
          },

          {
            value:
              "division-2",

            label:
              "2 Дивізіон",
          },

          {
            value:
              "division-3",

            label:
              "3 Дивізіон",
          },
        ]
      : [
          {
            value:
              "division-1",

            label:
              "1 Дивізіон",
          },

          {
            value:
              "division-2",

            label:
              "2 Дивізіон",
          },

          {
            value:
              "division-3",

            label:
              "3 Дивізіон",
          },

          {
            value:
              "division-4",

            label:
              "4 Дивізіон",
          },
        ];

  /*
    ========================================
    ІНШІ ТУРНІРИ
    ========================================
  */

  const internalDivisionIds =
    new Set([
      "division-1",
      "division-2",
      "division-3",
      "division-4",
    ]);

  const otherCompetitionIds =
    Array.from(
      new Set(
        seasonCompetitions[
          season
        ]
          .map(
            (competition) =>
              competition.id
          )
          .filter(
            (competitionId) =>
              !internalDivisionIds.has(
                competitionId
              )
          )
      )
    );

  /*
    ========================================
    АКТИВНИЙ ДИВІЗІОН
    ========================================
  */

  const divisionFilterMatch =
    competitionFilter.match(
      /^division-([1-4])$/
    );

  /*
    ========================================
    ГРАВЦІ СЕЗОНУ
    ========================================
  */

  const seasonPlayerIds =
    getSeasonPlayerIds(
      season
    );

  const seasonPlayers =
    seasonPlayerIds
      .map((id) =>
        players.find(
          (player) =>
            player.id === id
        )
      )
      .filter(
        (
          player
        ): player is (typeof players)[number] =>
          player !== undefined
      )
      .sort(
        (a, b) =>
          a.nickname.localeCompare(
            b.nickname,
            "uk"
          )
      );

  /*
    ========================================
    MATCH QUERY
    ========================================
  */

  let matchesQuery =
    supabase
      .from("matches")
      .select(
        `
          id,
          season,
          competition,
          division,
          stage,
          group_name,
          round,
          leg,
          participant_type,
          home_id,
          away_id,
          home_goals,
          away_goals,
          status,
          played_at
        `
      )
      .eq(
        "season",
        season
      );

  /*
    ========================================
    ТУРНІР / ДИВІЗІОН
    ========================================
  */

  if (
    divisionFilterMatch
  ) {
    const selectedDivision =
      Number(
        divisionFilterMatch[1]
      );

    matchesQuery =
      matchesQuery
        .eq(
          "competition",
          "division"
        )
        .eq(
          "division",
          selectedDivision
        );
  } else if (
    competitionFilter
  ) {
    matchesQuery =
      matchesQuery.eq(
        "competition",
        competitionFilter
      );
  }

  /*
    ========================================
    СТАТУС
    ========================================
  */

  if (
    statusFilter
  ) {
    matchesQuery =
      matchesQuery.eq(
        "status",
        statusFilter
      );
  }

  /*
    ========================================
    LOAD
    ========================================
  */

  const [
    matchesResult,
    coopTeamsResult,
  ] = await Promise.all([
    matchesQuery,

    supabase
      .from("coop_teams")
      .select(
        `
          id,
          name,
          player_1_id,
          player_2_id
        `
      )
      .eq(
        "season",
        season
      ),
  ]);

  if (
    matchesResult.error
  ) {
    console.error(
      "MATCHES PAGE ERROR:",
      matchesResult.error
    );
  }

  if (
    coopTeamsResult.error
  ) {
    console.error(
      "MATCHES COOP TEAMS ERROR:",
      coopTeamsResult.error
    );
  }

  const allMatches =
    (
      matchesResult.data ??
      []
    ) as Match[];

  const coopTeams =
    (
      coopTeamsResult.data ??
      []
    ) as CoopTeam[];

  /*
    ========================================
    ФІЛЬТР ЗА ГРАВЦЕМ
    ========================================
  */

  const matches =
    playerFilter
      ? allMatches.filter(
          (match) => {
            /*
              Звичайні матчі
            */

            if (
              match.participant_type !==
              "team"
            ) {
              return (
                match.home_id ===
                  playerFilter ||
                match.away_id ===
                  playerFilter
              );
            }

            /*
              Iron Co-op Cup
            */

            const homeTeam =
              coopTeams.find(
                (team) =>
                  team.id ===
                    match.home_id ||
                  team.name ===
                    match.home_id
              );

            const awayTeam =
              coopTeams.find(
                (team) =>
                  team.id ===
                    match.away_id ||
                  team.name ===
                    match.away_id
              );

            const homeHasPlayer =
              Boolean(
                homeTeam &&
                  (
                    homeTeam.player_1_id ===
                      playerFilter ||
                    homeTeam.player_2_id ===
                      playerFilter
                  )
              );

            const awayHasPlayer =
              Boolean(
                awayTeam &&
                  (
                    awayTeam.player_1_id ===
                      playerFilter ||
                    awayTeam.player_2_id ===
                      playerFilter
                  )
              );

            return (
              homeHasPlayer ||
              awayHasPlayer
            );
          }
        )
      : allMatches;

  /*
    ========================================
    ГРУПИ
    ========================================
  */

  const matchGroups =
    groupMatches(
      matches
    );

  /*
    ========================================
    УЧАСНИК
    ========================================
  */

  function getParticipantName(
    id: string,
    type: string
  ) {
    if (
      type === "team"
    ) {
      return (
        coopTeams.find(
          (team) =>
            team.id === id ||
            team.name === id
        )?.name ?? id
      );
    }

    return getPlayerName(
      id
    );
  }

  /*
    ========================================
    АКТИВНІ ФІЛЬТРИ
    ========================================
  */

  const filtersActive =
    Boolean(
      competitionFilter ||
        statusFilter ||
        playerFilter
    );

  /*
    ========================================
    НАЗВА АКТИВНОГО ТУРНІРУ
    ========================================
  */

  const activeCompetitionName =
    divisionFilterMatch
      ? `${divisionFilterMatch[1]} Дивізіон`
      : competitionFilter
        ? getCompetitionName(
            competitionFilter
          )
        : null;

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

              <div className="text-xs text-white/35">
                Матч-центр
              </div>
            </div>
          </a>

          <a
            href="/"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white/60 transition hover:bg-white/[0.05] hover:text-white"
          >
            ← Головна
          </a>
        </div>
      </header>

      {/* HERO */}

      <section className="border-b border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Iron League
          </div>

          <h1 className="mt-3 text-5xl font-black">
            Матчі
          </h1>

          <p className="mt-4 max-w-2xl leading-7 text-white/40">
            Календар, результати та
            матчі всіх турнірів Iron
            League.
          </p>

          {/* SEASONS */}

          <div className="mt-8 flex flex-wrap gap-3">
            {[1, 2, 3, 4].map(
              (item) => (
                <a
                  key={item}
                  href={`/matches?season=${item}`}
                  className={`rounded-xl border px-5 py-2.5 text-sm font-black transition ${
                    season === item
                      ? "border-blue-400/40 bg-blue-500/15 text-blue-300"
                      : "border-white/10 bg-white/[0.03] text-white/45 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  Сезон {item}
                </a>
              )
            )}
          </div>
        </div>
      </section>

      {/* FILTERS */}

      <section className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <form
            action="/matches"
            method="get"
            className="grid gap-5 rounded-3xl border border-white/10 bg-[#07101d] p-6 lg:grid-cols-[1fr_1fr_1fr_auto]"
          >
            <input
              type="hidden"
              name="season"
              value={season}
            />

            {/* COMPETITION */}

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.2em] text-white/35">
                Турнір
              </label>

              <select
                name="competition"
                defaultValue={
                  competitionFilter
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3 font-semibold text-white outline-none transition focus:border-blue-400/40"
              >
                <option value="">
                  Усі турніри
                </option>

                <optgroup label="Дивізіони">
                  {divisionOptions.map(
                    (option) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {
                          option.label
                        }
                      </option>
                    )
                  )}
                </optgroup>

                {otherCompetitionIds.length >
                  0 && (
                  <optgroup label="Інші турніри">
                    {otherCompetitionIds.map(
                      (
                        competition
                      ) => (
                        <option
                          key={
                            competition
                          }
                          value={
                            competition
                          }
                        >
                          {getCompetitionName(
                            competition
                          )}
                        </option>
                      )
                    )}
                  </optgroup>
                )}
              </select>
            </div>

            {/* STATUS */}

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.2em] text-white/35">
                Статус
              </label>

              <select
                name="status"
                defaultValue={
                  statusFilter
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3 font-semibold text-white outline-none transition focus:border-blue-400/40"
              >
                <option value="">
                  Усі матчі
                </option>

                <option value="scheduled">
                  Заплановані
                </option>

                <option value="finished">
                  Завершені
                </option>
              </select>
            </div>

            {/* PLAYER */}

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.2em] text-white/35">
                Гравець
              </label>

              <select
                name="player"
                defaultValue={
                  playerFilter
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3 font-semibold text-white outline-none transition focus:border-blue-400/40"
              >
                <option value="">
                  Усі гравці
                </option>

                {seasonPlayers.map(
                  (player) => (
                    <option
                      key={
                        player.id
                      }
                      value={
                        player.id
                      }
                    >
                      {
                        player.nickname
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            {/* BUTTONS */}

            <div className="flex items-end gap-3">
              <button
                type="submit"
                className="rounded-xl bg-blue-500 px-6 py-3 font-black transition hover:bg-blue-400"
              >
                Застосувати
              </button>

              {filtersActive && (
                <a
                  href={`/matches?season=${season}`}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 font-bold text-white/50 transition hover:bg-white/[0.07] hover:text-white"
                >
                  Скинути
                </a>
              )}
            </div>
          </form>
        </div>
      </section>

      {/* MATCHES */}

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
              Матч-центр
            </div>

            <h2 className="mt-3 text-3xl font-black">
              Сезон {season}
            </h2>

            {filtersActive && (
              <div className="mt-3 flex flex-wrap gap-2">
                {activeCompetitionName && (
                  <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-300">
                    {
                      activeCompetitionName
                    }
                  </span>
                )}

                {statusFilter && (
                  <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-300">
                    {statusFilter ===
                    "finished"
                      ? "Завершені"
                      : "Заплановані"}
                  </span>
                )}

                {playerFilter && (
                  <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-300">
                    {getPlayerName(
                      playerFilter
                    )}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="text-right text-sm text-white/35">
            <div>
              Матчів:{" "}
              <span className="font-black text-white">
                {matches.length}
              </span>
            </div>

            {matches.length > 0 && (
              <div className="mt-1">
                Блоків:{" "}
                <span className="font-black text-white">
                  {
                    matchGroups.length
                  }
                </span>
              </div>
            )}
          </div>
        </div>

        {/* EMPTY */}

        {matches.length === 0 ? (
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] px-8 py-16 text-center">
            <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[90px]" />

            <div className="relative">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-2xl font-black text-blue-300">
                VS
              </div>

              <h3 className="mt-6 text-2xl font-black">
                {filtersActive
                  ? "Матчів за цими фільтрами немає"
                  : "Матчів поки немає"}
              </h3>

              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/40">
                {filtersActive
                  ? "Зміни параметри фільтра або переглянь усі матчі цього сезону."
                  : "Після створення матчів цього сезону вони автоматично з’являться у Матч-центрі."}
              </p>

              {filtersActive && (
                <a
                  href={`/matches?season=${season}`}
                  className="mt-7 inline-flex rounded-xl bg-blue-500 px-6 py-3 font-black transition hover:bg-blue-400"
                >
                  Показати всі матчі
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-10">
            {matchGroups.map(
              (group) => (
                <section
                  key={group.key}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d]"
                >
                  {/* GROUP HEADER */}

                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-white/[0.025] px-6 py-5">
                    <div>
                      <div className="text-xl font-black">
                        {
                          group.title
                        }
                      </div>

                      {group.subtitle && (
                        <div className="mt-1 text-sm font-semibold text-blue-300">
                          {
                            group.subtitle
                          }
                        </div>
                      )}
                    </div>

                    <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs font-bold text-white/35">
                      {
                        group.matches
                          .length
                      }{" "}
                      матчів
                    </div>
                  </div>

                  {/* GROUP MATCHES */}

                  <div className="divide-y divide-white/5">
                    {group.matches.map(
                      (match) => {
                        const finished =
                          match.status ===
                            "finished" &&
                          match.home_goals !==
                            null &&
                          match.away_goals !==
                            null;

                        const details =
                          getMatchDetails(
                            match
                          );

                        return (
                          <article
                            key={
                              match.id
                            }
                            className="px-6 py-5 transition hover:bg-white/[0.025]"
                          >
                            <div className="grid items-center gap-5 lg:grid-cols-[150px_1fr_auto_1fr_150px]">
                              {/* DETAILS */}

                              <div>
                                {details ? (
                                  <div className="text-xs font-semibold text-white/35">
                                    {
                                      details
                                    }
                                  </div>
                                ) : (
                                  <div className="text-xs font-semibold text-white/20">
                                    Iron League
                                  </div>
                                )}
                              </div>

                              {/* HOME */}

                              <div className="text-right text-lg font-black">
                                {getParticipantName(
                                  match.home_id,
                                  match.participant_type
                                )}
                              </div>

                              {/* SCORE */}

                              <div className="min-w-[90px] text-center">
                                {finished ? (
                                  <div className="rounded-xl bg-blue-500/15 px-4 py-2 text-2xl font-black text-blue-300">
                                    {
                                      match.home_goals
                                    }
                                    {" : "}
                                    {
                                      match.away_goals
                                    }
                                  </div>
                                ) : (
                                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xl font-black text-white/35">
                                    VS
                                  </div>
                                )}
                              </div>

                              {/* AWAY */}

                              <div className="text-lg font-black">
                                {getParticipantName(
                                  match.away_id,
                                  match.participant_type
                                )}
                              </div>

                              {/* STATUS */}

                              <div className="text-right">
                                <span
                                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                                    finished
                                      ? "border-green-400/20 bg-green-500/10 text-green-300"
                                      : "border-blue-400/20 bg-blue-500/10 text-blue-300"
                                  }`}
                                >
                                  {getStatusName(
                                    match.status
                                  )}
                                </span>
                              </div>
                            </div>
                          </article>
                        );
                      }
                    )}
                  </div>
                </section>
              )
            )}
          </div>
        )}
      </section>

      {/* FOOTER */}

      <footer className="border-t border-white/10 bg-[#02050b]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
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