export type SeasonNumber = 1 | 2 | 3 | 4;

export type CompetitionCategory =
  | "qualification"
  | "division"
  | "division-cup"
  | "europe"
  | "associations"
  | "coop";

export type CompetitionConfig = {
  id: string;
  name: string;
  category: CompetitionCategory;
  division?: 1 | 2 | 3 | 4;
};

export const seasonCompetitions: Record<
  SeasonNumber,
  readonly CompetitionConfig[]
> = {
  /*
    ========================================
    СЕЗОН 1
    ========================================
  */

  1: [
    {
      id: "season-qualification",
      name: "Кваліфікація",
      category: "qualification",
    },

    {
      id: "division-1",
      name: "1 Дивізіон",
      category: "division",
      division: 1,
    },

    {
      id: "division-2",
      name: "2 Дивізіон",
      category: "division",
      division: 2,
    },

    {
      id: "division-3",
      name: "3 Дивізіон",
      category: "division",
      division: 3,
    },

    {
      id: "division-1-cup",
      name: "Кубок 1 Дивізіону",
      category: "division-cup",
      division: 1,
    },

    {
      id: "division-2-cup",
      name: "Кубок 2 Дивізіону",
      category: "division-cup",
      division: 2,
    },

    {
      id: "division-3-cup",
      name: "Кубок 3 Дивізіону",
      category: "division-cup",
      division: 3,
    },

    {
      id: "champions-league",
      name: "Ліга чемпіонів",
      category: "europe",
    },

    {
      id: "europa-league",
      name: "Ліга Європи",
      category: "europe",
    },

    {
      id: "european-super-cup",
      name: "Суперкубок Європи",
      category: "europe",
    },
  ],

  /*
    ========================================
    СЕЗОН 2
    ========================================
  */

  2: [
    {
      id: "season-qualification",
      name: "Кваліфікація",
      category: "qualification",
    },

    {
      id: "division-1",
      name: "1 Дивізіон",
      category: "division",
      division: 1,
    },

    {
      id: "division-2",
      name: "2 Дивізіон",
      category: "division",
      division: 2,
    },

    {
      id: "division-3",
      name: "3 Дивізіон",
      category: "division",
      division: 3,
    },

    {
      id: "division-4",
      name: "4 Дивізіон",
      category: "division",
      division: 4,
    },

    {
      id: "division-1-cup",
      name: "Кубок 1 Дивізіону",
      category: "division-cup",
      division: 1,
    },

    {
      id: "division-2-cup",
      name: "Кубок 2 Дивізіону",
      category: "division-cup",
      division: 2,
    },

    {
      id: "division-3-cup",
      name: "Кубок 3 Дивізіону",
      category: "division-cup",
      division: 3,
    },

    {
      id: "champions-league",
      name: "Ліга чемпіонів",
      category: "europe",
    },

    {
      id: "europa-league",
      name: "Ліга Європи",
      category: "europe",
    },

    {
      id: "european-super-cup",
      name: "Суперкубок Європи",
      category: "europe",
    },

    {
      id: "associations-cup",
      name: "Кубок асоціацій",
      category: "associations",
    },
  ],

  /*
    ========================================
    СЕЗОН 3
    ========================================

    Є тільки Кубок асоціацій.
    Окремої Ліги асоціацій немає.
  */

  3: [
    {
      id: "season-qualification",
      name: "Кваліфікація",
      category: "qualification",
    },

    {
      id: "division-1",
      name: "1 Дивізіон",
      category: "division",
      division: 1,
    },

    {
      id: "division-2",
      name: "2 Дивізіон",
      category: "division",
      division: 2,
    },

    {
      id: "division-3",
      name: "3 Дивізіон",
      category: "division",
      division: 3,
    },

    {
      id: "division-4",
      name: "4 Дивізіон",
      category: "division",
      division: 4,
    },

    {
      id: "division-1-cup",
      name: "Кубок 1 Дивізіону",
      category: "division-cup",
      division: 1,
    },

    {
      id: "division-2-cup",
      name: "Кубок 2 Дивізіону",
      category: "division-cup",
      division: 2,
    },

    {
      id: "division-3-cup",
      name: "Кубок 3 Дивізіону",
      category: "division-cup",
      division: 3,
    },

    {
      id: "division-4-cup",
      name: "Кубок 4 Дивізіону",
      category: "division-cup",
      division: 4,
    },

    {
      id: "champions-league",
      name: "Ліга чемпіонів",
      category: "europe",
    },

    {
      id: "europa-league",
      name: "Ліга Європи",
      category: "europe",
    },

    {
      id: "conference-league",
      name: "Ліга конференцій",
      category: "europe",
    },

    {
      id: "european-super-cup",
      name: "Суперкубок Європи",
      category: "europe",
    },

    {
      id: "associations-cup",
      name: "Кубок асоціацій",
      category: "associations",
    },

    {
      id: "iron-coop-cup",
      name: "Iron Co-op Cup",
      category: "coop",
    },
  ],

  /*
    ========================================
    СЕЗОН 4
    ========================================
  */

  4: [],
};