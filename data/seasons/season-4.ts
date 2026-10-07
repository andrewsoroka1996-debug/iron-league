export const season4 = {
  id: 4,
  name: "Сезон 4",
  status: "preparation",

  // =========================
  // ДИВІЗІОНИ
  // =========================

  division1: {
    id: "division-1",
    name: "1 Дивізіон",
    type: "division",
    players: [],
  },

  division2: {
    id: "division-2",
    name: "2 Дивізіон",
    type: "division",
    players: [],
  },

  division3: {
    id: "division-3",
    name: "3 Дивізіон",
    type: "division",
    players: [],
  },

  division4: {
    id: "division-4",
    name: "4 Дивізіон",
    type: "division",
    players: [],
  },

  // =========================
  // ЛІГА ЧЕМПІОНІВ
  // =========================

  championsLeague: {
    id: "champions-league",
    name: "Ліга чемпіонів",
    type: "group-stage",

    groups: {
      A: [],
      B: [],
      C: [],
      D: [],
      E: [],
      F: [],
      G: [],
      H: [],
    },
  },

  // =========================
  // ЛІГА ЄВРОПИ
  // =========================

  europaLeague: {
    id: "europa-league",
    name: "Ліга Європи",
    type: "group-stage",

    groups: {
      A: [],
      B: [],
      C: [],
      D: [],
    },
  },

  // =========================
  // ЛІГА КОНФЕРЕНЦІЙ
  // =========================

  conferenceLeague: {
    id: "conference-league",
    name: "Ліга конференцій",
    type: "group-stage",

    groups: {
      A: [],
      B: [],
      C: [],
      D: [],
    },
  },

  // =========================
  // КУБКИ ДИВІЗІОНІВ
  // =========================

  division1Cup: {
    id: "division-1-cup",
    name: "Кубок 1 Дивізіону",
    type: "knockout",
    players: [],
  },

  division2Cup: {
    id: "division-2-cup",
    name: "Кубок 2 Дивізіону",
    type: "knockout",
    players: [],
  },

  division3Cup: {
    id: "division-3-cup",
    name: "Кубок 3 Дивізіону",
    type: "knockout",
    players: [],
  },

  division4Cup: {
    id: "division-4-cup",
    name: "Кубок 4 Дивізіону",
    type: "knockout",
    players: [],
  },

  // =========================
  // ЛІГА АСОЦІАЦІЙ
  // =========================

  associationsLeague: {
    id: "associations-league",
    name: "Ліга асоціацій",
    type: "team-league",

    associations: {
      fra: {
        name: "Франція",
        players: [],
      },

      bra: {
        name: "Бразилія",
        players: [],
      },

      esp: {
        name: "Іспанія",
        players: [],
      },

      eng: {
        name: "Англія",
        players: [],
      },

      ned: {
        name: "Нідерланди",
        players: [],
      },

      ita: {
        name: "Італія",
        players: [],
      },

      arg: {
        name: "Аргентина",
        players: [],
      },

      por: {
        name: "Португалія",
        players: [],
      },
    },
  },

  // =========================
  // КУБОК АСОЦІАЦІЙ
  // =========================

  associationsCup: {
    id: "associations-cup",
    name: "Кубок асоціацій",
    type: "team-knockout",

    quarterfinals: [],
  },

  // =========================
  // IRON CO-OP CUP
  // =========================

  ironCoopCup: {
    id: "iron-coop-cup",
    name: "Iron Co-op Cup",
    type: "team-knockout",
    teamSize: 2,

    teams: [],
  },
};