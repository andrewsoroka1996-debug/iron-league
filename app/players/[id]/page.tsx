import StadiumBackground from "../../../components/StadiumBackground";
import PlayerEmblem from "../../../components/PlayerEmblem";
import { getPlayerEmblemUrls } from "../../../lib/player-emblem-urls";
import SiteHeader from "../../../components/public/SiteHeader";
import SiteFooter from "../../../components/public/SiteFooter";
import ProfileViewSwitch from "./ProfileViewSwitch";
import HonourTrophyIcon from "./HonourTrophyIcon";
import { Suspense } from "react";
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

import {
  getSeasonAssociationSquads,
} from "../../../lib/association-squads";

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
  created_at: string | null;
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
  DATA COMPONENT
  ========================================
*/

type PlayerProfileDataProps = {
  playerId: string;
  season: SeasonNumber;
};

type AssociationSquads =
  Awaited<
    ReturnType<
      typeof getSeasonAssociationSquads
    >
  >;

/*
  ========================================
  ЗАВАНТАЖЕННЯ ДАНИХ ПРОФІЛЮ
  ========================================

  Цей компонент працює всередині
  Suspense.

  HEADER і HERO не чекають
  трофеї, статистику та матчі.
*/

async function PlayerProfileData({
  playerId,
  season,
}: PlayerProfileDataProps) {
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
    ПАРАЛЕЛЬНІ ЗАПИТИ
    ========================================
  */

  const competitions =
    seasonCompetitions[
      season
    ];

  const hasAssociationCup =
    competitions.some(
      (competition) =>
        competition.id ===
        "associations-cup"
    );

  const associationSquadsPromise:
    Promise<AssociationSquads> =
    hasAssociationCup
      ? getSeasonAssociationSquads(
          season
        ).catch(
          () =>
            [] as AssociationSquads
        )
      : Promise.resolve(
          [] as AssociationSquads
        );

  /*
    ========================================
    ЗАВАНТАЖЕННЯ ВСІХ МАТЧІВ
    ========================================
  */

  async function loadFinishedMatchPages(
    mode: "direct" | "coop"
  ) {
    const pageSize = 500;
    const allMatches: PlayerStatsMatch[] = [];

    for (let from = 0; ; from += pageSize) {
      let query = supabase
        .from("matches")
        .select(`
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
          played_at,
          created_at
        `)
        .eq("status", "finished")
        .not("home_goals", "is", null)
        .not("away_goals", "is", null);

      if (mode === "direct") {
        query = query.or(
          `home_id.eq.${playerId},away_id.eq.${playerId}`
        );
      } else {
        query = query.eq(
          "competition",
          "iron-coop-cup"
        );
      }

      const { data, error } = await query
        .order("id", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error(
          mode === "direct"
            ? "PLAYER MATCHES ERROR:"
            : "PLAYER COOP MATCHES ERROR:",
          error
        );

        throw new Error(
          "Не вдалося завантажити всі матчі гравця."
        );
      }

      const page = (data ?? []) as PlayerStatsMatch[];

      allMatches.push(...page);

      if (page.length < pageSize) {
        break;
      }
    }

    return {
      data: allMatches,
      error: null,
    };
  }

  /*
    ========================================
    ПАРАЛЕЛЬНІ ЗАПИТИ
    ========================================
  */

  const [
    honours,
    coopTeamsResult,
    directMatchesResult,
    coopMatchesResult,
    associationSquads,
  ] = await Promise.all([
    getPlayerHonours(playerId),

    supabase
      .from("coop_teams")
      .select(`
        id,
        name,
        season,
        player_1_id,
        player_2_id
      `),

    loadFinishedMatchPages("direct"),

    loadFinishedMatchPages("coop"),

    associationSquadsPromise,
  ]);

  /*
    ========================================
    ТРОФЕЇ
    ========================================
  */

  const trophyCount =
    honours.length;

  // V3: досягнення вибраного сезону, без впливу на кар'єрні нагороди.
  const seasonHonours = honours.filter(
    (honour) => honour.season === season
  );
  const seasonTrophyCount = seasonHonours.length;

  /*
    ========================================
    CO-OP КОМАНДИ
    ========================================
  */

  if (
    coopTeamsResult.error
  ) {
    console.error(
      "PLAYER COOP TEAMS ERROR:",
      coopTeamsResult.error
    );
  }

  const coopTeams =
    (
      coopTeamsResult.data ??
      []
    ) as CoopTeamRow[];

  const playerCoopTeams =
    coopTeams.filter(
      (team) =>
        team.player_1_id ===
          playerId ||
        team.player_2_id ===
          playerId
    );

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

  if (
    directMatchesResult.error
  ) {
    console.error(
      "PLAYER MATCHES ERROR:",
      directMatchesResult.error
    );
  }

  const directMatches =
    (
      directMatchesResult.data ??
      []
    ) as PlayerStatsMatch[];

  /*
    ========================================
    CO-OP МАТЧІ
    ========================================
  */

  if (
    coopMatchesResult.error
  ) {
    console.error(
      "PLAYER COOP MATCHES ERROR:",
      coopMatchesResult.error
    );
  }

  const coopMatches =
    (
      coopMatchesResult.data ??
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

  // Той самий набір матчів, що й у загальній статистиці.
  const careerWinRate = careerStats.matches > 0
    ? Math.round((careerStats.wins / careerStats.matches) * 100)
    : 0;

  /*
    ========================================
    ОСТАННІ 10 ЗАВЕРШЕНИХ МАТЧІВ

    created_at — дата створення календарного запису.
    played_at — дата результату. Для старих записів
    без played_at використовуємо created_at.
    ========================================
  */

  const recentMatches = [...careerMatches]
    .sort((a, b) => {
      const aTime = Date.parse(a.played_at ?? a.created_at ?? "");
      const bTime = Date.parse(b.played_at ?? b.created_at ?? "");
      const aHasDate = Number.isFinite(aTime);
      const bHasDate = Number.isFinite(bTime);

      // Найновіші завершені матчі першими.
      if (aHasDate && bHasDate && aTime !== bTime) {
        return bTime - aTime;
      }

      // Матчі з відомою датою — вище за матчі без дати.
      if (aHasDate !== bHasDate) {
        return aHasDate ? -1 : 1;
      }

      // Стабільний порядок за однакового часу.
      return a.id.localeCompare(b.id);
    })
    .slice(0, 10);

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
      const association =
        associationSquads.find(
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

  /*
    IRON LEAGUE PRO V2 — дані з уже завантажених матчів.
    Без додаткових звернень до Supabase.
  */
  const previewSeasonMatches = careerMatches.filter(
    (match) => match.season === season
  );
  const previewSeasonStats = calculateCareerStats(
    previewSeasonMatches,
    playerId,
    coopTeamRefs
  );
  const previewWinRate = previewSeasonStats.matches > 0
    ? Math.round((previewSeasonStats.wins / previewSeasonStats.matches) * 100)
    : 0;
  const previewRecentSeasonMatches = [...previewSeasonMatches]
    .sort((a, b) => {
      const aTime = Date.parse(a.played_at ?? a.created_at ?? "");
      const bTime = Date.parse(b.played_at ?? b.created_at ?? "");
      const aValid = Number.isFinite(aTime);
      const bValid = Number.isFinite(bTime);
      if (aValid && bValid && aTime !== bTime) return bTime - aTime;
      if (aValid !== bValid) return aValid ? -1 : 1;
      return a.id.localeCompare(b.id);
    })
    .slice(0, 10);
  // V4: обидва режими «Останніх матчів» використовують наявні дані.
  // Жодного додаткового запиту до Supabase.
  function renderRecentMatches(selectedMatches: PlayerStatsMatch[]) {
    return (
selectedMatches.length ===
          0 ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-[#07101d] p-10">
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
            <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-[#07101d] sm:mt-5 sm:rounded-2xl">
              {/* DESKTOP TABLE HEADER */}
              <div className="hidden grid-cols-[110px_70px_minmax(0,1.2fr)_105px_minmax(0,1fr)_100px] items-center gap-4 border-b border-white/10 bg-white/[0.025] px-6 py-4 text-[11px] font-bold uppercase tracking-[0.1em] text-white/35 lg:grid">
                <div>Дата</div>
                <div>Сезон</div>
                <div>Суперник</div>
                <div className="text-center">Рахунок</div>
                <div>Турнір</div>
                <div className="text-right">Результат</div>
              </div>

              {/* MATCHES */}
              <div className="divide-y divide-white/5">
                {selectedMatches.map((match) => {
                  const result = getMatchResult(match);

                  return (
                    <div
                      key={match.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3 py-2.5 transition hover:bg-white/[0.025] sm:px-5 sm:py-4 lg:grid-cols-[110px_70px_minmax(0,1.2fr)_105px_minmax(0,1fr)_100px] lg:gap-4 lg:px-6"
                    >
                      {/* DATE */}
                      <div className="col-start-1 row-start-1 min-w-0 text-[11px] font-medium text-white/45 sm:text-xs lg:col-start-1 lg:row-start-1">
                        <span>
                          {formatMatchDate(match.played_at ?? match.created_at)}
                        </span>

                        <span className="ml-2 text-white/25 lg:hidden">
                          • Сезон {match.season}
                        </span>
                      </div>

                      {/* SEASON — DESKTOP */}
                      <div className="hidden text-sm font-bold text-white/55 lg:col-start-2 lg:row-start-1 lg:block">
                        {match.season}
                      </div>

                      {/* OPPONENT */}
                      <div className="col-start-1 row-start-2 min-w-0 lg:col-start-3 lg:row-start-1">
                        <div className="break-words text-sm font-black leading-5 text-white sm:text-base">
                          {getOpponentName(match)}
                        </div>
                        <div className="mt-0.5 truncate text-[11px] font-semibold text-blue-300/85 lg:hidden">
                          {getCompetitionName(match.competition, match.division)}
                        </div>
                      </div>

                      {/* SCORE */}
                      <div className="col-start-2 row-start-2 min-w-[70px] text-center lg:col-start-4 lg:row-start-1">
                        <div className="whitespace-nowrap rounded-lg border border-blue-400/15 bg-blue-500/10 px-2 py-1.5 text-sm font-black tabular-nums text-blue-300 sm:rounded-xl sm:px-3 sm:py-2 sm:text-lg">
                          {getPlayerScore(match)}
                        </div>
                      </div>

                      {/* COMPETITION */}
                      <div className="hidden min-w-0 lg:col-span-1 lg:col-start-5 lg:row-start-1 lg:block">
                        <div className="break-words text-xs font-semibold leading-5 text-blue-300/85 sm:text-sm">
                          {getCompetitionName(
                            match.competition,
                            match.division
                          )}
                        </div>
                      </div>

                      {/* RESULT */}
                      <div className="col-start-2 row-start-1 min-w-0 justify-self-end lg:col-start-6 lg:row-start-1">
                        <span
                          title={result.label}
                          className={`inline-flex max-w-full items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-black leading-tight sm:px-3 sm:py-1 sm:text-xs ${result.className}`}
                        >
                          <span className="lg:hidden" aria-label={result.label}>
                            {result.short}
                          </span>

                          <span className="hidden lg:inline">
                            {result.short}
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
    );
  }

  // V4: сезонні й кар'єрні трофеї з уже отриманих honours.
  function renderHonours(selectedHonours: PlayerHonour[]) {
    return (
selectedHonours.length === 0 ? (
            <div className="relative mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#07101d] px-5 py-8 sm:px-8 sm:py-10">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-yellow-500/[0.04] blur-3xl" />

              <div className="relative flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-500/[0.06] text-yellow-300/70">
                  <HonourTrophyIcon category="cup" title="Кубок" className="h-10 w-10" />
                </div>

                <div className="min-w-0">
                  <h3 className="text-lg font-black text-white sm:text-xl">
                    У вибраному перегляді трофеїв немає
                  </h3>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-white/45">
                    Після здобуття нагород вони з&apos;являться тут. Перемкни режим перегляду, щоб побачити інші сезони.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* HONOURS GRID */
            <div className="mt-3 grid gap-2 min-[390px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
              {selectedHonours.map((honour) => (
                <article
                  key={honour.key}
                  className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-yellow-400/25 bg-gradient-to-br from-[#182335] via-[#0b1523] to-[#19160e] p-2.5 transition-colors duration-300 hover:border-yellow-400/40 hover:bg-[#101723] sm:rounded-2xl sm:p-4"
                >
                  {/* GOLDEN BACKGROUND ACCENT */}
                  <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-yellow-500/[0.06] blur-2xl" />

                  <div className="relative flex flex-1 flex-col">
                    {/* CATEGORY AND SEASON */}
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-1 gap-y-1 sm:flex-nowrap sm:gap-3">
                      <div className="min-w-0 break-words text-[10px] font-black uppercase leading-5 tracking-[0.13em] text-yellow-300 sm:text-[11px]">
                        {getHonourCategoryName(honour)}
                      </div>

                      <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-white/50 sm:px-2.5 sm:py-1 sm:text-xs">
                        Сезон {honour.season}
                      </span>
                    </div>

                    {/* TROPHY NAME */}
                    <div className="mt-2 flex min-w-0 items-center gap-2 sm:mt-3 sm:items-start sm:gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-yellow-400/45 bg-yellow-500/[0.11] text-[#FACC15] sm:h-16 sm:w-16 sm:rounded-xl">
                        <HonourTrophyIcon
                          category={honour.category}
                          title={honour.title}
                          className="h-9 w-9 sm:h-12 sm:w-12"
                        />
                      </div>

                      <h3 className="min-w-0 break-words text-[13px] font-black leading-snug text-white sm:pt-1 sm:text-lg">
                        {honour.title}
                      </h3>
                    </div>

                    {/* FOOTER */}
                    <div className="mt-auto pt-2 sm:pt-3">
                      <div className="h-px bg-gradient-to-r from-yellow-400/20 to-transparent" />

                      <div className="mt-2 text-[9px] font-semibold uppercase tracking-[0.08em] text-yellow-300/60 sm:mt-3 sm:text-[11px] sm:tracking-[0.12em]">
                        Трофей Iron League
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )
    );
  }

  return (
    <>
      {/* IRON LEAGUE PRO V4 — компакний огляд сезону */}
      <section className="mx-auto max-w-7xl px-4 pt-3 pb-1 sm:px-6 sm:pt-7" aria-label="Iron League Pro — статистика сезону">
        <div className="relative overflow-hidden rounded-2xl border border-blue-400/20 bg-gradient-to-br from-[#102741] via-[#0a172a] to-[#08121f] px-3 py-3 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.17em] text-blue-300">IRON LEAGUE PRO</div>
              <h2 className="mt-1 text-lg font-black text-white sm:text-2xl">Показники сезону {season}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {trophyCount > 0 && (
                <a href="#player-honours" className="rounded-full border border-amber-400/30 bg-amber-400/[0.09] px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-400/[0.14]">
                  <HonourTrophyIcon category="cup" title="Кубок" className="mr-1 inline-block h-3.5 w-3.5 align-[-2px] text-amber-300" /> {trophyCount} {trophyCount === 1 ? "трофей" : "трофеїв"} за кар'єру
                </a>
              )}
              <span className="rounded-full border border-amber-400/25 bg-amber-400/[0.06] px-3 py-1.5 text-[10px] font-semibold text-amber-200"><HonourTrophyIcon category="cup" title="Кубок" className="mr-1 inline-block h-3.5 w-3.5 align-[-2px] text-amber-300" /> {seasonTrophyCount} {seasonTrophyCount === 1 ? "трофей" : "трофеїв"} · сезон {season}</span>

            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Матчі", value: previewSeasonStats.matches, tone: "text-white" },
              { label: "Перемоги", value: previewSeasonStats.wins, tone: "text-emerald-300" },
              { label: "Нічиї", value: previewSeasonStats.draws, tone: "text-sky-300" },
              { label: "Поразки", value: previewSeasonStats.losses, tone: "text-rose-300" },
              { label: "Голи", value: `${previewSeasonStats.goalsFor} : ${previewSeasonStats.goalsAgainst}`, tone: "text-white" },
              { label: "Перемог %", value: `${previewWinRate}%`, tone: "text-blue-200" },
            ].map((stat) => (
              <div key={stat.label} className="min-w-0 rounded-xl border border-white/10 bg-[#061321]/90 px-2.5 py-2.5 sm:px-3 sm:py-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/55">{stat.label}</div>
                <div className={`mt-1 break-words text-xl font-black tabular-nums sm:text-2xl ${stat.tone}`}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-2 flex flex-col gap-2 rounded-2xl border border-white/10 bg-[#0a1728] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <div>
            <h3 className="text-sm font-black text-white sm:text-base">Форма за останні 10 матчів сезону</h3>
            <p className="mt-1 text-[11px] text-white/45">В — перемога · Н — нічия · П — поразка</p>
          </div>
          {previewRecentSeasonMatches.length > 0 ? (
            <div className="grid w-full grid-cols-10 gap-1 sm:flex sm:w-auto sm:flex-wrap sm:gap-2" aria-label="Форма гравця">
              {previewRecentSeasonMatches.map((match) => {
                const result = getMatchResult(match);
                return (
                  <span key={match.id} title={`${result.label}: ${getPlayerScore(match)} — ${getOpponentName(match)}`} className={`flex aspect-square w-full min-w-0 items-center justify-center rounded-md border text-[11px] font-black sm:aspect-auto sm:h-10 sm:w-10 sm:rounded-lg sm:text-xs ${result.className}`}>
                    {result.short}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-white/45">У цьому сезоні завершених матчів ще немає.</p>
          )}
        </div>
      </section>
      {/* SEASON CAREER */}

      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-8">
        <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
          Участь у турнірах
        </div>

        <h2 className="mt-1 text-xl font-black sm:mt-2 sm:text-3xl">
          Турніри сезону {season}
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
          <div className="mt-3 grid gap-2 min-[390px]:grid-cols-2 lg:grid-cols-3">
            {uniqueCards.map((card) => (
              <div
                key={card.key}
                className="group relative min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#07101d] p-2.5 transition-colors duration-300 hover:border-blue-400/30 hover:bg-[#0a1729] sm:rounded-2xl sm:p-4"
              >
                {/* BACKGROUND ACCENT */}
                <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-blue-500/[0.07] blur-2xl" />

                <div className="relative flex min-w-0 items-start gap-3">
                  {/* BLUE ACCENT */}
                  <div
                    aria-hidden="true"
                    className="mt-0.5 h-9 w-1 shrink-0 rounded-full bg-blue-400/70 sm:h-11"
                  />

                  {/* TOURNAMENT INFO */}
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-400 sm:text-[11px]">
                      {card.eyebrow}
                    </div>

                    <h3 className="mt-1 break-words text-sm font-black leading-snug text-white sm:mt-1.5 sm:text-xl">
                      {card.title}
                    </h3>

                    {card.subtitle && (
                      <div className="mt-1 break-words text-[11px] leading-4 text-white/45 sm:mt-1.5 sm:text-sm">
                        {card.subtitle}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </section>

      {/* HONOURS */}
      <section id="player-honours" className="scroll-mt-24 border-t border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-8">
          {/* SECTION HEADER */}
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-yellow-300 sm:text-xs">
            HALL OF HONOURS
          </div>

          <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
            Досягнення
          </h2>



          <ProfileViewSwitch
            label="Перегляд трофеїв"
            seasonLabel={`Сезон ${season}`}
            allLabel="Усі трофеї"
            seasonSummary={`Трофеїв за сезон ${season}: ${seasonTrophyCount}`}
            allSummary={`Усього трофеїв за кар'єру: ${trophyCount}`}
            seasonContent={renderHonours(seasonHonours)}
            allContent={renderHonours([...honours].sort((a, b) => b.season - a.season))}
          />
        </div>
      </section>
      {/* GENERAL STATS — expanded by default; full career unchanged */}
      <section className="border-t border-white/10 bg-white/[0.015]">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-8">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#07101d]">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-6 sm:py-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-400">Кар'єра Iron League</div>
                <h2 className="mt-1 text-lg font-black text-white sm:text-xl">Загальна статистика кар'єри</h2>
              </div>
              <span className="text-xs font-semibold text-white/55 sm:text-sm">
                {careerStats.matches} матчів · {careerStats.wins} перемог · {careerWinRate}% перемог · {trophyCount} трофеїв
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-white/10 p-2 sm:grid-cols-3 sm:p-5 lg:grid-cols-5">
              {[
                { label: "Сезонів", value: careerSeasons },
                { label: "Матчів", value: careerStats.matches },
                { label: "Перемог", value: careerStats.wins, tone: "text-emerald-300" },
                { label: "Відсоток перемог", value: `${careerWinRate}%`, tone: "text-blue-300" },
                { label: "Нічиїх", value: careerStats.draws },
                { label: "Поразок", value: careerStats.losses },
                { label: "Трофеїв", value: trophyCount, tone: "text-amber-300" },
                { label: "Забито", value: careerStats.goalsFor },
                { label: "Пропущено", value: careerStats.goalsAgainst },
                { label: "Різниця м'ячів", value: formatGoalDifference(careerStats.goalDifference) },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-white/10 bg-white/[0.025] p-2.5 sm:p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-white/50">{stat.label}</div>
                  <div className={`mt-1 text-xl font-black tabular-nums sm:mt-2 sm:text-2xl ${stat.tone ?? "text-white"}`}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* LAST: recent matches after awards and career statistics */}
      {/* RECENT MATCHES */}

      <section id="recent-matches" className="scroll-mt-24 border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-8">
          <div className="flex flex-wrap items-end justify-between gap-3 sm:gap-5">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                Матчі
              </div>

              <h2 className="mt-1 text-2xl font-black sm:mt-3 sm:text-3xl">
                Останні матчі
              </h2>

              <p className="mt-1 text-xs text-white/45 sm:mt-3 sm:text-sm">
                Вибери результати сезону {season} або останні матчі всієї кар&apos;єри.
              </p>
            </div>

            <a
              href={`/matches?season=${season}&player=${playerId}`}
              className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-3 py-2 text-xs font-black text-blue-300 transition hover:border-blue-400/40 hover:bg-blue-500/15 sm:px-5 sm:py-3 sm:text-sm"
            >
              Відкрити в
              Матч-центрі →
            </a>
          </div>

          <ProfileViewSwitch
            label="Перегляд останніх матчів"
            seasonLabel={`Сезон ${season}`}
            allLabel="Уся кар'єра"
            seasonSummary={`Останні ${previewRecentSeasonMatches.length} завершених матчів сезону ${season}`}
            allSummary={`Останні ${recentMatches.length} завершених матчів за кар'єру`}
            seasonContent={renderRecentMatches(previewRecentSeasonMatches)}
            allContent={renderRecentMatches(recentMatches)}
          />
        </div>
      </section>

    </>
  );
}

/*
  ========================================
  FALLBACK ПІД ЧАС ЗАВАНТАЖЕННЯ
  ========================================
*/

function PlayerProfileDataFallback() {
  return (
    <>
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="h-3 w-24 animate-pulse rounded-full bg-blue-400/20" />

        <div className="mt-4 h-9 w-52 animate-pulse rounded-xl bg-white/[0.06]" />

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[
            1,
            2,
            3,
          ].map(
            (item) => (
              <div
                key={item}
                className="h-36 animate-pulse rounded-3xl border border-white/10 bg-[#07101d]"
              />
            )
          )}
        </div>
      </section>

      <section className="border-t border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="h-8 w-56 animate-pulse rounded-xl bg-white/[0.06]" />

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              1,
              2,
              3,
              4,
            ].map(
              (item) => (
                <div
                  key={item}
                  className="h-32 animate-pulse rounded-2xl border border-white/10 bg-[#07101d]"
                />
              )
            )}
          </div>
        </div>
      </section>

      <section className="min-h-[520px] border-t border-white/10" />
    </>
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

  const initials =
    getInitials(
      player.nickname
    );

  const emblemUrls = await getPlayerEmblemUrls();

  return (
    <main className="min-h-screen bg-[#030711] text-white">
      {/* HEADER */}
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10">
        <StadiumBackground opacity="20" preload />

        {/* BACKGROUND OVERLAYS */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#030711] via-[#030711]/95 to-[#030711]/75" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#030711] via-transparent to-[#030711]/80" />

        <div className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-10 lg:py-14">
          {/* BACK LINK */}
          <a
            href={`/players?season=${season}`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-300 transition hover:text-blue-200 sm:text-sm"
          >
            <span aria-hidden="true">←</span>
            Усі гравці
          </a>

          {/* PLAYER HEADER — IRON LEAGUE PRO V3 */}
          <div className="mt-4 overflow-hidden rounded-2xl border border-blue-400/25 bg-gradient-to-br from-[#173251]/90 via-[#0b192c]/95 to-[#07111f] shadow-[0_12px_34px_rgba(0,0,0,0.20)]">
            <div className="flex flex-col gap-2 px-3 py-3 sm:gap-3 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
              <div className="flex min-w-0 items-center gap-3 sm:gap-6">
                <div className="relative flex h-[92px] w-[92px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-blue-300/45 bg-[#071426] shadow-[0_0_0_4px_rgba(59,130,246,0.07),0_12px_34px_rgba(0,0,0,0.4)] sm:h-[148px] sm:w-[148px] [&>*]:!h-full [&>*]:!w-full [&_img]:!h-full [&_img]:!w-full [&_img]:!object-cover">
                  <PlayerEmblem
                    nickname={player.nickname}
                    initials={initials}
                    src={emblemUrls[playerId]}
                    variant="profile"
                  />
                </div>
                <div className="min-w-0">
                  <div className="mb-1 text-[10px] font-black uppercase tracking-[0.08em] text-blue-300 sm:tracking-[0.16em] sm:text-xs">
                    <span className="sm:hidden">ГРАВЕЦЬ IRON LEAGUE</span>
                    <span className="hidden sm:inline">IRON LEAGUE · ПРОФІЛЬ ГРАВЦЯ</span>
                  </div>
                  <h1 className="break-words text-2xl font-black leading-tight tracking-tight text-white sm:text-4xl">
                    {player.nickname}
                  </h1>
                  {player.account && (
                    <div className="mt-1 break-words text-xs text-white/55 sm:text-sm">
                      ({player.account})
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full shrink-0 border-t border-blue-300/15 pt-2 sm:border-0 sm:pt-0 lg:w-[390px]">
                <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-white/55 sm:mb-2">
                  <span className="sm:hidden">Сезон</span>
                  <span className="hidden sm:inline">Обрати сезон</span>
                  <span className="hidden text-blue-300 sm:inline">Сезон {season}</span>
                </div>
                <nav
                  aria-label="Вибір сезону гравця"
                  className="grid w-full grid-cols-4 gap-1 rounded-xl border border-white/10 bg-[#06101e]/85 p-0.5 sm:p-1"
                >
                  {([1, 2, 3, 4] as const).map((seasonNumber) => (
                    <a
                      key={seasonNumber}
                      href={`/players/${playerId}?season=${seasonNumber}`}
                      aria-current={season === seasonNumber ? "page" : undefined}
                      aria-label={`Сезон ${seasonNumber}`}
                      className={`flex min-h-9 items-center justify-center rounded-lg px-1 py-1.5 text-center text-xs font-bold transition-colors sm:min-h-10 sm:py-2 sm:text-sm ${
                        season === seasonNumber
                          ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                          : "text-white/60 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span className="sm:hidden">{seasonNumber}</span>
                      <span className="hidden sm:inline">Сезон {seasonNumber}</span>
                    </a>
                  ))}
                </nav>
                <div className="mt-2 hidden flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-blue-200/80 sm:flex">
                  <a className="hover:text-white" href="#recent-matches">Останні матчі ↓</a>
                  <a className="hover:text-white" href="#player-honours">Досягнення ↓</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HEAVY PROFILE DATA */}

      <Suspense
        key={`${playerId}-${season}`}
        fallback={
          <PlayerProfileDataFallback />
        }
      >
        <PlayerProfileData
          playerId={playerId}
          season={season}
        />
      </Suspense>

      {/* FOOTER */}

            {/* FOOTER */}
      <SiteFooter />
    </main>
  );
}