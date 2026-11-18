/**
 * Season 4 player account: read-only direct-match grouping.
 * A pair of matches against one opponent is a UI group, NOT one database match.
 * No authentication or authorization is performed here; this is presentation logic.
 */
export type PlayerAccountMatch = {
  id: string;
  season: number;
  competition: string;
  division: number | null;
  stage: string | null;
  group_name: string | null;
  round: number | string | null;
  leg: number | null;
  participant_type: string;
  home_id: string;
  away_id: string;
  home_goals: number | null;
  away_goals: number | null;
  status: string;
  played_at: string | null;
};

export type PlayerMatchGroup = {
  key: string;
  season: number;
  competition: string;
  division: number | null;
  participantType: string;
  opponentId: string;
  matches: PlayerAccountMatch[];
};

export type PlayerMatchCounts = {
  scheduled: number;
  finished: number;
  closedUnplayed: number;
  other: number;
};

function statusRank(status: string): number {
  switch (status) {
    case "scheduled": return 0;
    case "finished": return 1;
    case "closed_unplayed": return 2;
    default: return 3;
  }
}

function numberOrInfinity(value: number | string | null): number {
  if (value === null || value === "") return Number.POSITIVE_INFINITY;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : Number.POSITIVE_INFINITY;
}

/** Groups only matches where playerId is an actual home/away participant ID.
 * Co-op team membership and association representative roles require separate
 * server-side resolution; they must not be guessed from player nicknames.
 */
export function groupDirectPlayerMatches(
  matches: readonly PlayerAccountMatch[],
  playerId: string,
  season: number = 4,
): PlayerMatchGroup[] {
  const grouped = new Map<string, PlayerMatchGroup>();
  const seenMatchIds = new Set<string>();

  for (const match of matches) {
    if (match.season !== season) continue;
    const isHome = match.home_id === playerId;
    const isAway = match.away_id === playerId;
    if (!isHome && !isAway) continue;
    // Same player on both sides is invalid for opponent-based grouping.
    if (isHome && isAway) continue;
    if (seenMatchIds.has(match.id)) continue;
    seenMatchIds.add(match.id);

    const opponentId = isHome ? match.away_id : match.home_id;
    if (!opponentId) continue;
    const key = JSON.stringify([
      match.season,
      match.competition,
      match.division,
      match.participant_type,
      opponentId,
    ]);

    let group = grouped.get(key);
    if (!group) {
      group = {
        key,
        season: match.season,
        competition: match.competition,
        division: match.division,
        participantType: match.participant_type,
        opponentId,
        matches: [],
      };
      grouped.set(key, group);
    }
    group.matches.push(match);
  }

  const results = [...grouped.values()];
  for (const group of results) {
    group.matches.sort((a, b) =>
      numberOrInfinity(a.round) - numberOrInfinity(b.round) ||
      numberOrInfinity(a.leg) - numberOrInfinity(b.leg) ||
      a.id.localeCompare(b.id)
    );
  }

  results.sort((a, b) => {
    const aPriority = Math.min(...a.matches.map((match) => statusRank(match.status)));
    const bPriority = Math.min(...b.matches.map((match) => statusRank(match.status)));
    return aPriority - bPriority ||
      a.competition.localeCompare(b.competition, "uk") ||
      (a.division ?? 0) - (b.division ?? 0) ||
      a.opponentId.localeCompare(b.opponentId, "uk");
  });
  return results;
}

export function countDirectPlayerMatches(groups: readonly PlayerMatchGroup[]): PlayerMatchCounts {
  const counts: PlayerMatchCounts = {
    scheduled: 0,
    finished: 0,
    closedUnplayed: 0,
    other: 0,
  };
  for (const group of groups) {
    for (const match of group.matches) {
      if (match.status === "scheduled") counts.scheduled++;
      else if (match.status === "finished") counts.finished++;
      else if (match.status === "closed_unplayed") counts.closedUnplayed++;
      else counts.other++;
    }
  }
  return counts;
}
