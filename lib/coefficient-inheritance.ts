import type { CoefficientBreakdown, CoefficientRow } from "./calculate-coefficients";
import {
  europeCoefficientPoints,
  type AdjustedCoefficientRow,
  type CoefficientAdjustment,
} from "./coefficient-adjustments";

/** This module is pure: it does not query or change Supabase. */
export type InheritingCoefficientReplacement = {
  outgoing_player_id: string;
  incoming_player_id: string;
  inherit_standings: boolean;
};

type CalculatedNode = {
  row: AdjustedCoefficientRow;
  effectiveEurope: number;
};

function mergeBreakdowns(
  base: CoefficientBreakdown,
  others: readonly CoefficientBreakdown[]
): CoefficientBreakdown {
  const result = { ...base };
  for (const other of others) {
    for (const key of Object.keys(result) as (keyof CoefficientBreakdown)[]) {
      result[key] += other[key];
    }
  }
  return result;
}

/**
 * Coefficient succession for season 3 only.
 *
 * For a chain A -> B -> C, all earned coefficient points pass along the
 * chain. An administrative zero on a replaced/outgoing player is table cleanup
 * only: it never cancels the points transferred to their successor, regardless
 * of when the zero was recorded. Explicit penalties remain effective.
 * The current owner's own adjustment applies to the inherited total.
 * The final owner is the sole public row; original match IDs remain untouched.
 */
