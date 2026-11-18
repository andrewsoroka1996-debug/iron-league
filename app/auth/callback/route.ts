import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getDiscordProviderId } from "../../../lib/discord-identity-provider-id";
import {
  isApprovedPilotDiscordIdentity,
  productionPilotEnabled,
  PRODUCTION_ORIGIN,
} from "../../../lib/player-prod-oauth-pilot-policy";

export const dynamic = "force-dynamic";

const TEST_HOST = "knrdsraydifnnbqycird.supabase.co";
const LOCAL_ORIGIN = "http://localhost:3001";

/**
 * Controlled production OAuth pilot. The normal player account feature remains
 * disabled throughout the pilot; only an exact Discord allowlist may receive
 * an authenticated browser session from this callback.
 */
async function handleProductionPilot(request: NextRequest, url: string, key: string) {
  const code = request.nextUrl.searchParams.get("code");
  const failure = NextResponse.redirect(`${PRODUCTION_ORIGIN}/auth/discord-pilot?oauth=error`);
  failure.headers.set("Cache-Control", "private, no-store");
  if (!code) return failure;

  const response = NextResponse.redirect(`${PRODUCTION_ORIGIN}/auth/discord-pilot?oauth=success`);
  response.headers.set("Cache-Control", "private, no-store");
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });
  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return failure;
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return failure;
    const discordIdentity = user.identities?.find(identity => identity.provider === "discord");
    const discordId = getDiscordProviderId(discordIdentity);
    if (!isApprovedPilotDiscordIdentity(
      discordId,
      process.env.IRON_LEAGUE_PROD_DISCORD_ALLOWED_IDS,
    )) return failure;
    return response;
  } catch {
    return failure;
  }
}

export async function GET(request: NextRequest) {
  const prodUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const prodKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (productionPilotEnabled({
    nodeEnv: process.env.NODE_ENV,
    pilotEnabled: process.env.IRON_LEAGUE_PROD_DISCORD_PILOT_ENABLED,
    accountsEnabled: process.env.PLAYER_ACCOUNTS_ENABLED,
    localTestEnabled: process.env.IRON_LEAGUE_E2E_TEST_ONLY,
    requestOrigin: request.nextUrl.origin,
    supabaseUrl: prodUrl,
    supabasePublishableKey: prodKey,
    allowedDiscordIds: process.env.IRON_LEAGUE_PROD_DISCORD_ALLOWED_IDS,
  })) {
    return handleProductionPilot(request, prodUrl!, prodKey!);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const failure = NextResponse.redirect(
    `${LOCAL_ORIGIN}/auth-test?oauth=error`
  );

  failure.headers.set("Cache-Control", "no-store");

  // This callback is exclusively for local testing.
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.PLAYER_ACCOUNTS_ENABLED !== "true" ||
    process.env.IRON_LEAGUE_E2E_TEST_ONLY !== "true" ||
    request.nextUrl.origin !== LOCAL_ORIGIN ||
    !url ||
    !key ||
    new URL(url).hostname !== TEST_HOST
  ) {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return failure;
  }

  const response = NextResponse.redirect(
    `${LOCAL_ORIGIN}/auth-test?oauth=success`
  );

  response.headers.set("Cache-Control", "private, no-store");

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },

      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    const { error } =
      await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return failure;
    }

    // Confirm identity against Supabase Auth.
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return failure;
    }

    return response;
  } catch {
    return failure;
  }
}
