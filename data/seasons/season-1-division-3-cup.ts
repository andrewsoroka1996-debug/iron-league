export const season1Division3Cup = {
  season: 1,
  competition: "division-3-cup",
  division: 3,

  playoffs: {
    roundOf16: [
      ["romario", "arthurchamp07"],
      ["maks191", "mykyta"],
      ["senatoreua", "cybercothlete"],
      ["mao", "nf-dr-k"],
      ["glorytoukraine", "mikha-too-easy"],
      ["deyl", "parabellum"],
      ["vasylhladysh", "jack0o"],
      ["mokasi", "ruslan228"],
    ],

    quarterfinals: [
      ["romario", "maks191"],
      ["cybercothlete", "nf-dr-k"],
      ["glorytoukraine", "deyl"],
      ["jack0o", "mokasi"],
    ],

    semifinals: [
      ["romario", "cybercothlete"],
      ["deyl", "jack0o"],
    ],

    final: [
      "cybercothlete",
      "deyl",
    ],
  },
} as const;