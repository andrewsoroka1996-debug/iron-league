export const season1Division2Cup = {
  season: 1,
  competition: "division-2-cup",
  division: 2,

  playoffs: {
    roundOf16: [
      ["edjuk", "saimonspy"],
      ["ha4truka4pro", "canb14"],
      ["volodyathegooner", "pes-ukr"],
      ["kandrat94", "nazarius"],
      ["futband1t", "zlyi-zenyk"],
      ["roma-zubrik", "kol3nbka"],
      ["levlad11", "thelp9"],
      ["alexliv", "d-odessaua"],
    ],

    quarterfinals: [
      ["edjuk", "ha4truka4pro"],
      ["pes-ukr", "kandrat94"],
      ["futband1t", "roma-zubrik"],
      ["thelp9", "d-odessaua"],
    ],

    semifinals: [
      ["edjuk", "kandrat94"],
      ["roma-zubrik", "thelp9"],
    ],

    final: [
      "kandrat94",
      "roma-zubrik",
    ],
  },
} as const;