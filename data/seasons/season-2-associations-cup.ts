export const season2AssociationsCup = {
  season: 2,
  competition: "associations-cup",

  associations: {
    brazil: {
      name: "Бразилія",
      players: [
        "roma-zubrik",
        "thelp9",
        "alexliv",
        "ruslan228",
        "4ydeca",
        "as0910",
      ],
    },

    netherlands: {
      name: "Нідерланди",
      players: [
        "volodyathegooner",
        "futband1t",
        "forzajuve-1987",
        "everlast-ua",
        "verhor28",
        "v0id-ex",
      ],
    },

    france: {
      name: "Франція",
      players: [
        "gadyuka-88",
        "cybercothlete",
        "19lenya19",
        "senatoreua",
        "vladiken7",
        "antidemon39",
      ],
    },

    england: {
      name: "Англія",
      players: [
        "taraaasyk-unl",
        "deyl",
        "pes-ukr",
        "canb14",
        "levlad11",
        "ruslanuapes",
      ],
    },

    italy: {
      name: "Італія",
      players: [
        "proevolution10",
        "holy",
        "kandrat94",
        "demon-ua",
        "soga",
        "awp-fun",
      ],
    },

    portugal: {
      name: "Португалія",
      players: [
        "volodyabes",
        "parabellum",
        "glorytoukraine",
        "d-odessaua",
        "vovamonte",
        "kol3nbka",
      ],
    },

    spain: {
      name: "Іспанія",
      players: [
        "mykhaok",
        "monkeyscott",
        "andrew-sm",
        "joker-pes",
        "makson",
        "no-stress23",
      ],
    },

    argentina: {
      name: "Аргентина",
      players: [
        "burdey1992",
        "saimonspy",
        "valdemar",
        "mao",
        "olejose11",
        "zidane4423",
      ],
    },
  },

  playoffs: {
    quarterfinals: [
      ["brazil", "netherlands"],
      ["france", "england"],
      ["italy", "portugal"],
      ["spain", "argentina"],
    ],

    semifinals: [
      ["netherlands", "france"],
      ["portugal", "argentina"],
    ],

    final: [
      "france",
      "argentina",
    ],

    thirdPlace: [
      "netherlands",
      "portugal",
    ],
  },
} as const;