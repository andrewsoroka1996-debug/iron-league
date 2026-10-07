export type LeagueMatch = {
  id: string;
  round?: number;
  home: string;
  away: string;
  homeGoals: number | null;
  awayGoals: number | null;
};

export type StandingRow = {
  playerId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export function calculateStandings(
  playerIds: readonly string[],
  matches: readonly LeagueMatch[]
): StandingRow[] {
  const table = new Map<string, StandingRow>();

  playerIds.forEach((playerId) => {
    table.set(playerId, {
      playerId,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  });

  matches.forEach((match) => {
    if (
      match.homeGoals === null ||
      match.awayGoals === null
    ) {
      return;
    }

    const home = table.get(match.home);
    const away = table.get(match.away);

    if (!home || !away) {
      return;
    }

    home.played += 1;
    away.played += 1;

    home.goalsFor += match.homeGoals;
    home.goalsAgainst += match.awayGoals;

    away.goalsFor += match.awayGoals;
    away.goalsAgainst += match.homeGoals;

    if (match.homeGoals > match.awayGoals) {
      home.wins += 1;
      home.points += 3;

      away.losses += 1;
    } else if (match.homeGoals < match.awayGoals) {
      away.wins += 1;
      away.points += 3;

      home.losses += 1;
    } else {
      home.draws += 1;
      away.draws += 1;

      home.points += 1;
      away.points += 1;
    }
  });

  const standings = Array.from(table.values()).map(
    (row) => ({
      ...row,
      goalDifference:
        row.goalsFor - row.goalsAgainst,
    })
  );

  const originalOrder = new Map(
    playerIds.map((id, index) => [id, index])
  );

  standings.sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }

    if (b.goalDifference !== a.goalDifference) {
      return b.goalDifference - a.goalDifference;
    }

    if (b.goalsFor !== a.goalsFor) {
      return b.goalsFor - a.goalsFor;
    }

    return (
      (originalOrder.get(a.playerId) ?? 999) -
      (originalOrder.get(b.playerId) ?? 999)
    );
  });

  return standings;
}