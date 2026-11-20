import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getDiscordProviderId } from "./discord-identity-provider-id";
import { playerAccountsEnabled } from "./player-account-access-policy";
import {
  canSubmitProfileRequest,
  normalizeApplicantNote,
  normalizeRejectionReason,
  normalizeRequestedNickname,
} from "./player-profile-request-policy";

const TABLE = "player_profile_creation_requests";
const unavailable = "Не вдалося виконати операцію. Перевірте налаштування або зверніться до організатора.";

/**
 * Separate, server-only opt-in switch. Never auto-enable on a deploy.
 * The main accounts gate remains required independently.
 * Neither switch is changed by this code patch.
 */
export function profileApplicationsEnabled() {
  return playerAccountsEnabled(process.env.PLAYER_ACCOUNTS_ENABLED) &&
    process.env.IRON_LEAGUE_NEW_PLAYER_APPLICATIONS_ENABLED === "true";
}

function respond(body: Record<string, unknown>, status: number) {
  const result = NextResponse.json(body, { status });
  result.headers.set("Cache-Control", "private, no-store");
  result.headers.set("Vary", "Cookie");
  return result;
}

function sessionFor(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const writes: Array<(res: NextResponse) => void> = [];
  const headersToSet: Record<string, string> = {};
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies, headers?: Record<string, string>) {
        for (const { name, value, options } of cookies) {
          request.cookies.set(name, value);
          writes.push((res) => res.cookies.set(name, value, options));
        }
        if (headers) {
          for (const [name, value] of Object.entries(headers)) {
            headersToSet[name.toLowerCase()] = String(value);
          }
        }
      },
    },
  });
  const reply = (body: Record<string, unknown>, status: number) => {
    const res = respond(body, status);
    writes.forEach((write) => write(res));
    for (const header of ["expires", "pragma"]) {
      if (headersToSet[header]) res.headers.set(header, headersToSet[header]);
    }
    return res;
  };
  return { client, reply };
}

export async function handleApplicantRequest(request: NextRequest, method: "GET" | "POST") {
  if (!profileApplicationsEnabled()) return respond({ error: "Недоступно" }, 404);
  const session = sessionFor(request);
  if (!session) return respond({ error: unavailable }, 503);
  const { client, reply } = session;

  try {
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) return reply({ error: "Увійдіть через Discord" }, 401);
    const discordIdentity = auth.user.identities?.find((identity) => identity.provider === "discord");
    if (!getDiscordProviderId(discordIdentity)) {
      return reply({ error: "Потрібен підтверджений Discord-акаунт" }, 403);
    }

    if (method === "GET") {
      const { data, error } = await client.from(TABLE)
        .select("id, desired_nickname, note, status, created_at, decided_at, decision_reason")
        .eq("auth_user_id", auth.user.id)
        .order("created_at", { ascending: false }).limit(15);
      if (error) return reply({ error: unavailable }, 503);
      return reply({ requests: data ?? [] }, 200);
    }

    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return reply({ error: "Невірний формат заявки" }, 400);
    }
    const input = body as Record<string, unknown>;
    const nickname = normalizeRequestedNickname(input.nickname);
    const note = normalizeApplicantNote(input.note);
    if (!nickname || note === null) {
      return reply({ error: "Нік: 3–32 символи (літери, цифри, пробіли, . _ -); примітка: до 500 символів" }, 400);
    }

    // Soft per-user rate limit: at most 3 applications per rolling 24 hours.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recent = await client.from(TABLE).select("id")
      .eq("auth_user_id", auth.user.id).gte("created_at", since).limit(3);
    if (recent.error) return reply({ error: unavailable }, 503);
    if ((recent.data?.length ?? 0) >= 3) {
      return reply({ error: "Забагато заявок за добу. Зверніться до організатора." }, 429);
    }

    const [linked, existingLinkRequest, existingProfileRequest] = await Promise.all([
      client.from("player_discord_links").select("player_id")
        .eq("auth_user_id", auth.user.id).limit(1),
      client.from("player_discord_link_requests").select("id")
        .eq("auth_user_id", auth.user.id).eq("status", "pending").limit(1),
      client.from(TABLE).select("id")
        .eq("auth_user_id", auth.user.id).eq("status", "pending").limit(1),
    ]);
    if (linked.error || existingLinkRequest.error || existingProfileRequest.error) {
      return reply({ error: unavailable }, 503);
    }
    if (!canSubmitProfileRequest({
      approvedLink: Boolean(linked.data?.length),
      pendingLink: Boolean(existingLinkRequest.data?.length),
      pendingProfileRequest: Boolean(existingProfileRequest.data?.length),
    })) {
      return reply({ error: "Вже існує прив'язка або активна заявка. Нову заявку створювати не потрібно." }, 409);
    }

    // Only authenticated user's ID; client cannot supply an auth_user_id or status.
    // Database column grants, RLS and a unique pending index enforce this independently.
    const { data, error } = await client.from(TABLE)
      .insert({ auth_user_id: auth.user.id, desired_nickname: nickname, note })
      .select("id, desired_nickname, note, status, created_at").single();
    if (error) return reply({ error: "Заявку не створено. Перевірте, чи немає іншої активної заявки." }, 409);
    return reply({ request: data }, 201);
  } catch {
    return reply({ error: unavailable }, 503);
  }
}

