import HistorySeasonLayout from "../../../components/history/HistorySeasonLayout";
import { season4 } from "../../../data/seasons/season-4";

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

const playerIds = Array.from(
  new Set([
    ...season4.division1.players,
    ...season4.division2.players,
    ...season4.division3.players,
    ...season4.division4.players,
  ])
);

function getTournamentCard(
  competitionId: string
): TournamentCard | null {
  if (
    competitionId ===
      "season-qualification" ||
    competitionId ===
      "league-of-associations"
  ) {
    return null;
  }

  if (
    /^division-[1-4]$/.test(
      competitionId
    )
  ) {
    return null;
  }

  if (
    /^division-[1-4]-cup$/.test(
      competitionId
    )
  ) {
    return null;
  }

  if (
    competitionId ===
    "champions-league"
  ) {
    return {
      id: competitionId,
      category: "Єврокубок",
      name: "Ліга чемпіонів",
      href:
        "/tournaments/champions-league?season=4",
    };
  }

  if (
    competitionId ===
    "europa-league"
  ) {
    return {
      id: competitionId,
      category: "Єврокубок",
      name: "Ліга Європи",
      href:
        "/tournaments/europa-league?season=4",
    };
  }

  if (
    competitionId ===
    "conference-league"
  ) {
    return {
      id: competitionId,
      category: "Єврокубок",
      name: "Ліга конференцій",
      href:
        "/tournaments/conference-league?season=4",
    };
  }

  if (
    competitionId ===
    "european-super-cup"
  ) {
    return {
      id: competitionId,
      category: "Суперкубок",
      name: "Суперкубок Європи",
      href:
        "/tournaments/european-super-cup?season=4",
    };
  }

  if (
    competitionId ===
    "associations-cup"
  ) {
    return {
      id: competitionId,
      category: "Асоціації",
      name: "Ліга Асоціацій",
      href:
        "/tournaments/associations?season=4",
    };
  }

  if (
    competitionId ===
    "iron-coop-cup"
  ) {
    return {
      id: competitionId,
      category: "Co-op",
      name: "Iron Co-op Cup",
      href:
        "/tournaments/coop-cup?season=4",
    };
  }

  return null;
}

const competitions =
  seasonCompetitions[4] ?? [];

const hasDivisionCups =
  competitions.some(
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
    href: "/divisions/1?season=4",
  },

  {
    id: "division-2",
    category: "Чемпіонат",
    name: "2 Дивізіон",
    href: "/divisions/2?season=4",
  },

  {
    id: "division-3",
    category: "Чемпіонат",
    name: "3 Дивізіон",
    href: "/divisions/3?season=4",
  },

  {
    id: "division-4",
    category: "Чемпіонат",
    name: "4 Дивізіон",
    href: "/divisions/4?season=4",
  },

  ...competitions
    .map((competition) =>
      getTournamentCard(
        competition.id
      )
    )
    .filter(
      (
        card
      ): card is TournamentCard =>
        card !== null
    ),

  ...(hasDivisionCups
    ? [
        {
          id: "division-cups",
          category: "Кубки",
          name: "Кубки дивізіонів",
          href:
            "/tournaments/division-cups?season=4",
        },
      ]
    : []),
];


export default function Season4HistoryPage() {
  return (
    <HistorySeasonLayout
      season={4}
      divisionCount={4}
      playerCount={playerIds.length}
      tournaments={tournaments}
    />
  );
}
