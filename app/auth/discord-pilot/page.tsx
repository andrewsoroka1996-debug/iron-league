import { headers } from "next/headers";
import { notFound } from "next/navigation";
import DiscordPilotClient from "./DiscordPilotClient";
import { productionPilotEnabled, PRODUCTION_ORIGIN } from "../../../lib/player-prod-oauth-pilot-policy";

export const dynamic = "force-dynamic";

export default async function DiscordPilotPage() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto");
  if (host !== "ironleague.com.ua" || (protocol && protocol !== "https")) notFound();
  if (!productionPilotEnabled({
    nodeEnv: process.env.NODE_ENV,
    pilotEnabled: process.env.IRON_LEAGUE_PROD_DISCORD_PILOT_ENABLED,
    accountsEnabled: process.env.PLAYER_ACCOUNTS_ENABLED,
    localTestEnabled: process.env.IRON_LEAGUE_E2E_TEST_ONLY,
    requestOrigin: PRODUCTION_ORIGIN,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    allowedDiscordIds: process.env.IRON_LEAGUE_PROD_DISCORD_ALLOWED_IDS,
  })) notFound();

  return <DiscordPilotClient />;
}
