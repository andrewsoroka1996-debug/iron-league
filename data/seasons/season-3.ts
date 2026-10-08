export const season3 = {
  number: 3,

  /*
    ========================================
    ДИВІЗІОН 1
    ========================================
  */

  division1: {
    id: "division-1",
    name: "1 Дивізіон",
    type: "division",

    players: [
      "everlast-ua",
      "andrew-sm",
      "proevolution10",
      "volodyabes",
      "volodyathegooner",
      "roma-zubrik",
      "saimonspy",
      "holy",
      "burdey1992",
      "alexliv",
      "19lenya19",
      "glorytoukraine",
      "mykhaok",
      "thelp9",
      "senatoreua",
      "gadyuka-88",
    ] as readonly string[],
  },

  /*
    ========================================
    ДИВІЗІОН 2
    ========================================
  */

  division2: {
    id: "division-2",
    name: "2 Дивізіон",
    type: "division",

    players: [
      "ruslanuapes",
      "awp-fun",
      "soga",
      "pes-ukr",
      "d-odessaua",
      "vovamonte",
      "4ydeca",
      "vladiken7",
      "valdemar",
      "canb14",
      "ruslan228",
      "forzajuve-1987",
      "joker-pes",
      "no-stress23",
      "parabellum",
      "taraaasyk-unl",
    ] as readonly string[],
  },

  /*
    ========================================
    ДИВІЗІОН 3
    ========================================
  */

  division3: {
    id: "division-3",
    name: "3 Дивізіон",
    type: "division",

    players: [
      "kopriz-ua",
      "klinovuy",
      "olejose11",
      "gv1don-14",
      "demon-ua",
      "zidane4423",
      "nf-dr-k",
      "rufer",
      "torre-odor",
      "shtepaua",
      "kol3nbka",
      "jack0o",
      "pes-duke",
      "deyl",
      "antidemon39",
      "broap",
    ] as readonly string[],
  },

  /*
    ========================================
    ДИВІЗІОН 4
    ========================================
  */

  division4: {
    id: "division-4",
    name: "4 Дивізіон",
    type: "division",

    players: [
      "frenky777",
      "as0910",
      "levlad11",
      "mikha-too-easy",
      "arthurchamp07",
      "yt-ratibor-ua",
      "pawerserg",
      "ef-playbot",
      "verhor28",
      "yokoay",
      "eugene-magic",
      "valento",
      "yuraboo",
      "pavuk",
      "oleg500",
      "frejzer",
    ] as readonly string[],
  },

  /*
    ========================================
    ЛІГА ЧЕМПІОНІВ
    ========================================
  */

  championsLeague: {
    id: "champions-league",
    name: "Ліга чемпіонів",
    type: "group-stage",

    groups: {
      A: [
        "gadyuka-88",
        "roma-zubrik",
        "canb14",
        "glorytoukraine",
      ],

      B: [
        "d-odessaua",
        "saimonspy",
        "volodyabes",
        "zidane4423",
      ],

      C: [
        "soga",
        "no-stress23",
        "joker-pes",
        "volodyathegooner",
      ],

      D: [
        "holy",
        "demon-ua",
        "parabellum",
        "senatoreua",
      ],

      E: [
        "alexliv",
        "andrew-sm",
        "thelp9",
        "valdemar",
      ],

      F: [
        "4ydeca",
        "ruslan228",
        "mykhaok",
        "awp-fun",
      ],

      G: [
        "vladiken7",
        "proevolution10",
        "taraaasyk-unl",
        "deyl",
      ],

      H: [
        "everlast-ua",
        "burdey1992",
        "19lenya19",
        "vovamonte",
      ],
    },
  },

  /*
    ========================================
    ЛІГА ЄВРОПИ
    ========================================
  */

  europaLeague: {
    id: "europa-league",
    name: "Ліга Європи",
    type: "group-stage",

    groups: {
      A: [
        "klinovuy",
        "kopriz-ua",
        "rufer",
        "shtepaua",
      ],

      B: [
        "broap",
        "olejose11",
        "forzajuve-1987",
        "pes-ukr",
      ],

      C: [
        "kol3nbka",
        "jack0o",
        "pes-duke",
        "torre-odor",
      ],

      D: [
        "antidemon39",
        "gv1don-14",
        "ruslanuapes",
        "nf-dr-k",
      ],
    },
  },

  /*
    ========================================
    ЛІГА КОНФЕРЕНЦІЙ
    ========================================
  */

  conferenceLeague: {
    id: "conference-league",
    name: "Ліга конференцій",
    type: "group-stage",

    groups: {
      A: [
        "arthurchamp07",
        "yt-ratibor-ua",
        "ef-playbot",
        "pawerserg",
      ],

      B: [
        "eugene-magic",
        "frenky777",
        "as0910",
        "mikha-too-easy",
      ],

      C: [
        "frejzer",
        "levlad11",
        "yokoay",
        "pavuk",
      ],

      D: [
        "oleg500",
        "valento",
        "verhor28",
        "yuraboo",
      ],
    },
  },

  /*
    ========================================
    КУБОК 1 ДИВІЗІОНУ
    ========================================

    Одноматчевий формат.
  */

  division1Cup: {
    id: "division-1-cup",
    name: "Кубок 1 Дивізіону",
    type: "knockout",

    legsPerRound: 1,

    players: [
      "everlast-ua",
      "andrew-sm",
      "proevolution10",
      "volodyabes",
      "volodyathegooner",
      "roma-zubrik",
      "saimonspy",
      "holy",
      "burdey1992",
      "alexliv",
      "19lenya19",
      "glorytoukraine",
      "mykhaok",
      "thelp9",
      "senatoreua",
      "gadyuka-88",
    ] as readonly string[],
  },

  /*
    ========================================
    КУБОК 2 ДИВІЗІОНУ
    ========================================
  */

  division2Cup: {
    id: "division-2-cup",
    name: "Кубок 2 Дивізіону",
    type: "knockout",

    legsPerRound: 1,

    players: [
      "ruslanuapes",
      "awp-fun",
      "soga",
      "pes-ukr",
      "d-odessaua",
      "vovamonte",
      "4ydeca",
      "vladiken7",
      "valdemar",
      "canb14",
      "ruslan228",
      "forzajuve-1987",
      "joker-pes",
      "no-stress23",
      "parabellum",
      "taraaasyk-unl",
    ] as readonly string[],
  },

  /*
    ========================================
    КУБОК 3 ДИВІЗІОНУ
    ========================================
  */

  division3Cup: {
    id: "division-3-cup",
    name: "Кубок 3 Дивізіону",
    type: "knockout",

    legsPerRound: 1,

    players: [
      "kopriz-ua",
      "klinovuy",
      "olejose11",
      "gv1don-14",
      "demon-ua",
      "zidane4423",
      "nf-dr-k",
      "rufer",
      "torre-odor",
      "shtepaua",
      "kol3nbka",
      "jack0o",
      "pes-duke",
      "deyl",
      "antidemon39",
      "broap",
    ] as readonly string[],
  },

  /*
    ========================================
    КУБОК 4 ДИВІЗІОНУ
    ========================================
  */

  division4Cup: {
    id: "division-4-cup",
    name: "Кубок 4 Дивізіону",
    type: "knockout",

    legsPerRound: 1,

    players: [
      "frenky777",
      "as0910",
      "levlad11",
      "mikha-too-easy",
      "arthurchamp07",
      "yt-ratibor-ua",
      "pawerserg",
      "ef-playbot",
      "verhor28",
      "yokoay",
      "eugene-magic",
      "valento",
      "yuraboo",
      "pavuk",
      "oleg500",
      "frejzer",
    ] as readonly string[],
  },

  /*
    ========================================
    АСОЦІАЦІЇ СЕЗОНУ 3
    ========================================

    Це НЕ окремий турнір.

    Тут зберігаються тільки
    склади асоціацій Сезону 3.

    Склад тієї самої асоціації
    в іншому сезоні може бути іншим.
  */

  associations: {
    fra: {
      name: "Франція",

      players: [
        "gadyuka-88",
        "alexliv",
        "deyl",
        "d-odessaua",
        "klinovuy",
        "nf-dr-k",
      ] as readonly string[],
    },

    bra: {
      name: "Бразилія",

      players: [
        "19lenya19",
        "everlast-ua",
        "4ydeca",
        "taraaasyk-unl",
        "kol3nbka",
        "rufer",
      ] as readonly string[],
    },

    esp: {
      name: "Іспанія",

      players: [
        "mykhaok",
        "roma-zubrik",
        "zidane4423",
        "vovamonte",
        "gv1don-14",
        "olejose11",
      ] as readonly string[],
    },

    eng: {
      name: "Англія",

      players: [
        "no-stress23",
        "vladiken7",
        "senatoreua",
        "demon-ua",
        "forzajuve-1987",
        "broap",
      ] as readonly string[],
    },

    ned: {
      name: "Нідерланди",

      players: [
        "parabellum",
        "holy",
        "soga",
        "joker-pes",
        "ruslanuapes",
        "antidemon39",
      ] as readonly string[],
    },

    ita: {
      name: "Італія",

      players: [
        "proevolution10",
        "awp-fun",
        "burdey1992",
        "ruslan228",
        "shtepaua",
        "kopriz-ua",
      ] as readonly string[],
    },

    arg: {
      name: "Аргентина",

      players: [
        "andrew-sm",
        "volodyathegooner",
        "thelp9",
        "canb14",
        "pes-ukr",
        "torre-odor",
      ] as readonly string[],
    },

    por: {
      name: "Португалія",

      players: [
        "volodyabes",
        "saimonspy",
        "glorytoukraine",
        "valdemar",
        "jack0o",
        "pes-duke",
      ] as readonly string[],
    },
  },

  /*
    ========================================
    КУБОК АСОЦІАЦІЙ
    ========================================

    Одна пара асоціацій =
    6 окремих матчів гравців.

    Пари гравців 6 на 6
    визначаються вручну.

    За кожен матч:
    перемога = 3 очки
    нічия = 1 очко
    поразка = 0 очок

    Переможець протистояння:

    1. більше очок після 6 матчів
    2. при рівності — краща
       загальна різниця голів
    3. якщо і вона рівна —
       проводиться окрема 7 гра

    Гравці для 7 матчу
    вибираються вручну.
  */

  associationsCup: {
    id: "associations-cup",
    name: "Кубок асоціацій",
    type: "association-knockout",

    playersPerAssociation: 6,

    points: {
      win: 3,
      draw: 1,
      loss: 0,
    },

    tiebreakRules: [
      "points",
      "goal-difference",
      "seventh-match",
    ],

    quarterfinals: [
      {
        home: "fra",
        away: "bra",
      },

      {
        home: "esp",
        away: "eng",
      },

      {
        home: "ned",
        away: "ita",
      },

      {
        home: "arg",
        away: "por",
      },
    ],
  },

  /*
    ========================================
    IRON CO-OP CUP
    ========================================

    16 команд.

    Кожна команда:
    - 2 гравці Iron League
    - назва клубу діючого сезону УПЛ

    Формат:
    1/8
    1/4
    1/2
    фінал

    УСІ стадії складаються
    з двох матчів.

    Фінал також складається
    з двох матчів.

    Переможець визначається
    за сумою голів двох матчів.

    Конкретні 16 команд
    будуть додані пізніше.
  */

  ironCoopCup: {
    id: "iron-coop-cup",
    name: "Iron Co-op Cup",
    type: "team-knockout",

    teamSize: 2,

    teamsCount: 16,

    format: {
      knockout: true,

      legsPerRound: 2,

      finalLegs: 2,

      aggregateScore: true,
    },

    stages: [
      "round-of-16",
      "quarterfinal",
      "semifinal",
      "final",
    ] as const,

    teamNaming: {
      type: "upl-club",

      description:
        "Кожна пара гравців виступає під назвою клубу поточного сезону УПЛ.",
    },

    teams: [],
  },
} as const;