/*
  ========================================
  IRON LEAGUE
  СТАРТОВА ТАБЛИЦЯ — СЕЗОН 4
  ========================================

  Цей список публікується
  перед початком нового сезону.

  ПОРЯДОК МАЄ ЗНАЧЕННЯ.

  1-й запис = місце 1
  ...
  48-й запис = місце 48

  Старі гравці мають свій
  коефіцієнт із попереднього сезону.

  Новачки йдуть унизу списку.
  Для них coefficient = 0,
  оскільки історичного
  коефіцієнта ще немає.
*/

export type SeasonRegistrationPlayer = {
  playerId: string;

  coefficient: number;

  newcomer?: boolean;
};

export const season4Registration:
  readonly SeasonRegistrationPlayer[] = [
  /*
    Приклад:

    {
      playerId: "player-1",
      coefficient: 650,
    },

    {
      playerId: "new-player",
      coefficient: 0,
      newcomer: true,
    },
  */
];