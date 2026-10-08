export const season2Division3Cup = {
  season: 2,
  competition: "division-3-cup",
  division: 3,

  playoffs: {
    roundOf16: [
      ["levlad11", "kol3nbka"],
      ["verhor28", "no-stress23"],
      ["soga", "v0id-ex"],
      ["vladiken7", "awp-fun"],
      ["arthurchamp07", "as0910"],
      ["olejose11", "zidane4423"],
      ["4ydeca", "antidemon39"],
      ["vovamonte", "ruslanuapes"],
    ],

    quarterfinals: [
      ["levlad11", "no-stress23"],
      ["soga", "vladiken7"],
      ["arthurchamp07", "zidane4423"],
      ["4ydeca", "vovamonte"],
    ],

    semifinals: [
      ["no-stress23", "soga"],
      ["zidane4423", "4ydeca"],
    ],

    final: [
      "no-stress23",
      "4ydeca",
    ],
  },
} as const;