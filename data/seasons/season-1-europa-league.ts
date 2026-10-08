export const season1EuropaLeague = {
  season: 1,
  competition: "europa-league",

  groups: {
    A: [
      "senatoreua",
      "romario",
      "arthurchamp07",
      "mikha-too-easy",
    ],

    B: [
      "parabellum",
      "mokasi",
      "jack0o",
      "maks191",
    ],

    C: [
      "ruslan228",
      "cybercothlete",
      "glorytoukraine",
      "vasylhladysh",
    ],

    D: [
      "deyl",
      "mao",
      "mykyta",
      "nf-dr-k",
    ],
  },

  playoffs: {
    roundOf16: [
      ["monkeyscott", "mokasi"],
      ["d-odessaua", "ruslan228"],
      ["19lenya19", "cybercothlete"],
      ["pes-ukr", "parabellum"],
      ["futband1t", "romario"],
      ["forzajuve-1987", "deyl"],
      ["burdey1992", "mao"],
      ["edjuk", "senatoreua"],
    ],

    quarterfinals: [
      ["monkeyscott", "d-odessaua"],
      ["cybercothlete", "parabellum"],
      ["futband1t", "deyl"],
      ["burdey1992", "edjuk"],
    ],

    semifinals: [
      ["monkeyscott", "parabellum"],
      ["futband1t", "burdey1992"],
    ],

    final: [
      "parabellum",
      "burdey1992",
    ],
  },
} as const;