import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { playerAccountsEnabled } from "../../../../lib/player-account-access-policy";
import { parseResultReviewFilter, validateResultReviewAction } from "../../../../lib/player-result-review-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const BUCKET = "iron-player-result-evidence";

type Body = { password?: unknown; action?: unknown; filter?: unknown; request_id?: unknown; expected_revision?: unknown; reason?: unknown };

function response(body: Record<string, unknown>, status: number) {
  const result = NextResponse.json(body, { status });
  result.headers.set("Cache-Control", "private, no-store");
  result.headers.set("Vary", "Cookie");
  result.headers.set("X-Content-Type-Options", "nosniff");
  return result;
}

function validPassword(provided: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof provided !== "string" || provided.length > 512) return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** POST-only: password never appears in URL, cookies, logs or browser storage. */
export async function POST(request: NextRequest) {
  if (!playerAccountsEnabled(process.env.PLAYER_ACCOUNTS_ENABLED)) {
    return response({ error: "Недоступно" }, 404);
  }
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return response({ error: "Недозволене джерело запиту" }, 403);
  }
  if (!(request.headers.get("content-type") ?? "").startsWith("application/json")) {
    return response({ error: "Очікується JSON" }, 415);
  }
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && Number(declaredLength) > 20000) return response({ error: "Завеликий запит" }, 413);
  let body: Body;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 20000) return response({ error: "Завеликий запит" }, 413);
    body = JSON.parse(raw) as Body;
  } catch {
    return response({ error: "Некоректний JSON" }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return response({ error: "Некоректний запит" }, 400);
  }
  if (!validPassword(body.password)) return response({ error: "Невірний пароль адміністратора" }, 401);

  if (body.action === "list") {
    const filter = parseResultReviewFilter(body.filter);
    if (!filter) return response({ error: "Невірний фільтр" }, 400);
    let query = supabaseAdmin.from("player_result_submissions")
      .select("id,auth_user_id,player_id,match_id,home_goals,away_goals,screenshot_path,no_screenshot_reason,status,revision,created_at,updated_at")
      .order("updated_at", { ascending: false }).limit(60);
    query = filter === "pending" ? query.eq("status", "pending") : query.in("status", ["approved", "rejected"]);
    const { data, error } = await query;
    if (error) {
      console.error("ADMIN PLAYER RESULT REVIEW: list failed", error.code);
      return response({ error: "Не вдалося завантажити заявки. Перевірте тестову SQL-схему." }, 503);
    }
    const rows = data ?? [];
    const ids = [...new Set(rows.map((row) => row.match_id))];
    let matches: Array<Record<string, unknown>> = [];
    if (ids.length > 0) {
      const result = await supabaseAdmin.from("matches")
        .select("id,season,competition,division,stage,round,leg,home_id,away_id,status,home_goals,away_goals")
        .in("id", ids);
      if (result.error) return response({ error: "Не вдалося перевірити календар" }, 503);
      matches = (result.data ?? []) as Array<Record<string, unknown>>;
    }
    const matchMap = new Map(matches.map((item) => [String(item.id), item]));
    const requests = [];
    for (const item of rows) {
      let evidenceUrl: string | null = null;
      if (item.screenshot_path) {
        const { data: signed, error: signError } = await supabaseAdmin.storage
          .from(BUCKET).createSignedUrl(item.screenshot_path, 300);
        if (!signError) evidenceUrl = signed?.signedUrl ?? null;
      }
      requests.push({
        id: item.id,
        player_id: item.player_id,
        match_id: item.match_id,
        home_goals: item.home_goals,
        away_goals: item.away_goals,
        status: item.status,
        revision: item.revision,
        created_at: item.created_at,
        updated_at: item.updated_at,
        no_screenshot_reason: item.no_screenshot_reason,
        has_screenshot: Boolean(item.screenshot_path),
        evidence_url: evidenceUrl,
        match: matchMap.get(item.match_id) ?? null,
      });
    }
    return response({ requests }, 200);
  }

  const checked = validateResultReviewAction(body);
  if (!checked.ok) return response({ error: checked.error }, 400);
  const { data, error } = await supabaseAdmin.rpc("admin_decide_player_result_submission", {
    p_request_id: checked.requestId,
    p_action: checked.action,
    p_expected_revision: checked.expectedRevision,
    p_reason: checked.reason,
  });
  if (error) {
    // Do not leak internal SQL; the RPC performs transactional validation and locking.
    console.error("ADMIN PLAYER RESULT REVIEW: transaction rejected", error.code);
    return response({ error: "Дію не виконано. Статус матчу чи заявки міг змінитися, або SQL-модуль не встановлено." }, 409);
  }
  return response({ success: true, result: data }, 200);
}
