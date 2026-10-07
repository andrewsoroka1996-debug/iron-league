import type { LeagueMatch } from "./calculateStandings";

export type GeneratedRound = {
  round: number;
  matches: LeagueMatch[];
};

type GeneratorOptions = {
  prefix?: string;
};

export function generateRoundRobin(
  playerIds: readonly string[],
  options: GeneratorOptions = {}
): GeneratedRound[] {
  const { prefix = "match" } = options;

  if (playerIds.length < 2) {
    return [];
  }

  const participants = [...playerIds];

  // Якщо кількість гравців непарна,
  // один гравець у кожному турі відпочиває.
  const bye = "__BYE__";

  if (participants.length % 2 !== 0) {
    participants.push(bye);
  }

  const totalPlayers = participants.length;
  const matchesPerRound = totalPlayers / 2;
  const roundsPerLeg = totalPlayers - 1;

  let rotation = [...participants];

  const firstLeg: GeneratedRound[] = [];

  // =========================
  // ПЕРШЕ КОЛО
  // =========================

  for (
    let roundIndex = 0;
    roundIndex < roundsPerLeg;
    roundIndex++
  ) {
    const roundNumber = roundIndex + 1;

    const matches: LeagueMatch[] = [];

    for (
      let matchIndex = 0;
      matchIndex < matchesPerRound;
      matchIndex++
    ) {
      const first = rotation[matchIndex];

      const second =
        rotation[totalPlayers - 1 - matchIndex];

      if (first === bye || second === bye) {
        continue;
      }

      // Чергуємо домашні та гостьові матчі,
      // щоб календар був більш збалансованим.
      const reverse =
        (roundIndex + matchIndex) % 2 === 1;

      const home = reverse ? second : first;
      const away = reverse ? first : second;

      matches.push({
        id: `${prefix}-r${roundNumber}-m${matchIndex + 1}`,
        round: roundNumber,
        home,
        away,
        homeGoals: null,
        awayGoals: null,
      });
    }

    firstLeg.push({
      round: roundNumber,
      matches,
    });

    // =========================
    // ОБЕРТАННЯ ГРАВЦІВ
    // =========================

    const fixedPlayer = rotation[0];

    const rotatingPlayers = rotation.slice(1);

    const lastPlayer = rotatingPlayers.pop();

    if (lastPlayer !== undefined) {
      rotatingPlayers.unshift(lastPlayer);
    }

    rotation = [
      fixedPlayer,
      ...rotatingPlayers,
    ];
  }

  // =========================
  // ДРУГЕ КОЛО
  // =========================
  //
  // Для 16 гравців:
  //
  // Тур 1  -> Тур 16
  // Тур 2  -> Тур 17
  // ...
  // Тур 15 -> Тур 30
  //
  // Пари залишаються ТОЧНО тими самими.
  // Міняються тільки home та away.

  const secondLeg: GeneratedRound[] =
    firstLeg.map((firstRound) => {
      const secondRoundNumber =
        firstRound.round + roundsPerLeg;

      const matches: LeagueMatch[] =
        firstRound.matches.map(
          (firstMatch, matchIndex) => ({
            id: `${prefix}-r${secondRoundNumber}-m${matchIndex + 1}`,
            round: secondRoundNumber,

            // Міняємо господаря і гостя.
            home: firstMatch.away,
            away: firstMatch.home,

            homeGoals: null,
            awayGoals: null,
          })
        );

      return {
        round: secondRoundNumber,
        matches,
      };
    });

  return [
    ...firstLeg,
    ...secondLeg,
  ];
}