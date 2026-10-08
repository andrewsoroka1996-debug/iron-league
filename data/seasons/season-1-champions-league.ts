export const season1ChampionsLeague = {
  season: 1,
  competition: "champions-league",

  groups: {
    A: [
      "roma-zubrik",
      "proevolution10",
      "d-odessaua",
      "andrew-sm",
    ],

    B: [
      "ha4truka4pro",
      "demon-ua",
      "monkeyscott",
      "zlyi-zenyk",
    ],

    C: [
      "volodyabes",
      "levlad11",
      "19lenya19",
      "nazarius",
    ],

    D: [
      "gadyuka-88",
      "alexliv",
      "burdey1992",
      "canb14",
    ],

    E: [
      "holy",
      "thelp9",
      "edjuk",
      "everlast-ua",
    ],

    F: [
      "saimonspy",
      "taraaasyk-unl",
      "forzajuve-1987",
      "kandrat94",
    ],

    G: [
      "valdemar",
      "joker-pes",
      "futband1t",
      "kol3nbka",
    ],

    H: [
      "mykhaok",
      "volodyathegooner",
      "pes-ukr",
      "6abovha",
    ],
  },

  playoffs: {
    roundOf16: [
      ["volodyabes", "demon-ua"],
      ["valdemar", "taraaasyk-unl"],
      ["mykhaok", "proevolution10"],
      ["ha4truka4pro", "alexliv"],
      ["roma-zubrik", "thelp9"],
      ["saimonspy", "joker-pes"],
      ["holy", "volodyathegooner"],
      ["gadyuka-88", "levlad11"],
    ],

    quarterfinals: [
      ["volodyabes", "taraaasyk-unl"],
      ["proevolution10", "ha4truka4pro"],
      ["roma-zubrik", "saimonspy"],
      ["volodyathegooner", "gadyuka-88"],
    ],

    semifinals: [
      ["volodyabes", "proevolution10"],
      ["saimonspy", "gadyuka-88"],
    ],

    final: [
      "volodyabes",
      "gadyuka-88",
    ],
  },
} as const;