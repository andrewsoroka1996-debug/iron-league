/*
  ========================================
  IRON LEAGUE
  ЖЕРЕБКУВАННЯ АСОЦІАЦІЙ — СЕЗОН 4
  ========================================

  Сюди вносимо ОФІЦІЙНИЙ
  результат жеребкування.

  У кожній Асоціації:
  6 гравців.

  Повинно бути:
  1 × R1
  1 × R2
  1 × R3
  1 × R4
  1 × R5
  1 × R6
*/

export type SeasonAssociationDrawEntry = {
  associationId: string;

  playerIds:
    readonly string[];
};

export const season4AssociationDraw:
  readonly SeasonAssociationDrawEntry[] = [
  /*
    ПРИКЛАД:

    {
      associationId: "fra",

      playerIds: [
        "player-r1",
        "player-r2",
        "player-r3",
        "player-r4",
        "player-r5",
        "player-r6",
      ],
    },
  */
];