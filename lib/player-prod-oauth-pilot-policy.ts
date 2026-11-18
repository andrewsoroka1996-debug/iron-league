/**
 * The public Iron League OAuth pilot is a SEPARATE, opt-in branch.
 * It never enables player accounts, writes to tournament tables or replaces
 * the isolated localhost Discord flow.
 */
export const PRODUCTION_ORIGIN = "https://ironleague.com.ua";
export const PRODUCTION_SUPABASE_ORIGIN =
  "https://mrihbcbmpzenhepaglcm.supabase.co";

export type ProductionPilotEnvironment = {
  nodeEnv?: string;
  pilotEnabled?: string;
  accountsEnabled?: string;
  localTestEnabled?: string;
  requestOrigin?: string;
  supabaseUrl?: string;
  supabasePublishableKey?: string;
  allowedDiscordIds?: string;
};

export function getAllowedDiscordIds(raw: string | undefined): Set<string> {
  const result = new Set<string>();
  for (const part of (raw || "").split(",")) {
    const id = part.trim();
    if (id && /^\d{15,22}$/.test(id)) result.add(id);
  }
  return result;
}

export function productionPilotEnabled(input: ProductionPilotEnvironment): boolean {
  if (
    input.nodeEnv !== "production" ||
    input.pilotEnabled !== "true" ||
    input.accountsEnabled === "true" ||
    input.localTestEnabled === "true" ||
    input.requestOrigin !== PRODUCTION_ORIGIN ||
    !input.supabasePublishableKey ||
    getAllowedDiscordIds(input.allowedDiscordIds).size < 1
  ) return false;

  try {
    const url = new URL(input.supabaseUrl || "");
    return url.origin === PRODUCTION_SUPABASE_ORIGIN &&
      (url.pathname === "/" || url.pathname === "") &&
      !url.search && !url.hash && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function isApprovedPilotDiscordIdentity(
  discordId: string | null | undefined,
  rawAllowlist: string | undefined,
): boolean {
  return typeof discordId === "string" &&
    getAllowedDiscordIds(rawAllowlist).has(discordId);
}
