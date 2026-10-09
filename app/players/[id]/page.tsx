import { notFound } from "next/navigation";

import { players } from "../../../data/players";

import { season1 } from "../../../data/seasons/season-1";
import { season2 } from "../../../data/seasons/season-2";
import { season3 } from "../../../data/seasons/season-3";
import { season4 } from "../../../data/seasons/season-4";

import {
  seasonCompetitions,
  type SeasonNumber,
} from "../../../data/competitions/season-competitions";

import { getCompetitionPlayers } from "../../../data/competitions/get-competition-players";
import { getCompetitionGroups } from "../../../data/competitions/get-competition-groups";
import { getCompetitionAssociations } from "../../../data/competitions/get-competition-associations";

import { supabase } from "../../../lib/supabase";

import {
  getPlayerHonours,
  type PlayerHonour,
} from "../../../lib/player-honours";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DivisionNumber =
  | 1
  | 2
  | 3
  | 4;

type PageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    season?: string;
  }>;
};

type PlayerStatsMatch = {
  id: string;

  season: number;

  competition: string;

  division: number | null;

  participant_type: string;

  home_id: string;
  away_id: string;

  home_goals: number | null;
  away_goals: number | null;

  status: string;

  played_at: string | null;
};

type CoopTeamRow = {
  id: string;
  name: string;

  season: number;

  player_1_id: string;
  player_2_id: string;
};

type CareerStats = {
  matches: number;

  wins: number;
  draws: number;
  losses: number;

  goalsFor: number;
  goalsAgainst: number;

  goalDifference: number;
};

type CompetitionCard = {
  key: string;

  eyebrow: string;

  title: string;

  subtitle?: string | null;
};

/*
  ========================================
  СКЛАДИ ДИВІЗІОНІВ
  ========================================
*/

