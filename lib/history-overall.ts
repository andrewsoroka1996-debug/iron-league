import type { PlayerHonour } from "./player-honours";

export type HistoryWinner = {
  id: string;
  nickname: string;
};

export type HistoryHonourEntry = {
  player: HistoryWinner;
  honours: PlayerHonour[];
};

export type HistoryEdition = {
  key: string;
  season: number;
  title: string;
  category: PlayerHonour["category"];
  players: HistoryWinner[];
};

export type HistoryTournament = {
  id: string;
  title: string;
  category: PlayerHonour["category"];
  editions: HistoryEdition[];
};

export type HistoryRecord = {
  player: HistoryWinner;
  titles: number;
  seasons: number[];
};

export type HistoryOverall = {
  tournaments: HistoryTournament[];
  records: HistoryRecord[];
  editions: number;
  uniqueWinners: number;
  titlesAwardedToPlayers: number;
};

const CATEGORY_ORDER: Record<PlayerHonour["category"], number> = {
  division: 0,
  cup: 1,
  europe: 2,
  "super-cup": 3,
  association: 4,
  coop: 5,
};

// An honour's key already identifies one real tournament edition. It is
// shared by all players from the winning association or co-op team.
export function buildOverallHistory(
  entries: HistoryHonourEntry[],
  onlySeason?: number
): HistoryOverall {
  const editions = new Map<string, HistoryEdition>();
  const records = new Map<string, { player: HistoryWinner; keys: Set<string>; seasons: Set<number> }>();

  for (const { player, honours } of entries) {
    for (const honour of honours) {
      if (onlySeason !== undefined && honour.season !== onlySeason) continue;
      if (![1, 2, 3, 4].includes(honour.season)) continue;
      // One key per edition; repeated data must never increase trophy counts.
      let edition = editions.get(honour.key);
      if (!edition) {
        edition = {
          key: honour.key,
          season: honour.season,
          title: honour.title,
          category: honour.category,
          players: [],
        };
        editions.set(honour.key, edition);
      }
      if (!edition.players.some((winner) => winner.id === player.id)) {
        edition.players.push({ id: player.id, nickname: player.nickname });
      }
      const record = records.get(player.id) ?? {
        player: { id: player.id, nickname: player.nickname },
        keys: new Set<string>(),
        seasons: new Set<number>(),
      };
      record.keys.add(honour.key);
      record.seasons.add(honour.season);
      records.set(player.id, record);
    }
  }

  const tournaments = new Map<string, HistoryTournament>();
  for (const edition of editions.values()) {
    const slug = edition.key.replace(/^season-\d+-/, "");
    const existing = tournaments.get(slug);
    if (existing) {
      existing.editions.push(edition);
    } else {
      tournaments.set(slug, {
        id: slug,
        title: edition.title,
        category: edition.category,
        editions: [edition],
      });
    }
  }

  const sortedTournaments = Array.from(tournaments.values()).sort((a, b) =>
    CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category] ||
    a.title.localeCompare(b.title, "uk")
  );
  for (const tournament of sortedTournaments) {
    tournament.editions.sort((a, b) => b.season - a.season);
    for (const edition of tournament.editions) {
      edition.players.sort((a, b) => a.nickname.localeCompare(b.nickname, "uk"));
    }
  }

  const sortedRecords = Array.from(records.values())
    .map(({ player, keys, seasons }) => ({
      player,
      titles: keys.size,
      seasons: Array.from(seasons).sort((a, b) => b - a),
    }))
    .sort((a, b) => b.titles - a.titles || a.player.nickname.localeCompare(b.player.nickname, "uk"));

  return {
    tournaments: sortedTournaments,
    records: sortedRecords,
    editions: editions.size,
    uniqueWinners: sortedRecords.length,
    titlesAwardedToPlayers: sortedRecords.reduce((sum, record) => sum + record.titles, 0),
  };
}
