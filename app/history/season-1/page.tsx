import HistorySeasonLayout from "../../../components/history/HistorySeasonLayout";
import { season1 } from "../../../data/seasons/season-1";

import {
  seasonCompetitions,
} from "../../../data/competitions/season-competitions";


export const dynamic = "force-dynamic";
export const revalidate = 0;

type TournamentCard = {
  id: string;
  category: string;
  name: string;
  href: string;
};

/*
  ========================================
  УЧАСНИКИ ПЕРШОГО СЕЗОНУ
  ========================================
*/

const playerIds = Array.from(
  new Set([
    ...season1.division1.players,
    ...season1.division2.players,
    ...season1.division3.players,
  ])
);

/*
  ========================================
  ТУРНІРИ ПЕРШОГО СЕЗОНУ
  ========================================
*/

function getTournamentCard(
  competitionId: string
): TournamentCard | null {
  /*
    У першому сезоні не було
    асоціацій та Iron Co-op Cup.
  */

  if (
    competitionId === "associations-cup" ||
    competitionId === "league-of-associations" ||
    competitionId === "season-qualification"
  ) {
    return null;
  }

  /*
    Дивізіони вже додаються
    окремими картками.
  */

  if (
    /^division-[1-4]$/.test(competitionId)
  ) {
    return null;
  }

  /*
    Кубки дивізіонів відображаємо
    однією спільною карткою.
  */

  if (
    /^division-[1-4]-cup$/.test(competitionId)
  ) {
    return null;
  }

  if (competitionId === "champions-league") {
    return {
      id: competitionId,
      category: "Єврокубок",
      name: "Ліга чемпіонів",
      href: "/tournaments/champions-league?season=1",
    };
  }

  if (competitionId === "europa-league") {
    return {
      id: competitionId,
      category: "Єврокубок",
      name: "Ліга Європи",
      href: "/tournaments/europa-league?season=1",
    };
  }

  if (competitionId === "conference-league") {
    return {
      id: competitionId,
      category: "Єврокубок",
      name: "Ліга конференцій",
      href: "/tournaments/conference-league?season=1",
    };
  }

  if (competitionId === "european-super-cup") {
    return {
      id: competitionId,
      category: "Суперкубок",
      name: "Суперкубок Європи",
      href: "/tournaments/european-super-cup?season=1",
    };
  }

  if (competitionId === "iron-coop-cup") {
    return null;
  }

  return null;
}

const competitions =
  seasonCompetitions[1] ?? [];

const hasDivisionCups = competitions.some(
  (competition) =>
    /^division-[1-4]-cup$/.test(
      competition.id
    )
);

const tournaments: TournamentCard[] = [
  {
    id: "division-1",
    category: "Чемпіонат",
    name: "1 Дивізіон",
    href: "/divisions/1?season=1",
  },
  {
    id: "division-2",
    category: "Чемпіонат",
    name: "2 Дивізіон",
    href: "/divisions/2?season=1",
  },
  {
    id: "division-3",
    category: "Чемпіонат",
    name: "3 Дивізіон",
    href: "/divisions/3?season=1",
  },

  ...competitions
    .map((competition) =>
      getTournamentCard(competition.id)
    )
    .filter(
      (card): card is TournamentCard =>
        card !== null
    ),

  ...(hasDivisionCups
    ? [
        {
          id: "division-cups",
          category: "Кубки",
          name: "Кубки дивізіонів",
          href: "/tournaments/division-cups?season=1",
        },
      ]
    : []),
];

/*
  ========================================
  ІСТОРІЯ ПЕРШОГО СЕЗОНУ
  ========================================
*/

export default function Season1HistoryPage() {
  return (
    <HistorySeasonLayout
      season={1}
      divisionCount={3}
      playerCount={playerIds.length}
      tournaments={tournaments}
    />
  );
}