function adminPasswordValid(value: unknown): boolean {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret || typeof value !== "string" || value.length > 1024) return false;
  return timingSafeEqual(
    createHash("sha256").update(value).digest(),
    createHash("sha256").update(secret).digest(),
  );
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Admin may list or reject only. Profile creation and approval are NOT implemented here. */
export async function handleAdminProfileRequest(request: NextRequest) {
  if (!profileApplicationsEnabled()) return respond({ error: "Недоступно" }, 404);
  let body: unknown;
  try { body = await request.json(); } catch { return respond({ error: "Невірний запит" }, 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return respond({ error: "Невірний запит" }, 400);
  }
  const input = body as Record<string, unknown>;
  if (!adminPasswordValid(input.password)) return respond({ error: "Невірний пароль адміністратора" }, 401);
  if (input.action !== "list" && input.action !== "reject") {
    return respond({ error: "Недоступна дія" }, 400);
  }
  const client = adminClient();
  if (!client) return respond({ error: unavailable }, 503);

  try {
    if (input.action === "list") {
      const { data, error } = await client.from(TABLE)
        .select("id, auth_user_id, desired_nickname, note, created_at, status")
        .eq("status", "pending").order("created_at", { ascending: true }).limit(30);
      if (error) return respond({ error: unavailable }, 503);
      const enriched = [];
      const rows = data ?? [];
      for (let offset = 0; offset < rows.length; offset += 5) {
        const batch = await Promise.all(rows.slice(offset, offset + 5).map(async (row) => {
          const { data: userInfo, error: userError } = await client.auth.admin.getUserById(row.auth_user_id);
          const discord = userError ? undefined : userInfo.user?.identities?.find(
            (identity) => identity.provider === "discord",
          );
          return {
            id: row.id,
            nickname: row.desired_nickname,
            note: row.note,
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

    const id = input.requestId;
    const reason = normalizeRejectionReason(input.reason);
    if (typeof id !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ||
        !reason) {
      return respond({ error: "Некоректний ID або причина (5–500 символів)" }, 400);
    }
    // Conditional UPDATE prevents decisions on an already processed request.
    const { data, error } = await client.from(TABLE)
      .update({ status: "rejected", decision_reason: reason, decided_at: new Date().toISOString() })
      .eq("id", id).eq("status", "pending").select("id");
    if (error) return respond({ error: unavailable }, 503);
    if (!data?.length) return respond({ error: "Заявка вже розглянута або не знайдена" }, 409);
    return respond({ status: "rejected" }, 200);
  } catch {
    return respond({ error: unavailable }, 503);
  }
}
