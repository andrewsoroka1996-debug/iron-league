import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getDiscordProviderId } from "../../../lib/discord-identity-provider-id";
import {
  PUBLIC_ORIGIN,
  publicDiscordAuthEnabled,
} from "../../../lib/player-public-oauth-policy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Separate callback: the reviewed private pilot /auth/callback is untouched. */
export async function GET(request: NextRequest) {
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (
    host !== "ironleague.com.ua" ||
    (proto && proto !== "https") ||
    !publicDiscordAuthEnabled({
      nodeEnv: process.env.NODE_ENV,
      accountsEnabled: process.env.PLAYER_ACCOUNTS_ENABLED,
      publicEnabled: process.env.IRON_LEAGUE_PUBLIC_DISCORD_AUTH_ENABLED,
      pilotEnabled: process.env.IRON_LEAGUE_PROD_DISCORD_PILOT_ENABLED,
      localTestEnabled: process.env.IRON_LEAGUE_E2E_TEST_ONLY,
      requestOrigin: request.nextUrl.origin,
      supabaseUrl: url,
      supabasePublishableKey: key,
    })
  ) {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const failure = NextResponse.redirect(`${PUBLIC_ORIGIN}/auth/discord?oauth=error`);
  failure.headers.set("Cache-Control", "private, no-store");
  const code = request.nextUrl.searchParams.get("code");
  if (!code || code.length > 4096) return failure;

  const success = NextResponse.redirect(`${PUBLIC_ORIGIN}/account`);
  success.headers.set("Cache-Control", "private, no-store");
  const client = createServerClient(url!, key!, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(changes) {
        for (const { name, value, options } of changes) {
          request.cookies.set(name, value);
          success.cookies.set(name, value, options);
        }
      },
    },
  });
  try {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) return failure;
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) return failure;
    const identity = user.identities?.find((item) => item.provider === "discord");
    if (!getDiscordProviderId(identity)) return failure;
    // A valid Discord session does not grant player ownership. The /account
    // page checks a separately approved link under PostgreSQL RLS.
    return success;
  } catch {
    return failure;
  }
}
