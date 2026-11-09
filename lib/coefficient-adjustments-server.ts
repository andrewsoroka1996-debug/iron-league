import "server-only";
import { supabaseAdmin } from "./supabase-admin";
import type { CoefficientAdjustment } from "./coefficient-adjustments";

export async function loadSeason3CoefficientAdjustments(): Promise<CoefficientAdjustment[]> {
  const { data, error } = await supabaseAdmin
    .from("coefficient_adjustments_current")
    .select("id,season,player_id,scope,mode,points,reason,created_at")
    .eq("season", 3);

  if (error) {
    // Fail closed: do not silently publish unadjusted disciplinary standings.
    throw new Error(`COEFFICIENT ADJUSTMENTS LOAD ERROR: ${error.message}`);
  }
  return (data ?? []) as CoefficientAdjustment[];
}
