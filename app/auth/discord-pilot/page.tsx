import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import DiscordPilotClient from "./DiscordPilotClient";
import { getDiscordProviderId } from "../../../lib/discord-identity-provider-id";
import {
  isApprovedPilotDiscordIdentity,
  productionPilotEnabled,
  PRODUCTION_ORIGIN,
} from "../../../lib/player-prod-oauth-pilot-policy";

export const dynamic = "force-dynamic";

export default async function DiscordPilotPage() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto");
  if (host !== "ironleague.com.ua" || (protocol && protocol !== "https")) notFound();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!productionPilotEnabled({
    nodeEnv: process.env.NODE_ENV,
    pilotEnabled: process.env.IRON_LEAGUE_PROD_DISCORD_PILOT_ENABLED,
    accountsEnabled: process.env.PLAYER_ACCOUNTS_ENABLED,
    localTestEnabled: process.env.IRON_LEAGUE_E2E_TEST_ONLY,
    requestOrigin: PRODUCTION_ORIGIN,
    supabaseUrl: url,
    supabasePublishableKey: key,
    allowedDiscordIds: process.env.IRON_LEAGUE_PROD_DISCORD_ALLOWED_IDS,
  })) notFound();

  // Only the server may decide whether the pilot UI reports an approved login.
  // The browser's getUser() alone does not establish allowlist membership.
  const cookieStore = await cookies();
  const supabase = createServerClient(url!, key!, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        // Server Components cannot always write refreshed cookies. The
        // callback Route Handler remains responsible for issuing login cookies.
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // A failed refresh must never grant access; getUser() remains the gate.
        }
      },
    },
  });

  let verifiedName: string | null = null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) {
      const discordIdentity = user.identities?.find(identity => identity.provider === "discord");
      const discordId = getDiscordProviderId(discordIdentity);
      if (isApprovedPilotDiscordIdentity(
        discordId,
        process.env.IRON_LEAGUE_PROD_DISCORD_ALLOWED_IDS,
      )) {
        const metadata = user.user_metadata;
        const displayName = metadata?.full_name ?? metadata?.name;
        verifiedName = typeof displayName === "string" && displayName.trim()
          ? displayName.slice(0, 100)
          : "Discord";
      }
    }
  } catch {
    // Fail closed on unavailable Auth: no verified pilot name is displayed.
  }

  return <DiscordPilotClient verifiedName={verifiedName} />;
}
