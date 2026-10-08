export const season1Division1Cup = {
  season: 1,
  competition: "division-1-cup",
  division: 1,

  playoffs: {
    roundOf16: [
      ["proevolution10", "19lenya19"],
      ["valdemar", "burdey1992"],
      ["volodyabes", "joker-pes"],
      ["demon-ua", "taraaasyk-unl"],
      ["holy", "everlast-ua"],
      ["forzajuve-1987", "monkeyscott"],
      ["gadyuka-88", "6abovha"],
      ["mykhaok", "andrew-sm"],
    ],

    quarterfinals: [
      ["proevolution10", "burdey1992"],
      ["volodyabes", "taraaasyk-unl"],
      ["holy", "monkeyscott"],
      ["gadyuka-88", "mykhaok"],
    ],

    semifinals: [
      ["proevolution10", "volodyabes"],
      ["monkeyscott", "mykhaok"],
    ],

    final: [
      "volodyabes",
      "mykhaok",
    ],
  },
} as const;