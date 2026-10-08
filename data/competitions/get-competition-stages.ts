import type { SeasonNumber } from "./season-competitions";

export type CompetitionStage = {
  value: string;
  label: string;
};

const leagueStage: CompetitionStage[] = [
  {
    value: "league",
    label: "Ліга",
  },
];

const qualificationStage: CompetitionStage[] = [
  {
    value: "qualification",
    label: "Кваліфікація",
  },
];

const europeanStages: CompetitionStage[] = [
  {
    value: "group",
    label: "Груповий етап",
  },
  {
    value: "round-of-16",
    label: "1/8 фіналу",
  },
  {
    value: "quarterfinal",
    label: "1/4 фіналу",
  },
  {
    value: "semifinal",
    label: "1/2 фіналу",
  },
  {
    value: "final",
    label: "Фінал",
  },
];

const knockoutStages: CompetitionStage[] = [
  {
    value: "round-of-16",
    label: "1/8 фіналу",
  },
  {
    value: "quarterfinal",
    label: "1/4 фіналу",
  },
  {
    value: "semifinal",
    label: "1/2 фіналу",
  },
  {
    value: "final",
    label: "Фінал",
  },
];

const associationsCupStages: CompetitionStage[] = [
  {
    value: "quarterfinal",
    label: "1/4 фіналу",
  },
  {
    value: "semifinal",
    label: "1/2 фіналу",
  },
  {
    value: "final",
    label: "Фінал",
  },
];

const season2AssociationsCupStages: CompetitionStage[] = [
  {
    value: "quarterfinal",
    label: "1/4 фіналу",
  },
  {
    value: "semifinal",
    label: "1/2 фіналу",
  },
  {
    value: "final",
    label: "Фінал",
  },
  {
    value: "third-place",
    label: "Матч за 3 місце",
  },
];

const superCupStages: CompetitionStage[] = [
  {
    value: "final",
    label: "Фінал",
  },
];

export function getCompetitionStages({
  season,
  competition,
}: {
  season: SeasonNumber;
  competition: string;
}): CompetitionStage[] {
  /*
    ========================================
    КВАЛІФІКАЦІЯ
    ========================================
  */

  if (
    competition ===
    "season-qualification"
  ) {
    return qualificationStage;
  }

  /*
    ========================================
    ДИВІЗІОНИ
    ========================================
  */

  if (
    competition === "division-1" ||
    competition === "division-2" ||
    competition === "division-3" ||
    competition === "division-4"
  ) {
    return leagueStage;
  }

  /*
    ========================================
    КУБКИ ДИВІЗІОНІВ
    ========================================

    Матчу за 3 місце немає.
  */

  if (
    competition === "division-1-cup" ||
    competition === "division-2-cup" ||
    competition === "division-3-cup" ||
    competition === "division-4-cup"
  ) {
    return knockoutStages;
  }

  /*
    ========================================
    ЛІГА ЧЕМПІОНІВ
    ========================================
  */

  if (
    competition ===
    "champions-league"
  ) {
    return europeanStages;
  }

  /*
    ========================================
    ЛІГА ЄВРОПИ
    ========================================
  */

  if (
    competition ===
    "europa-league"
  ) {
    return europeanStages;
  }

  /*
    ========================================
    ЛІГА КОНФЕРЕНЦІЙ
    ========================================
  */

  if (
    competition ===
    "conference-league"
  ) {
    return europeanStages;
  }

  /*
    ========================================
    СУПЕРКУБОК ЄВРОПИ
    ========================================

    Один матч.
  */

  if (
    competition ===
    "european-super-cup"
  ) {
    return superCupStages;
  }

  /*
    ========================================
    ЛІГА АСОЦІАЦІЙ
    ========================================
  */

  if (
    competition ===
    "league-of-associations"
  ) {
    return leagueStage;
  }

  /*
    ========================================
    КУБОК АСОЦІАЦІЙ
    ========================================

    У Сезоні 2 був окремий
    матч за 3 місце.
  */

  if (
    competition ===
    "associations-cup"
  ) {
    if (season === 2) {
      return season2AssociationsCupStages;
    }

    return associationsCupStages;
  }

  /*
    ========================================
    IRON CO-OP CUP
    ========================================

    1/8 -> 1/4 -> 1/2 -> фінал.

    На кожній стадії 2 матчі.
    Це контролюватимемо через leg.
  */

  if (
    competition ===
    "iron-coop-cup"
  ) {
    return knockoutStages;
  }

  return [];
}