export function applyInheritedCoefficientAdjustments(
  rows: CoefficientRow[],
  decisions: CoefficientAdjustment[],
  replacements: readonly InheritingCoefficientReplacement[]
): AdjustedCoefficientRow[] {
  if (rows.some((row) => row.season !== 3)) {
    throw new Error("COEFFICIENT INHERITANCE: expected season 3 rows only");
  }

  const original = new Map<string, CoefficientRow>();
  for (const row of rows) {
    if (original.has(row.playerId)) {
      throw new Error(`COEFFICIENT INHERITANCE: duplicate row ${row.playerId}`);
    }
    original.set(row.playerId, row);
  }

  const decisionsByPlayer = new Map<string, CoefficientAdjustment>();
  for (const decision of decisions) {
    if (decision.season !== 3) continue;
    const previous = decisionsByPlayer.get(decision.player_id);
    if (!previous || decision.id > previous.id) {
      decisionsByPlayer.set(decision.player_id, decision);
    }
  }

  const successor = new Map<string, string>();
  const predecessors = new Map<string, string[]>();
  for (const replacement of replacements) {
    if (!replacement.inherit_standings) continue;
    const outgoing = replacement.outgoing_player_id;
    const incoming = replacement.incoming_player_id;
    if (!outgoing || !incoming || outgoing === incoming) {
      throw new Error("COEFFICIENT INHERITANCE: invalid replacement");
    }
    const existing = successor.get(outgoing);
    if (existing && existing !== incoming) {
      throw new Error(`COEFFICIENT INHERITANCE: conflicting successor for ${outgoing}`);
    }
    if (existing) continue;
    successor.set(outgoing, incoming);
    predecessors.set(incoming, [...(predecessors.get(incoming) ?? []), outgoing]);
  }

  const visiting = new Set<string>();
  const done = new Map<string, CalculatedNode>();
  function calculate(playerId: string): CalculatedNode | null {
    if (done.has(playerId)) return done.get(playerId)!;
    if (visiting.has(playerId)) {
      throw new Error(`COEFFICIENT INHERITANCE: replacement cycle at ${playerId}`);
    }
    visiting.add(playerId);
    const own = original.get(playerId);
    const previous = (predecessors.get(playerId) ?? [])
      .map(calculate)
      .filter((node): node is CalculatedNode => node !== null);
    if (!own && previous.length === 0) {
      visiting.delete(playerId);
      return null;
    }
    if (!own) {
      throw new Error(`COEFFICIENT INHERITANCE: incoming row missing for ${playerId}`);
    }

    const breakdown = mergeBreakdowns(own.breakdown, previous.map((node) => node.row.breakdown));
    const inheritedPoints = previous.reduce((total, node) => total + node.row.total, 0);
    const inheritedRaw = previous.reduce(
      (total, node) => total + Object.values(node.row.breakdown).reduce((a, b) => a + b, 0), 0
    );
    const inheritedEurope = previous.reduce((total, node) => total + node.effectiveEurope, 0);
    const inheritedRawEurope = previous.reduce(
      (total, node) => total + europeCoefficientPoints(node.row), 0
    );
    const beforeTotal = own.total + inheritedPoints;
    const beforeEurope = europeCoefficientPoints(own) + inheritedEurope;
    const inheritedAdjustmentDelta = inheritedPoints - inheritedRaw;
    const inheritedEuropeAdjustmentDelta = inheritedEurope - inheritedRawEurope;

    let total = beforeTotal;
    let effectiveEurope = beforeEurope;
    let administrativeAdjustment: AdjustedCoefficientRow["administrativeAdjustment"];
    // A zero decision for a REPLACED player only cleans up their admin row.
    // It must never reduce the earned points inherited by their successor,
    // regardless of when the zero event was recorded. Other penalties remain real.
    const recordedDecision = decisionsByPlayer.get(playerId);
    const decision = successor.has(playerId) && recordedDecision?.mode === "zero"
      ? undefined
      : recordedDecision;
    if (decision && decision.mode !== "clear") {
      const base = decision.scope === "europe" ? beforeEurope : beforeTotal;
      if (!Number.isFinite(decision.points) || decision.points < 0 ||
          (decision.mode === "penalty" && decision.points === 0)) {
        throw new Error(`COEFFICIENT INHERITANCE: invalid penalty for ${playerId}`);
      }
      const effective = decision.mode === "zero"
        ? 0
        : Math.max(0, base - decision.points);
      const delta = effective - base;
      total += delta;
      if (decision.scope === "europe") {
        effectiveEurope += delta;
      } else if (decision.mode === "zero") {
        effectiveEurope = 0;
      } else {
        // For a global penalty, the European portion cannot exceed the net total.
        effectiveEurope = Math.min(effectiveEurope, total);
      }
      administrativeAdjustment = {
        scope: decision.scope,
        mode: decision.mode,
        points: decision.points,
        reason: decision.reason,
        delta,
        originalTotal: beforeTotal,
        originalEurope: beforeEurope,
      };
    }

    const row: AdjustedCoefficientRow = {
      ...own,
      breakdown,
      total,
      ...(administrativeAdjustment ? { administrativeAdjustment } : {}),
      preAdjustmentTotal: beforeTotal,
      preAdjustmentEurope: beforeEurope,
      effectiveEuropePoints: effectiveEurope,
      inheritedAdjustmentDelta,
      inheritedEuropeAdjustmentDelta,
      inheritedFrom: previous.map((node) => ({
        playerId: node.row.playerId,
        adjustedPoints: node.row.total,
      })),
    };
    const result = { row, effectiveEurope };
    done.set(playerId, result);
    visiting.delete(playerId);
    return result;
  }

  // Validate cycles even for chains without qualifying raw rows.
  for (const oldId of successor.keys()) {
    const seen = new Set<string>();
    let current: string | undefined = oldId;
    while (current !== undefined) {
      if (seen.has(current)) {
        throw new Error(`COEFFICIENT INHERITANCE: replacement cycle at ${oldId}`);
      }
      seen.add(current);
      current = successor.get(current);
    }
  }

  const result: AdjustedCoefficientRow[] = [];
  for (const row of rows) {
    if (successor.has(row.playerId)) continue;
    const calculated = calculate(row.playerId);
    if (calculated) result.push(calculated.row);
  }
  result.sort((a, b) => b.total - a.total || a.playerId.localeCompare(b.playerId));
  return result;
}
