import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { players } from "../data/players";
import { getDiscordProviderId } from "./discord-identity-provider-id";
import { playerAccountsEnabled } from "./player-account-access-policy";
import {
  decideLinkRequest,
  parseAdminLinkAction,
} from "./player-account-link-policy";

export const dynamicLinkFeatureEnabled = () =>
  playerAccountsEnabled(process.env.PLAYER_ACCOUNTS_ENABLED);

const knownPlayerIds = new Set(players.map((player) => player.id));
const errorText = "Не вдалося виконати операцію. Перевірте налаштування або зверніться до організатора.";

function respond(body: Record<string, unknown>, status: number) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie");
  return response;
}

export function featureDisabledResponse() {
  return respond({ error: "Недоступно" }, 404);
}

function userClient(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  const writes: Array<(response: NextResponse) => void> = [];
  const updatedHeaders: Record<string, string> = {};
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies, headers?: Record<string, string>) {
        for (const { name, value, options } of cookies) {
          request.cookies.set(name, value);
          writes.push((response) => response.cookies.set(name, value, options));
        }
        if (headers) {
          for (const [name, value] of Object.entries(headers)) {
            updatedHeaders[name.toLowerCase()] = String(value);
          }
        }
      },
    },
  });

  const reply = (body: Record<string, unknown>, status: number) => {
    const response = respond(body, status);
    for (const write of writes) write(response);
    for (const header of ["expires", "pragma"]) {
      if (updatedHeaders[header]) response.headers.set(header, updatedHeaders[header]);
    }
    return response;
  };
  return { client, reply };
}

/** User actions only use the logged-in user's RLS-scoped client. */
export async function handlePlayerLinkRequest(request: NextRequest, method: "GET" | "POST") {
  if (!dynamicLinkFeatureEnabled()) return featureDisabledResponse();
  const session = userClient(request);
  if (!session) return respond({ error: errorText }, 503);
  const { client, reply } = session;

  try {
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) return reply({ error: "Необхідно увійти через Discord" }, 401);
    const discordIdentity = auth.user.identities?.find((identity) => identity.provider === "discord");
    if (!getDiscordProviderId(discordIdentity)) {
      return reply({ error: "Потрібен підтверджений вхід через Discord" }, 403);
    }

    if (method === "GET") {
      const { data, error } = await client.from("player_discord_link_requests")
        .select("id, player_id, status, created_at, decided_at, decision_reason")
        .eq("auth_user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) return reply({ error: errorText }, 503);
      return reply({ requests: data ?? [] }, 200);
    }

    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return reply({ error: "Невірні дані заявки" }, 400);
    const playerId = (body as Record<string, unknown>).playerId;
    if (typeof playerId !== "string" || playerId.length > 128 || !knownPlayerIds.has(playerId)) {
      return reply({ error: "Профіль гравця не знайдено" }, 404);
    }

    // Both application types are mutually exclusive while pending. The
    // newcomer endpoint already checks for pending legacy link requests.
    const [approved, pending, pendingNewPlayer] = await Promise.all([
      client.from("player_discord_links")
        .select("player_id").eq("auth_user_id", auth.user.id).maybeSingle(),
      client.from("player_discord_link_requests")
        .select("id").eq("auth_user_id", auth.user.id).eq("status", "pending").limit(1),
      client.from("player_profile_creation_requests")
        .select("id").eq("auth_user_id", auth.user.id).eq("status", "pending").limit(1),
    ]);
    if (approved.error || pending.error || pendingNewPlayer.error) {
      return reply({ error: errorText }, 503);
    }

    const decision = decideLinkRequest({
      enabled: true,
      verifiedUserId: auth.user.id,
      hasVerifiedDiscordIdentity: true,
      requestedPlayerId: playerId,
      knownPlayerIds,
      existingApprovedLink: Boolean(approved.data),
      hasPendingRequest: Boolean(pending.data?.length || pendingNewPlayer.data?.length),
    });
    if (decision !== "allowed") {
      return reply({ error: "У вас уже є прив'язка або активна заявка. Перевірте статус поданих заявок." }, 409);
    }

    // Direct browser INSERT is denied by SQL v5.2. This privileged writer is
    // reached only after getUser(), verified Discord identity, validation and
    // the server-side feature gate. Never pass client-supplied auth_user_id.
    const writer = privilegedClient();
    if (!writer) return reply({ error: errorText }, 503);
    // A pending request NEVER grants player ownership.
    const { data, error } = await writer.from("player_discord_link_requests")
      .insert({ auth_user_id: auth.user.id, player_id: playerId })
      .select("id, player_id, status, created_at")
      .single();
    if (error) return reply({ error: "Заявку не створено. Можливо, вже є заявка на розгляді." }, 409);
    return reply({ request: data }, 201);
  } catch {
    return reply({ error: errorText }, 503);
  }
}

