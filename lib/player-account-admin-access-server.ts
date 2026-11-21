import "server-only";

import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getDiscordProviderId } from "./discord-identity-provider-id";
import { adminDiscordIdentityAllowed } from "./player-account-admin-access-policy";

/**
 * Additional factor for the two NEW account-admin POST routes, BEFORE their
 * existing ADMIN_PASSWORD check. Never grants admin rights from Discord alone.
 * Config: IRON_LEAGUE_PLAYER_ADMIN_DISCORD_IDS="<verified snowflake>,..."
 * No allowlist => 404, including if the account feature is enabled.
 */
export async function withPlayerAccountAdminDiscordGuard(
  request: NextRequest,
  continueWithPasswordCheck: () => Promise<NextResponse>,
): Promise<NextResponse> {
  const allowedIds = process.env.IRON_LEAGUE_PLAYER_ADMIN_DISCORD_IDS;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const respond = (status: number, message: string) => {
    const result = NextResponse.json({ error: message }, { status });
    result.headers.set("Cache-Control", "private, no-store");
    result.headers.set("Vary", "Cookie");
    return result;
  };

  // Fail closed without a valid server-configured administrative Discord ID.
  if (!allowedIds || !url || !key) return respond(404, "Недоступно");
  const cookieWrites: Array<(response: NextResponse) => void> = [];
  const authHeaders: Record<string, string> = {};

  try {
    const client = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookies, headers?: Record<string, string>) {
          for (const { name, value, options } of cookies) {
            request.cookies.set(name, value);
            cookieWrites.push((response) => response.cookies.set(name, value, options));
          }
          if (headers) {
            for (const [name, value] of Object.entries(headers)) {
              authHeaders[name.toLowerCase()] = String(value);
            }
          }
        },
      },
    });

    // getUser verifies the Supabase session with Auth, not user-supplied metadata.
    const { data, error } = await client.auth.getUser();
    const discordIdentity = !error && data.user?.identities?.find(
      (identity) => identity.provider === "discord",
    );
    const discordId = getDiscordProviderId(discordIdentity || null);

    const result = !adminDiscordIdentityAllowed(discordId, allowedIds)
      ? respond(403, "Для адміністрування потрібен дозволений Discord-акаунт")
      : await continueWithPasswordCheck();

    // Preserve refreshed/cleared Supabase SSR cookies from the verifier.
    for (const write of cookieWrites) write(result);
    for (const header of ["expires", "pragma"]) {
      if (authHeaders[header]) result.headers.set(header, authHeaders[header]);
    }
    result.headers.set("Cache-Control", "private, no-store");
    result.headers.set("Vary", "Cookie");
    return result;
  } catch {
    return respond(503, "Не вдалося перевірити адміністративний доступ");
  }
}
