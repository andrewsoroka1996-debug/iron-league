export const europeanSuperCupConfig = {
  competition: "european-super-cup",

  name: "Суперкубок Європи",

  format: "single-match",

  legs: 1,

  participants: {
    player1: {
      source: "champions-league",
      position: "winner",
    },

    player2: {
      source: "europa-league",
      position: "winner",
    },
  },

  seasons: [1, 2, 3, 4],
} as const;