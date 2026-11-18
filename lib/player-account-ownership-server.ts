import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { players } from "../data/players";
import {
  decidePlayerOwnership,
  playerAccountsEnabled,
  type PlayerOwnershipDecision,
} from "./player-account-access-policy";

const knownPlayerIds: ReadonlySet<string> = new Set(players.map((p) => p.id));

type CheckedAccess = {
  authUserId?: string;
  decision: PlayerOwnershipDecision;
  /** Replay auth-cookie changes on the actual response, never on a shared cache. */
  applyAuthCookies: (response: NextResponse) => void;
};

function checked(decision: PlayerOwnershipDecision): CheckedAccess {
  return { decision, applyAuthCookies: () => undefined };
}

/**
 * Server-only ownership check for a Next.js route handler.
 * No elevated Supabase key is used. No database write is made.
 * NEVER use a display name or unapproved link request as authorization.
 */
export async function checkPlayerOwnershipForRequest(
  request: NextRequest,
  requestedPlayerId: string,
): Promise<CheckedAccess> {
  // Critical: do not even initialize Supabase when accounts are disabled.
  if (!playerAccountsEnabled(process.env.PLAYER_ACCOUNTS_ENABLED)) {
    return checked("disabled");
  }

  if (!knownPlayerIds.has(requestedPlayerId)) {
    return checked("invalid_profile");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return checked("unavailable");
  }

  // Capture any refreshed auth cookies. The caller must attach these to the
  // final response, which always has private/no-store caching headers.
  const pendingCookieWrites: Array<(response: NextResponse) => void> = [];
  const refreshedHeaders: Record<string, string> = {};
  const applyAuthCookies = (response: NextResponse) => {
    for (const apply of pendingCookieWrites) apply(response);
    for (const name of ["expires", "pragma"]) {
      if (refreshedHeaders[name]) {
        response.headers.set(name, refreshedHeaders[name]);
      }
    }
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Vary", "Cookie");
  };

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers?: Record<string, string>) {
          for (const { name, value, options } of cookiesToSet) {
            request.cookies.set(name, value);
            pendingCookieWrites.push((response) => {
              response.cookies.set(name, value, options);
            });
          }
          if (headers) {
            for (const [name, value] of Object.entries(headers)) {
              refreshedHeaders[name.toLowerCase()] = String(value);
            }
          }
        },
      },
    });

    // Auth server validation. Never trust getSession().user for authorization.
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return {
        decision:
          !authData.user && (!authError || authError.name === "AuthSessionMissingError")
            ? "unauthenticated"
            : "unavailable",
        applyAuthCookies,
      };
    }

    // Must be an admin-approved binding in a protected, RLS-governed table.
    // An absent table or insufficient RLS privileges FAILS CLOSED.
    const { data: link, error: linkError } = await supabase
      .from("player_discord_links")
      .select("auth_user_id, player_id")
      .eq("auth_user_id", authData.user.id)
      .maybeSingle();

    if (linkError) {
      return { decision: "unavailable", applyAuthCookies };
    }

    return {
      authUserId: authData.user.id,
      decision: decidePlayerOwnership({
        requestedPlayerId,
        knownPlayerIds,
        verifiedAuthUserId: authData.user.id,
        approvedLink: link ?? null,
      }),
      applyAuthCookies,
    };
  } catch {
    return { decision: "unavailable", applyAuthCookies };
  }
}
