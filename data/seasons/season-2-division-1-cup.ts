export const season2Division1Cup = {
  season: 2,
  competition: "division-1-cup",
  division: 1,

  playoffs: {
    roundOf16: [
      ["volodyabes", "thelp9"],
      ["monkeyscott", "burdey1992"],
      ["holy", "volodyathegooner"],
      ["mykhaok", "forzajuve-1987"],
      ["gadyuka-88", "saimonspy"],
      ["andrew-sm", "valdemar"],
      ["proevolution10", "roma-zubrik"],
      ["taraaasyk-unl", "19lenya19"],
    ],

    quarterfinals: [
      ["volodyabes", "burdey1992"],
      ["volodyathegooner", "mykhaok"],
      ["saimonspy", "andrew-sm"],
      ["roma-zubrik", "19lenya19"],
    ],

    semifinals: [
      ["volodyabes", "mykhaok"],
      ["saimonspy", "roma-zubrik"],
    ],

    final: [
      "volodyabes",
      "saimonspy",
    ],
  },
} as const;