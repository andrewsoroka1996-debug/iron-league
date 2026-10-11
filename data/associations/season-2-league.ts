export type AssociationCupPlacement =
  | "winner"
  | "finalist"
  | "third"
  | "fourth"
  | "quarterfinalist";

export type ArchivedAssociationLeagueRow = {
  place: number;

  associationId: string;
  associationName: string;

  /*
    Історично зафіксована
    сума коефіцієнтів
    членів Асоціації.
  */

  baseCoefficient: number;

  /*
    Результат у Кубку
    асоціацій.
  */

  cupPlacement:
    AssociationCupPlacement;

  cupPlacementLabel: string;

  /*
    Коефіцієнт за виступ
    у Кубку асоціацій.
  */

  multiplier: number;

  /*
    Фінальні очки
    Ліги Асоціацій.

    Історичне значення.
    Нічого не перераховуємо.
  */

  totalPoints: number;
};

/*
  ========================================
  ЛІГА АСОЦІАЦІЙ
  СЕЗОН 2

  ІСТОРИЧНА ТАБЛИЦЯ
  ========================================

  Всі значення зафіксовані
  саме так, як вони були
  опубліковані у Сезоні 2.

  Ця таблиця НЕ повинна
  автоматично перераховуватися.
*/

export const season2AssociationLeague:
  readonly ArchivedAssociationLeagueRow[] = [
  {
    place: 1,

    associationId:
      "france",

    associationName:
      "Франція",

    baseCoefficient:
      650,

    cupPlacement:
      "finalist",

    cupPlacementLabel:
      "Фіналіст",

    multiplier:
      1.8,

    totalPoints:
      1170,
  },

  {
    place: 2,

    associationId:
      "portugal",

    associationName:
      "Португалія",

    baseCoefficient:
      686,

    cupPlacement:
      "third",

    cupPlacementLabel:
      "3 місце",

    multiplier:
      1.7,

    totalPoints:
      1166.2,
  },

  {
    place: 3,

    associationId:
      "argentina",

    associationName:
      "Аргентина",

    baseCoefficient:
      497,

    cupPlacement:
      "winner",

    cupPlacementLabel:
      "Переможець",

    multiplier:
      2,

    totalPoints:
      994,
  },

  {
    place: 4,

    associationId:
      "italy",

    associationName:
      "Італія",

    baseCoefficient:
      559,

    cupPlacement:
      "quarterfinalist",

    cupPlacementLabel:
      "1/4 фіналу",

    multiplier:
      1.5,

    totalPoints:
      838.5,
  },

  {
    place: 5,

    associationId:
      "spain",

    associationName:
      "Іспанія",

    baseCoefficient:
      525,

    cupPlacement:
      "quarterfinalist",

    cupPlacementLabel:
      "1/4 фіналу",

    multiplier:
      1.5,

    totalPoints:
      787.5,
  },

  {
    place: 6,

    associationId:
      "brazil",

    associationName:
      "Бразилія",

    baseCoefficient:
      498,

    cupPlacement:
      "quarterfinalist",

    cupPlacementLabel:
      "1/4 фіналу",

    multiplier:
      1.5,

    totalPoints:
      747,
  },

  {
    place: 7,

    associationId:
      "netherlands",

    associationName:
      "Нідерланди",

    baseCoefficient:
      447,

    cupPlacement:
      "fourth",

    cupPlacementLabel:
      "4 місце",

    multiplier:
      1.6,

    totalPoints:
      715.2,
  },

  {
    place: 8,

    associationId:
      "england",

    associationName:
      "Англія",

    baseCoefficient:
      339,

    cupPlacement:
      "quarterfinalist",

    cupPlacementLabel:
      "1/4 фіналу",

    multiplier:
      1.5,

    totalPoints:
      508.5,
  },
] as const;