/**
 * Independent opt-in for the FUTURE public Discord OAuth route.
 * It must never be enabled by the closed production pilot flag, a localhost
 * test flag, or by PLAYER_ACCOUNTS_ENABLED alone. No database writes here.
 */
export const PUBLIC_ORIGIN = "https://ironleague.com.ua";
export const PUBLIC_SUPABASE_ORIGIN = "https://mrihbcbmpzenhepaglcm.supabase.co";

export type PublicDiscordAuthEnvironment = {
  nodeEnv?: string;
  accountsEnabled?: string;
  publicEnabled?: string;
  pilotEnabled?: string;
  localTestEnabled?: string;
  requestOrigin?: string;
  supabaseUrl?: string;
  supabasePublishableKey?: string;
};

export function publicDiscordAuthEnabled(input: PublicDiscordAuthEnvironment): boolean {
  if (
    input.nodeEnv !== "production" ||
    input.accountsEnabled !== "true" ||
    input.publicEnabled !== "true" ||
    input.pilotEnabled === "true" ||
    input.localTestEnabled === "true" ||
    input.requestOrigin !== PUBLIC_ORIGIN ||
    !input.supabasePublishableKey?.trim()
  ) return false;

  try {
    const url = new URL(input.supabaseUrl || "");
    return url.origin === PUBLIC_SUPABASE_ORIGIN &&
      (url.pathname === "/" || url.pathname === "") &&
      !url.search && !url.hash && !url.username && !url.password;
  } catch {
    return false;
  }
}
