export const season2Division2Cup = {
  season: 2,
  competition: "division-2-cup",
  division: 2,

  playoffs: {
    roundOf16: [
      ["everlast-ua", "ruslan228"],
      ["kandrat94", "d-odessaua"],
      ["alexliv", "parabellum"],
      ["pes-ukr", "cybercothlete"],
      ["demon-ua", "senatoreua"],
      ["canb14", "glorytoukraine"],
      ["joker-pes", "mao"],
      ["futband1t", "deyl"],
    ],

    quarterfinals: [
      ["everlast-ua", "d-odessaua"],
      ["alexliv", "cybercothlete"],
      ["demon-ua", "glorytoukraine"],
      ["joker-pes", "deyl"],
    ],

    semifinals: [
      ["everlast-ua", "alexliv"],
      ["glorytoukraine", "deyl"],
    ],

    final: [
      "alexliv",
      "deyl",
    ],
  },
} as const;