function adminPasswordValid(input: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (typeof input !== "string" || input.length > 1024 || !expected) return false;
  const left = createHash("sha256").update(input).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

function privilegedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  // Never return this client to a browser, Server Component prop or client module.
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Existing ADMIN_PASSWORD authenticates the admin; Discord never grants admin rights. */
export async function handleAdminLinkRequest(request: NextRequest) {
  if (!dynamicLinkFeatureEnabled()) return featureDisabledResponse();
  let raw: unknown;
  try { raw = await request.json(); } catch { return respond({ error: "Невірний запит" }, 400); }
  const input = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  if (!adminPasswordValid(input.password)) {
    return respond({ error: "Невірний пароль адміністратора" }, 401);
  }
  const action = parseAdminLinkAction(input);
  if (!action) return respond({ error: "Невірна дія або причина відхилення" }, 400);
  // Separate fail-closed approval gate for historical player ownership.
  if (action.action === "approve" &&
      process.env.IRON_LEAGUE_EXISTING_PLAYER_APPROVAL_ENABLED !== "true") {
    return featureDisabledResponse();
  }
  const admin = privilegedClient();
  if (!admin) return respond({ error: errorText }, 503);

  try {
    if (action.action === "list") {
      const { data, error } = await admin.from("player_discord_link_requests")
        .select("id,auth_user_id,player_id,status,created_at")
        .eq("status", "pending").order("created_at", { ascending: true }).limit(30);
      if (error) return respond({ error: errorText }, 503);
      const rows = data ?? [];
      // The displayed Discord ID comes from Supabase Auth, not user-submitted fields.
      const enriched = [];
      for (let i = 0; i < rows.length; i += 5) {
        const batch = await Promise.all(rows.slice(i, i + 5).map(async (row) => {
          const { data: userData, error: userError } =
            await admin.auth.admin.getUserById(row.auth_user_id);
          const discord = !userError ? userData.user?.identities?.find(
            (identity) => identity.provider === "discord",
          ) : undefined;
          return {
            id: row.id,
            playerId: row.player_id,
            authUserId: row.auth_user_id,
            createdAt: row.created_at,
            discordId: getDiscordProviderId(discord),
            discordName: typeof discord?.identity_data?.name === "string"
              ? discord.identity_data.name : null,
          };
        }));
        enriched.push(...batch);
      }
      return respond({ requests: enriched }, 200);
    }

    // Never approve an arbitrary player ID inserted by a forged or outdated
    // client. Requests remain separate from the approved ownership table.
    const { data: pendingRequest, error: pendingError } = await admin
      .from("player_discord_link_requests")
      .select("auth_user_id,player_id,status")
      .eq("id", action.requestId)
      .maybeSingle();
    if (pendingError) return respond({ error: errorText }, 503);
    if (!pendingRequest || pendingRequest.status !== "pending") {
      return respond({ error: "Заявка не знайдена або вже розглянута" }, 409);
    }
    if (action.action === "approve" && !knownPlayerIds.has(pendingRequest.player_id)) {
      return respond({ error: "Профіль відсутній у довіднику гравців" }, 409);
    }

    // Atomic transaction in PostgreSQL; the function derives Discord ID from
    // auth.identities, checks uniqueness and records an admin decision.
    const { data, error } = await admin.rpc("admin_decide_player_discord_link", {
      p_request_id: action.requestId,
      p_action: action.action,
      p_reason: action.reason,
    });
    if (error) return respond({ error: "Не вдалося змінити статус. Перевірте, чи заявка ще очікує і чи профіль вільний." }, 409);
    return respond({ status: data }, 200);
  } catch {
    return respond({ error: errorText }, 503);
  }
}
