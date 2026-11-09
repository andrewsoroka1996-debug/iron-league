import type { CoefficientRow } from "./calculate-coefficients";

// Audit events are append-only. The newest event for a player defines their
// single current decision for season 3. No match or archived season is edited.
export type CoefficientAdjustmentMode = "zero" | "penalty" | "clear";
export type CoefficientAdjustmentScope = "europe" | "all";

export type CoefficientAdjustment = {
  id: number;
  season: number;
  player_id: string;
  scope: CoefficientAdjustmentScope;
  mode: CoefficientAdjustmentMode;
  points: number;
  reason: string;
  created_at: string;
};

export type AppliedCoefficientAdjustment = {
  scope: CoefficientAdjustmentScope;
  mode: "zero" | "penalty";
  points: number;
  reason: string;
  delta: number;
  originalTotal: number;
  originalEurope: number;
};

export type AdjustedCoefficientRow = CoefficientRow & {
  administrativeAdjustment?: AppliedCoefficientAdjustment;
};

export function europeCoefficientPoints(row: CoefficientRow): number {
  const b = row.breakdown;
  return (
    b.championsLeagueMatches +
    b.championsLeagueGroup +
    b.championsLeagueRounds +
    b.championsLeagueFinal +
    b.europaLeagueMatches +
    b.europaLeagueGroup +
    b.europaLeagueRounds +
    b.europaLeagueFinal
  );
}

export function adjustedEuropePoints(row: AdjustedCoefficientRow): number {
  const raw = europeCoefficientPoints(row);
  const adjustment = row.administrativeAdjustment;
  return adjustment?.scope === "europe" ? raw + adjustment.delta : raw;
}

export function applyCoefficientAdjustments(
  rows: CoefficientRow[],
  decisions: CoefficientAdjustment[]
): AdjustedCoefficientRow[] {
  const byPlayer = new Map<string, CoefficientAdjustment>();
  for (const decision of decisions) {
    if (decision.season === 3) byPlayer.set(decision.player_id, decision);
  }

  const adjusted = rows.map((row): AdjustedCoefficientRow => {
    if (row.season !== 3) return row;
    const decision = byPlayer.get(row.playerId);
    if (!decision || decision.mode === "clear") return row;

    const originalEurope = europeCoefficientPoints(row);
    const base = decision.scope === "europe" ? originalEurope : row.total;
    // The coefficient never goes below zero, even with a large penalty.
    const effective = decision.mode === "zero"
      ? 0
      : Math.max(0, base - decision.points);
    const delta = effective - base;
    return {
      ...row,
      total: row.total + delta,
      administrativeAdjustment: {
        scope: decision.scope,
        mode: decision.mode,
        points: decision.points,
        reason: decision.reason,
        delta,
        originalTotal: row.total,
        originalEurope,
      },
    };
  });

  adjusted.sort((a, b) => b.total - a.total || a.playerId.localeCompare(b.playerId));
  return adjusted;
}
