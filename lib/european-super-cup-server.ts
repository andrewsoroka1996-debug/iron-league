import "server-only";

import { supabaseAdmin } from "./supabase-admin";
import { getSeasonPlayerReplacements, resolveReplacementPlayerId } from "./player-replacements";
import { determineEuropeanFinalWinner, type EuropeanFinalRecord } from "./european-super-cup-final";

export type SuperCupState = {
  ready: boolean;
  championsLeagueWinner: string | null;
  europaLeagueWinner: string | null;
  existingMatchId: string | null;
  reason: string | null;
};

/** Shared read-only source of truth for the admin UI and the match-creation API. */
export async function loadEuropeanSuperCupState(season: number): Promise<SuperCupState> {
  if (season !== 3) {
    return {
      ready: false,
      championsLeagueWinner: null,
      europaLeagueWinner: null,
      existingMatchId: null,
      reason: "Створення Суперкубка зараз доступне лише для активного сезону 3.",
    };
  }

  const [finalsResult, existingResult, replacements] = await Promise.all([
    supabaseAdmin.from("matches")
      .select("competition,home_id,away_id,home_goals,away_goals,status,is_tiebreak")
      .eq("season", season)
      .eq("stage", "final")
      .in("competition", ["champions-league", "europa-league"]),
    supabaseAdmin.from("matches")
      .select("id")
      .eq("season", season)
      .eq("competition", "european-super-cup")
      .limit(1),
    getSeasonPlayerReplacements(season),
  ]);

  if (finalsResult.error) throw new Error(`SUPER CUP FINALS READ: ${finalsResult.error.message}`);
  if (existingResult.error) throw new Error(`SUPER CUP EXISTING READ: ${existingResult.error.message}`);

  const finals = (finalsResult.data ?? []) as EuropeanFinalRecord[];
  const champions = determineEuropeanFinalWinner(finals, "champions-league");
  const europa = determineEuropeanFinalWinner(finals, "europa-league");
  const championsLeagueWinner = champions.winnerId
    ? resolveReplacementPlayerId(champions.winnerId, replacements) : null;
  const europaLeagueWinner = europa.winnerId
    ? resolveReplacementPlayerId(europa.winnerId, replacements) : null;
  const existingMatchId = (existingResult.data ?? [])[0]?.id ?? null;

  const reason = existingMatchId
    ? "Матч Суперкубка цього сезону вже існує. Повторне створення заблоковано."
    : champions.error ?? europa.error
    ?? (championsLeagueWinner === europaLeagueWinner
      ? "У переможців ЛЧ та ЛЄ збігається актуальний ID гравця. Потрібна перевірка організатора."
      : null);

  return {
    ready: reason === null && !!championsLeagueWinner && !!europaLeagueWinner,
    championsLeagueWinner,
    europaLeagueWinner,
    existingMatchId,
    reason,
  };
}
