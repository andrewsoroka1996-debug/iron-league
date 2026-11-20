import { headers } from "next/headers";
import { notFound } from "next/navigation";
import PublicDiscordLogin from "./PublicDiscordLogin";
import {
  PUBLIC_ORIGIN,
  publicDiscordAuthEnabled,
} from "../../../lib/player-public-oauth-policy";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { robots: { index: false, follow: false } };

/** Never expose the public OAuth login while the rollout flag is off. */
export default async function PublicDiscordLoginPage() {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto");
  if (host !== "ironleague.com.ua" || (proto && proto !== "https")) notFound();

  if (!publicDiscordAuthEnabled({
    nodeEnv: process.env.NODE_ENV,
    accountsEnabled: process.env.PLAYER_ACCOUNTS_ENABLED,
    publicEnabled: process.env.IRON_LEAGUE_PUBLIC_DISCORD_AUTH_ENABLED,
    pilotEnabled: process.env.IRON_LEAGUE_PROD_DISCORD_PILOT_ENABLED,
    localTestEnabled: process.env.IRON_LEAGUE_E2E_TEST_ONLY,
    requestOrigin: PUBLIC_ORIGIN,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  })) notFound();

  return <PublicDiscordLogin />;
}
