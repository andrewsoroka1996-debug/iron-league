import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { players } from "../../../../data/players";
import PlayerAccountMatches from "../../../../components/player-account/PlayerAccountMatches";
import { getDiscordProviderId } from "../../../../lib/discord-identity-provider-id";
import { loadSeason4DirectPlayerMatchGroups } from "../../../../lib/player-account-matches-server";
import {
  PILOT_CABINET_PLAYER_ID,
  isSingleApprovedPilotDiscordIdentity,
} from "../../../../lib/player-prod-pilot-cabinet-access";
import {
  getAllowedDiscordIds,
  productionPilotEnabled,
  PRODUCTION_ORIGIN,
} from "../../../../lib/player-prod-oauth-pilot-policy";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { robots: { index: false, follow: false } };

/**
 * Isolated READ-ONLY cabinet for the already allowlisted production OAuth pilot.
 * No generic player accounts feature, link writes, privileged key, or mutation API.
 * Access is not based on an unverified Discord nickname.
 */
export default async function DiscordPilotCabinetPage() {
  const h = await headers();
  const host = h.get("host");
  const forwardedProtocol = h.get("x-forwarded-proto");
  if (host !== "ironleague.com.ua" || (forwardedProtocol && forwardedProtocol !== "https")) {
    notFound();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const rawAllowedIds = process.env.IRON_LEAGUE_PROD_DISCORD_ALLOWED_IDS;
  const policyInput = {
    nodeEnv: process.env.NODE_ENV,
    pilotEnabled: process.env.IRON_LEAGUE_PROD_DISCORD_PILOT_ENABLED,
    accountsEnabled: process.env.PLAYER_ACCOUNTS_ENABLED,
    localTestEnabled: process.env.IRON_LEAGUE_E2E_TEST_ONLY,
    requestOrigin: PRODUCTION_ORIGIN,
    supabaseUrl: url,
    supabasePublishableKey: key,
    allowedDiscordIds: rawAllowedIds,
  };
  const allowedIds = getAllowedDiscordIds(rawAllowedIds);
  if (!productionPilotEnabled(policyInput) || allowedIds.size !== 1) notFound();

  // Auth is checked on EVERY request, on the server, before any match query.
  const cookieStore = await cookies();
  const supabase = createServerClient(url!, key!, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        // Same SSR cookie handling as the existing closed production pilot.
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components can forbid cookie writes. Never skip getUser().
        }
      },
    },
  });

  let discordId: string | null = null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) {
      const identity = user.identities?.find((item) => item.provider === "discord");
      discordId = getDiscordProviderId(identity);
    }
  } catch {
    // On Auth failure, fail closed below.
  }
  if (!isSingleApprovedPilotDiscordIdentity(discordId, allowedIds)) notFound();

  // This is a TEMPORARY allowlist-only mapping, not a permanent player link.
  const groups = await loadSeason4DirectPlayerMatchGroups(PILOT_CABINET_PLAYER_ID);
  const ids = new Set<string>([PILOT_CABINET_PLAYER_ID]);
  for (const group of groups) {
    ids.add(group.opponentId);
    for (const match of group.matches) {
      ids.add(match.home_id);
      ids.add(match.away_id);
    }
  }
  const playerNames: Record<string, string> = {};
  for (const player of players) {
    if (ids.has(player.id)) playerNames[player.id] = player.nickname;
  }

  return (
    <main className="min-h-screen bg-[#030711] px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-300">
          IRON LEAGUE · PRIVATE PILOT · READ ONLY
        </p>
        <h1 className="mt-3 text-2xl font-black">Кабінет Andrew_SM</h1>
        <p className="mt-2 text-sm text-white/60">
          Тимчасовий тестовий перегляд матчів сезону 4. Жодних операцій запису.
          Якщо календар сезону 4 ще не створено, список буде порожнім.
        </p>
        <a href="/auth/discord-pilot" className="mt-4 inline-block text-sm text-blue-300 underline">
          Повернутися до Discord Pilot
        </a>
        <div className="mt-6 rounded-2xl border border-blue-400/25 bg-[#10253e] p-4 sm:p-6">
          <PlayerAccountMatches
            playerId={PILOT_CABINET_PLAYER_ID}
            groups={groups}
            playerNames={playerNames}
          />
        </div>
      </div>
    </main>
  );
}