function getDivisionPlayerIds(
  season: SeasonNumber,
  division: DivisionNumber
): readonly string[] {
  if (season === 1) {
    if (division === 1) {
      return season1.division1.players;
    }

    if (division === 2) {
      return season1.division2.players;
    }

    if (division === 3) {
      return season1.division3.players;
    }

    return [];
  }

  if (season === 2) {
    if (division === 1) {
      return season2.division1.players;
    }

    if (division === 2) {
      return season2.division2.players;
    }

    if (division === 3) {
      return season2.division3.players;
    }

    return season2.division4.players;
  }

  if (season === 3) {
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

  if (division === 1) {
    return season4.division1.players;
  }

  if (division === 2) {
    return season4.division2.players;
  }

  if (division === 3) {
    return season4.division3.players;
  }

  return season4.division4.players;
}

/*
  ========================================
  ДОСТУПНІ ДИВІЗІОНИ
  ========================================
*/

function getAvailableDivisions(
  season: SeasonNumber
): DivisionNumber[] {
  if (season === 1) {
    return [
      1,
      2,
      3,
    ];
  }

  return [
    1,
    2,
    3,
    4,
  ];
}

/*
  ========================================
  ДИВІЗІОН ГРАВЦЯ
  ========================================
*/

function getPlayerDivision(
  season: SeasonNumber,
  playerId: string
): DivisionNumber | null {
  const divisions =
    getAvailableDivisions(
      season
    );

  for (
    const division of divisions
  ) {
    if (
      getDivisionPlayerIds(
        season,
        division
      ).includes(
        playerId
      )
    ) {
      return division;
    }
  }

  return null;
}

/*
  ========================================
  БЕЗПЕЧНІ ТУРНІРНІ ДАНІ
  ========================================
*/

function getSafeCompetitionPlayers(
  season: SeasonNumber,
  competition: string,
  groupName: string | null = null
): readonly string[] {
  try {
    return (
      getCompetitionPlayers({
        season,
        competition,
        groupName,
      }) ?? []
    );
  } catch {
    return [];
  }
}

function getSafeGroups(
  season: SeasonNumber,
  competition: string
): string[] {
  try {
    return (
      getCompetitionGroups({
        season,
        competition,
      }) ?? []
    );
  } catch {
    return [];
  }
}

/*
  ========================================
  ГРУПА ГРАВЦЯ
  ========================================
*/

function getPlayerGroup(
  season: SeasonNumber,
  competition: string,
  playerId: string
) {
  const groups =
    getSafeGroups(
      season,
      competition
    );

  for (
    const group of groups
  ) {
    const groupPlayers =
      getSafeCompetitionPlayers(
        season,
        competition,
        group
      );

    if (
      groupPlayers.includes(
        playerId
      )
    ) {
      return group;
    }
  }

  return null;
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
    competition ===
    "division"
  ) {
    return division
      ? `${division} Дивізіон`
      : "Дивізіони";
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

  if (
    competition ===
    "season-qualification"
  ) {
    return "Кваліфікація сезону";
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

/*
  ========================================
  ТИП ТУРНІРУ
  ========================================
*/

function getCompetitionEyebrow(
  competition: string
) {
  if (
    competition ===
      "champions-league" ||
    competition ===
      "europa-league" ||
    competition ===
      "conference-league"
  ) {
    return "Єврокубок";
  }

  if (
    /^division-\d-cup$/.test(
      competition
    )
  ) {
    return "Кубок";
  }

  if (
    competition ===
    "european-super-cup"
  ) {
    return "Суперкубок";
  }

  if (
    competition ===
    "associations-cup"
  ) {
    return "Кубок";
  }

  if (
    competition ===
    "iron-coop-cup"
  ) {
    return "Командний турнір";
  }

  if (
    competition ===
    "season-qualification"
  ) {
    return "Кваліфікація";
  }

  return "Турнір";
}

/*
  ========================================
  КАТЕГОРІЯ ТРОФЕЮ
  ========================================
*/

function getHonourCategoryName(
  honour: PlayerHonour
) {
  if (
    honour.category ===
    "division"
  ) {
    return "Чемпіонат";
  }

  if (
    honour.category ===
    "cup"
  ) {
    return "Кубок";
  }

  if (
    honour.category ===
    "europe"
  ) {
    return "Єврокубок";
  }

  if (
    honour.category ===
    "super-cup"
  ) {
    return "Суперкубок";
  }

  if (
    honour.category ===
    "association"
  ) {
    return "Асоціації";
  }

  if (
    honour.category ===
    "coop"
  ) {
    return "Co-op";
  }

  return "Трофей";
}

/*
  ========================================
  НІКНЕЙМ
  ========================================
*/

function getPlayerName(
  playerId: string
) {
  return (
    players.find(
      (player) =>
        player.id === playerId
    )?.nickname ??
    playerId
  );
}

/*
  ========================================
  ІНІЦІАЛИ
  ========================================
*/

function getInitials(
  nickname: string
) {
  return nickname
    .replace(
      /[^a-zA-Zа-яА-ЯіІїЇєЄґҐ0-9]/g,
      ""
    )
    .slice(
      0,
      2
    )
    .toUpperCase();
}

/*
  ========================================
  СТАТИСТИКА
  ========================================
*/

function calculateCareerStats(
  matches: PlayerStatsMatch[],
  playerId: string,
  coopTeamRefs: Set<string>
): CareerStats {
  let played = 0;

  let wins = 0;
  let draws = 0;
  let losses = 0;

  let goalsFor = 0;
  let goalsAgainst = 0;

  for (
    const match of matches
  ) {
    if (
      match.status !==
        "finished" ||
      match.home_goals ===
        null ||
      match.away_goals ===
        null
    ) {
      continue;
    }

    const isHome =
      match.home_id ===
        playerId ||
      coopTeamRefs.has(
        match.home_id
      );

    const isAway =
      match.away_id ===
        playerId ||
      coopTeamRefs.has(
        match.away_id
      );

    if (
      !isHome &&
      !isAway
    ) {
      continue;
    }

    if (
      isHome &&
      isAway
    ) {
      continue;
    }

    const scored =
      isHome
        ? match.home_goals
        : match.away_goals;

    const conceded =
      isHome
        ? match.away_goals
        : match.home_goals;

    played += 1;

    goalsFor += scored;
    goalsAgainst +=
      conceded;

    if (
      scored >
      conceded
    ) {
      wins += 1;
    } else if (
      scored ===
      conceded
    ) {
      draws += 1;
    } else {
      losses += 1;
    }
  }

  return {
    matches: played,

    wins,
    draws,
    losses,

    goalsFor,
    goalsAgainst,

    goalDifference:
      goalsFor -
      goalsAgainst,
  };
}

function formatGoalDifference(
  value: number
) {
  if (value > 0) {
    return `+${value}`;
  }

  return String(
    value
  );
}

/*
  ========================================
  КІЛЬКІСТЬ СЕЗОНІВ
  ========================================
*/

function getCareerSeasons(
  playerId: string
) {
  const seasons:
    SeasonNumber[] = [
      1,
      2,
      3,
      4,
    ];

  return seasons.filter(
    (season) =>
      getAvailableDivisions(
        season
      ).some(
        (division) =>
          getDivisionPlayerIds(
            season,
            division
          ).includes(
            playerId
          )
      )
  );
}

/*
  ========================================
  ДАТА
  ========================================
*/

function formatMatchDate(
  value: string | null
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "uk-UA",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(
    date
  );
}

/*
  ========================================
  PAGE
  ========================================
*/

export default async function PlayerPage({
  params,
  searchParams,
}: PageProps) {
  const resolvedParams =
    await params;

  const resolvedSearchParams =
    await searchParams;

  const playerId =
    resolvedParams.id;

  /*
    ========================================
    ГРАВЕЦЬ
    ========================================
  */

  const player =
    players.find(
      (item) =>
        item.id ===
        playerId
    );

  if (!player) {
    notFound();
  }

  /*
    ========================================
    СЕЗОН
    ========================================
  */

  const requestedSeason =
    Number(
      resolvedSearchParams
        .season
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
    КАР'ЄРА
    ========================================
  */

  const careerSeasonList =
    getCareerSeasons(
      playerId
    );

  const careerSeasons =
    careerSeasonList.length;

  const division =
    getPlayerDivision(
      season,
      playerId
    );

  /*
    ========================================
    ТРОФЕЇ
    ========================================
  */

  const honours =
    await getPlayerHonours(
      playerId
    );

  const trophyCount =
    honours.length;

  const selectedSeasonHonours =
    honours.filter(
      (honour) =>
        honour.season ===
        season
    );

  /*
    ========================================
    ВСІ CO-OP КОМАНДИ
    ========================================
  */

  const {
    data: coopTeamsData,
    error: coopTeamsError,
  } = await supabase
    .from("coop_teams")
    .select(
      `
        id,
        name,
        season,
        player_1_id,
        player_2_id
      `
    );

  if (coopTeamsError) {
    console.error(
      "PLAYER COOP TEAMS ERROR:",
      coopTeamsError
    );
  }

  const coopTeams =
    (
      coopTeamsData ??
      []
    ) as CoopTeamRow[];

  /*
    Команди, де грає
    саме цей гравець.
  */

  const playerCoopTeams =
    coopTeams.filter(
      (team) =>
        team.player_1_id ===
          playerId ||
        team.player_2_id ===
          playerId
    );

  /*
    У деяких матчах команда
    може зберігатися через ID,
    а в деяких — через назву.

    Підтримуємо обидва варіанти.
  */

  const coopTeamRefs =
    new Set<string>();

  for (
    const team of playerCoopTeams
  ) {
    coopTeamRefs.add(
      team.id
    );

    coopTeamRefs.add(
      team.name
    );
  }

  /*
    ========================================
    ЗВИЧАЙНІ МАТЧІ
    ========================================
  */

  const {
    data:
      directMatchesData,
    error:
      directMatchesError,
  } = await supabase
    .from("matches")
    .select(
      `
        id,
        season,
        competition,
        division,
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
    .or(
      `home_id.eq.${playerId},away_id.eq.${playerId}`
    );

  if (
    directMatchesError
  ) {
    console.error(
      "PLAYER MATCHES ERROR:",
      directMatchesError
    );
  }

  const directMatches =
    (
      directMatchesData ??
      []
    ) as PlayerStatsMatch[];

  /*
    ========================================
    CO-OP МАТЧІ
    ========================================
  */

  let coopMatches:
    PlayerStatsMatch[] = [];

  if (
    coopTeamRefs.size >
    0
  ) {
    const {
      data:
        coopMatchesData,

      error:
        coopMatchesError,
    } = await supabase
      .from("matches")
      .select(
        `
          id,
          season,
          competition,
          division,
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
        "competition",
        "iron-coop-cup"
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
      coopMatchesError
    ) {
      console.error(
        "PLAYER COOP MATCHES ERROR:",
        coopMatchesError
      );
    }

    coopMatches =
      (
        coopMatchesData ??
        []
      ).filter(
        (match) =>
          coopTeamRefs.has(
            match.home_id
          ) ||
          coopTeamRefs.has(
            match.away_id
          )
      ) as PlayerStatsMatch[];
  }

  /*
    ========================================
    МАТЧІ БЕЗ ДУБЛІВ
    ========================================
  */

  const careerMatchMap =
    new Map<
      string,
      PlayerStatsMatch
    >();

  for (
    const match of [
      ...directMatches,
      ...coopMatches,
    ]
  ) {
    careerMatchMap.set(
      match.id,
      match
    );
  }

  const careerMatches =
    Array.from(
      careerMatchMap.values()
    );

  /*
    ========================================
    ЗАГАЛЬНА СТАТИСТИКА
    ========================================
  */

  const careerStats =
    calculateCareerStats(
      careerMatches,
      playerId,
      coopTeamRefs
    );

  /*
    ========================================
    ОСТАННІ 10 МАТЧІВ
    ========================================
  */

  const recentMatches =
    [...careerMatches]
      .sort(
        (a, b) => {
          if (
            a.played_at &&
            b.played_at
          ) {
            return (
              new Date(
                b.played_at
              ).getTime() -
              new Date(
                a.played_at
              ).getTime()
            );
          }

          if (
            a.played_at &&
            !b.played_at
          ) {
            return -1;
          }

          if (
            !a.played_at &&
            b.played_at
          ) {
            return 1;
          }

          return (
            b.season -
            a.season
          );
        }
      )
      .slice(
        0,
        10
      );

  /*
    ========================================
    ЧИ ГРАВЕЦЬ ГОСПОДАР
    ========================================
  */

  function playerIsHome(
    match: PlayerStatsMatch
  ) {
    return (
      match.home_id ===
        playerId ||
      coopTeamRefs.has(
        match.home_id
      )
    );
  }

  /*
    ========================================
    НАЗВА CO-OP КОМАНДИ
    ========================================
  */

  function getTeamName(
    ref: string
  ) {
    return (
      coopTeams.find(
        (team) =>
          team.id === ref ||
          team.name === ref
      )?.name ??
      ref
    );
  }

  /*
    ========================================
    СУПЕРНИК
    ========================================
  */

  function getOpponentName(
    match: PlayerStatsMatch
  ) {
    const isHome =
      playerIsHome(
        match
      );

    const opponentId =
      isHome
        ? match.away_id
        : match.home_id;

    if (
      match.participant_type ===
        "team" ||
      match.competition ===
        "iron-coop-cup"
    ) {
      return getTeamName(
        opponentId
      );
    }

    return getPlayerName(
      opponentId
    );
  }

  /*
    ========================================
    РАХУНОК ВІД ІМЕНІ ГРАВЦЯ
    ========================================
  */

  function getPlayerScore(
    match: PlayerStatsMatch
  ) {
    const isHome =
      playerIsHome(
        match
      );

    const scored =
      isHome
        ? match.home_goals
        : match.away_goals;

    const conceded =
      isHome
        ? match.away_goals
        : match.home_goals;

    return `${scored} : ${conceded}`;
  }

  /*
    ========================================
    РЕЗУЛЬТАТ
    ========================================
  */

  function getMatchResult(
    match: PlayerStatsMatch
  ) {
    const isHome =
      playerIsHome(
        match
      );

    const scored =
      isHome
        ? match.home_goals!
        : match.away_goals!;

    const conceded =
      isHome
        ? match.away_goals!
        : match.home_goals!;

    if (
      scored >
      conceded
    ) {
      return {
        label:
          "Перемога",

        short:
          "В",

        className:
          "border-green-400/20 bg-green-500/10 text-green-300",
      };
    }

    if (
      scored ===
      conceded
    ) {
      return {
        label:
          "Нічия",

        short:
          "Н",

        className:
          "border-yellow-400/20 bg-yellow-500/10 text-yellow-300",
      };
    }

    return {
      label:
        "Поразка",

      short:
        "П",

      className:
        "border-red-400/20 bg-red-500/10 text-red-300",
    };
  }

  /*
    ========================================
    КАРТКИ ТУРНІРІВ СЕЗОНУ
    ========================================
  */

  const seasonCards:
    CompetitionCard[] = [];

  if (division) {
    seasonCards.push({
      key:
        `division-${division}`,

      eyebrow:
        "Чемпіонат",

      title:
        `${division} Дивізіон`,
    });
  }

  const competitions =
    seasonCompetitions[
      season
    ];

  for (
    const competition of competitions
  ) {
    const id =
      competition.id;

    if (
      /^division-[1-4]$/.test(
        id
      )
    ) {
      continue;
    }

    /*
      КУБОК АСОЦІАЦІЙ
    */

    if (
      id ===
      "associations-cup"
    ) {
      try {
        const associations =
          getCompetitionAssociations(
            {
              season,

              competition:
                "associations-cup",
            }
          );

        const association =
          associations.find(
            (item) =>
              Array.isArray(
                item?.players
              ) &&
              item.players.includes(
                playerId
              )
          );

        if (association) {
          seasonCards.push({
            key:
              "associations-cup",

            eyebrow:
              "Кубок",

            title:
              "Кубок асоціацій",

            subtitle:
              association.name,
          });
        }
      } catch {
        // Даних немає.
      }

      continue;
    }

    /*
      CO-OP
    */

    if (
      id ===
      "iron-coop-cup"
    ) {
      const team =
        playerCoopTeams.find(
          (item) =>
            item.season ===
            season
        );

      if (team) {
        seasonCards.push({
          key:
            "iron-coop-cup",

          eyebrow:
            "Командний турнір",

          title:
            "Iron Co-op Cup",

          subtitle:
            team.name,
        });
      }

      continue;
    }

    /*
      ІНШІ ТУРНІРИ
    */

    const competitionPlayers =
      getSafeCompetitionPlayers(
        season,
        id
      );

    if (
      !competitionPlayers.includes(
        playerId
      )
    ) {
      continue;
    }

    let subtitle:
      | string
      | null = null;

    if (
      id ===
        "champions-league" ||
      id ===
        "europa-league" ||
      id ===
        "conference-league"
    ) {
      const group =
        getPlayerGroup(
          season,
          id,
          playerId
        );

      if (group) {
        subtitle =
          `Група ${group}`;
      }
    }

    seasonCards.push({
      key: id,

      eyebrow:
        getCompetitionEyebrow(
          id
        ),

      title:
        getCompetitionName(
          id
        ),

      subtitle,
    });
  }

  /*
    ========================================
    БЕЗ ДУБЛІВ
    ========================================
  */

  const uniqueCards =
    Array.from(
      new Map(
        seasonCards.map(
          (card) => [
            card.key,
            card,
          ]
        )
      ).values()
    );

  const initials =
    getInitials(
      player.nickname
    );

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
                Профіль гравця
              </div>
            </div>
          </a>

          <a
            href={`/players?season=${season}`}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-bold text-blue-300 transition hover:border-blue-400/30 hover:bg-blue-500/10"
          >
            ← Усі гравці
          </a>
        </div>
      </header>

      {/* HERO */}

      <section className="relative overflow-hidden border-b border-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{
            backgroundImage:
              "url('/stadium-bg.jpg')",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#030711] via-[#030711]/95 to-[#030711]/75" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#030711] via-transparent to-[#030711]/80" />

        <div className="relative mx-auto max-w-7xl px-6 py-20">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center">
            <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-[30px] border border-blue-400/30 bg-blue-500/10 text-4xl font-black text-blue-300 shadow-[0_0_40px_rgba(59,130,246,0.08)]">
              {initials}
            </div>

            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-[0.28em] text-blue-400">
                Iron League
              </div>

              <h1 className="mt-3 break-words text-5xl font-black sm:text-6xl">
                {player.nickname}
              </h1>

              {player.account && (
                <div className="mt-3 text-lg text-white/35">
                  ({player.account})
                </div>
              )}
            </div>
          </div>

          {/* SEASONS */}

          <div className="mt-10">
            <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/35">
              Кар&apos;єра за
              сезонами
            </div>

            <div className="inline-flex flex-wrap rounded-xl border border-white/10 bg-[#07101d]/90 p-1">
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
                    href={`/players/${playerId}?season=${seasonNumber}`}
                    className={`rounded-lg px-5 py-2.5 text-sm font-bold transition ${
                      season ===
                      seasonNumber
                        ? "bg-blue-500 text-white"
                        : "text-white/45 hover:bg-white/[0.04] hover:text-white"
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
        </div>
      </section>

      {/* SEASON CAREER */}

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
          Кар&apos;єра
        </div>

        <h2 className="mt-3 text-3xl font-black">
          Сезон {season}
        </h2>

        {division === null ? (
          <div className="mt-8 rounded-3xl border border-white/10 bg-[#07101d] px-8 py-12">
            <div className="text-xl font-black">
              Гравець не входить
              до складу цього
              сезону
            </div>

            <p className="mt-3 max-w-2xl leading-7 text-white/40">
              Для Сезону {season}
              участь{" "}
              {player.nickname} у
              дивізіонах Iron
              League не
              зафіксована.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {uniqueCards.map(
              (card) => (
                <div
                  key={
                    card.key
                  }
                  className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] p-7"
                >
                  <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-blue-500/[0.06] blur-3xl" />

                  <div className="relative">
                    <div className="text-xs font-black uppercase tracking-[0.25em] text-blue-400">
                      {
                        card.eyebrow
                      }
                    </div>

                    <div className="mt-5 text-2xl font-black">
                      {
                        card.title
                      }
                    </div>

                    {card.subtitle && (
                      <div className="mt-3 text-sm text-white/35">
                        {
                          card.subtitle
                        }
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* TROPHIES OF SEASON */}

        {selectedSeasonHonours.length >
          0 && (
          <div className="mt-10 rounded-3xl border border-yellow-400/15 bg-yellow-500/[0.03] p-7">
            <div className="text-xs font-black uppercase tracking-[0.24em] text-yellow-300">
              Трофеї сезону
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {selectedSeasonHonours.map(
                (honour) => (
                  <div
                    key={
                      honour.key
                    }
                    className="rounded-xl border border-yellow-400/20 bg-yellow-500/[0.06] px-4 py-3"
                  >
                    <div className="text-xs font-bold text-yellow-300/70">
                      {getHonourCategoryName(
                        honour
                      )}
                    </div>

                    <div className="mt-1 font-black">
                      {
                        honour.title
                      }
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </section>

      {/* GENERAL STATS */}

      <section className="border-t border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Кар&apos;єра Iron
            League
          </div>

          <h2 className="mt-3 text-3xl font-black">
            Загальна статистика
          </h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-[#07101d] p-6">
              <div className="text-sm text-white/35">
                Сезонів
              </div>

              <div className="mt-4 text-4xl font-black">
                {
                  careerSeasons
                }
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#07101d] p-6">
              <div className="text-sm text-white/35">
                Матчів
              </div>

              <div className="mt-4 text-4xl font-black">
                {
                  careerStats.matches
                }
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#07101d] p-6">
              <div className="text-sm text-white/35">
                Перемог
              </div>

              <div className="mt-4 text-4xl font-black text-blue-300">
                {
                  careerStats.wins
                }
              </div>
            </div>

            <div className="rounded-2xl border border-yellow-400/15 bg-yellow-500/[0.03] p-6">
              <div className="text-sm text-white/35">
                Трофеїв
              </div>

              <div className="mt-4 text-4xl font-black text-yellow-300">
                {
                  trophyCount
                }
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border border-white/10 bg-[#07101d] p-5">
              <div className="text-xs uppercase tracking-[0.16em] text-white/30">
                Нічиї
              </div>

              <div className="mt-3 text-3xl font-black">
                {
                  careerStats.draws
                }
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#07101d] p-5">
              <div className="text-xs uppercase tracking-[0.16em] text-white/30">
                Поразки
              </div>

              <div className="mt-3 text-3xl font-black">
                {
                  careerStats.losses
                }
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#07101d] p-5">
              <div className="text-xs uppercase tracking-[0.16em] text-white/30">
                Забито
              </div>

              <div className="mt-3 text-3xl font-black">
                {
                  careerStats.goalsFor
                }
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#07101d] p-5">
              <div className="text-xs uppercase tracking-[0.16em] text-white/30">
                Пропущено
              </div>

              <div className="mt-3 text-3xl font-black">
                {
                  careerStats.goalsAgainst
                }
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#07101d] p-5">
              <div className="text-xs uppercase tracking-[0.16em] text-white/30">
                Різниця
              </div>

              <div className="mt-3 text-3xl font-black text-blue-300">
                {formatGoalDifference(
                  careerStats.goalDifference
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RECENT MATCHES */}

      <section className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                Матчі
              </div>

              <h2 className="mt-3 text-3xl font-black">
                Останні матчі
              </h2>

              <p className="mt-3 text-sm text-white/35">
                Останні 10
                завершених матчів
                за всю кар&apos;єру.
              </p>
            </div>

            <a
              href={`/matches?season=${season}&player=${playerId}`}
              className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-5 py-3 text-sm font-black text-blue-300 transition hover:border-blue-400/40 hover:bg-blue-500/15"
            >
              Відкрити в
              Матч-центрі →
            </a>
          </div>

          {recentMatches.length ===
          0 ? (
            <div className="mt-8 rounded-3xl border border-white/10 bg-[#07101d] p-10">
              <div className="text-xl font-black">
                Завершених матчів
                поки немає
              </div>

              <p className="mt-3 text-white/35">
                Після внесення
                результатів вони
                автоматично
                з&apos;являться тут.
              </p>
            </div>
          ) : (
            <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-[#07101d]">
              {/* TABLE HEADER */}

              <div className="hidden grid-cols-[120px_80px_1fr_120px_1fr_120px] gap-4 border-b border-white/10 bg-white/[0.025] px-6 py-4 text-xs font-bold uppercase tracking-[0.12em] text-white/30 lg:grid">
                <div>
                  Дата
                </div>

                <div>
                  Сезон
                </div>

                <div>
                  Суперник
                </div>

                <div className="text-center">
                  Рахунок
                </div>

                <div>
                  Турнір
                </div>

                <div className="text-right">
                  Результат
                </div>
              </div>

              <div className="divide-y divide-white/5">
                {recentMatches.map(
                  (match) => {
                    const result =
                      getMatchResult(
                        match
                      );

                    return (
                      <div
                        key={
                          match.id
                        }
                        className="grid gap-4 px-6 py-5 transition hover:bg-white/[0.025] lg:grid-cols-[120px_80px_1fr_120px_1fr_120px] lg:items-center"
                      >
                        {/* DATE */}

                        <div>
                          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/20 lg:hidden">
                            Дата
                          </div>

                          <div className="text-sm text-white/45">
                            {formatMatchDate(
                              match.played_at
                            )}
                          </div>
                        </div>

                        {/* SEASON */}

                        <div>
                          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/20 lg:hidden">
                            Сезон
                          </div>

                          <div className="text-sm font-black text-white/55">
                            {
                              match.season
                            }
                          </div>
                        </div>

                        {/* OPPONENT */}

                        <div className="min-w-0">
                          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/20 lg:hidden">
                            Суперник
                          </div>

                          <div className="truncate font-black">
                            {getOpponentName(
                              match
                            )}
                          </div>
                        </div>

                        {/* SCORE */}

                        <div>
                          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/20 lg:hidden">
                            Рахунок
                          </div>

                          <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-lg font-black lg:flex lg:justify-center">
                            {getPlayerScore(
                              match
                            )}
                          </div>
                        </div>

                        {/* COMPETITION */}

                        <div className="min-w-0">
                          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/20 lg:hidden">
                            Турнір
                          </div>

                          <div className="truncate text-sm font-semibold text-blue-300">
                            {getCompetitionName(
                              match.competition,
                              match.division
                            )}
                          </div>
                        </div>

                        {/* RESULT */}

                        <div className="lg:text-right">
                          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/20 lg:hidden">
                            Результат
                          </div>

                          <span
                            title={
                              result.label
                            }
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${result.className}`}
                          >
                            <span className="lg:hidden">
                              {
                                result.label
                              }
                            </span>

                            <span className="hidden lg:inline">
                              {
                                result.short
                              }
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* HONOURS */}

      <section className="border-t border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-300">
            Hall of honours
          </div>

          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-3xl font-black">
              Досягнення
            </h2>

            <div className="text-sm text-white/35">
              Трофеїв:{" "}
              <span className="font-black text-yellow-300">
                {
                  trophyCount
                }
              </span>
            </div>
          </div>

          {honours.length ===
          0 ? (
            <div className="mt-8 relative overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] p-10">
              <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-yellow-500/[0.04] blur-[70px]" />

              <div className="relative">
                <div className="text-xl font-black">
                  Трофеїв поки
                  немає
                </div>

                <p className="mt-3 max-w-2xl leading-7 text-white/35">
                  Після завершення
                  турнірів виграні
                  трофеї автоматично
                  з&apos;являться у
                  профілі.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {honours.map(
                (honour) => (
                  <article
                    key={
                      honour.key
                    }
                    className="relative overflow-hidden rounded-3xl border border-yellow-400/15 bg-[#07101d] p-7"
                  >
                    <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-yellow-500/[0.06] blur-3xl" />

                    <div className="relative">
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-xs font-black uppercase tracking-[0.22em] text-yellow-300">
                          {getHonourCategoryName(
                            honour
                          )}
                        </div>

                        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-white/40">
                          Сезон{" "}
                          {
                            honour.season
                          }
                        </div>
                      </div>

                      <div className="mt-6 text-2xl font-black">
                        {
                          honour.title
                        }
                      </div>

                      <div className="mt-5 h-px bg-gradient-to-r from-yellow-400/20 to-transparent" />

                      <div className="mt-5 text-sm font-bold text-yellow-300/70">
                        ★ Трофей Iron
                        League
                      </div>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </div>
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