/** Pure ranking helper: no database access and no changes to coefficient rules. */
export type AverageSeasonInputRow = {
  key: string;
  playerId: string | null;
  playerName: string;
  total: number;
};

export type AverageSeasonGroup = {
  season: number;
  rows: readonly AverageSeasonInputRow[];
};

export type AverageCoefficientRow = {
  key: string;
  playerId: string | null;
  playerName: string;
  /** Unrounded average; always sort using this value. */
  total: number;
  /** Total points across the seasons the player actually took part in. */
  sum: number;
  seasonCount: number;
  /** Present only for participated seasons; a zero total is still participation. */
  seasonPoints: { season: number; points: number }[];
};

/**
 * Each actual season is counted once for every participating player.
 * A season without a row is NOT counted as zero. A row with zero points IS counted.
 * If a source contains two rows with the same key in one season, they are first
 * combined into that season (not counted as two participating seasons).
 */
export function buildAverageCoefficientRows(
  groups: readonly AverageSeasonGroup[]
): AverageCoefficientRow[] {
  type Accumulator = {
    key: string;
    playerId: string | null;
    playerName: string;
    values: Map<number, number>;
  };

  const map = new Map<string, Accumulator>();

  // Newest groups first so that the displayed name is the most recent one.
  for (const group of [...groups].sort((a, b) => b.season - a.season)) {
    for (const row of group.rows) {
      if (!Number.isFinite(row.total)) {
        throw new Error(`Average coefficient: invalid points for ${row.key}`);
      }
      let entry = map.get(row.key);
      if (!entry) {
        entry = {
          key: row.key,
          playerId: row.playerId,
          playerName: row.playerName,
          values: new Map(),
        };
        map.set(row.key, entry);
      }
      entry.values.set(group.season, (entry.values.get(group.season) ?? 0) + row.total);
      if (!entry.playerId && row.playerId) entry.playerId = row.playerId;
    }
  }

  return [...map.values()]
    .map((entry): AverageCoefficientRow => {
      const seasonPoints = [...entry.values.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([season, points]) => ({ season, points }));
      const sum = seasonPoints.reduce((total, item) => total + item.points, 0);
      const seasonCount = seasonPoints.length;
      return {
        key: entry.key,
        playerId: entry.playerId,
        playerName: entry.playerName,
        total: sum / seasonCount,
        sum,
        seasonCount,
        seasonPoints,
      };
    })
    .filter((row) => row.sum > 0)
    .sort((a, b) =>
      // Перший критерій — кількість сезонів участі.
      b.seasonCount - a.seasonCount ||
      // Усередині групи — точний середній коефіцієнт (без округлення).
      b.total - a.total ||
      b.sum - a.sum ||
      a.playerName.localeCompare(b.playerName)
    );
}
