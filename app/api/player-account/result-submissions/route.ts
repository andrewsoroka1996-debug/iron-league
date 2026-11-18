import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { checkPlayerOwnershipForRequest } from "../../../../lib/player-account-ownership-server";
import {
  eligibleForPlayerResultRequest,
  RESULT_REASON_MIN,
  RESULT_SCREENSHOT_MAX_BYTES,
  validateResultEvidence,
  validateResultSubmissionItems,
} from "../../../../lib/player-result-submission-policy";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const BUCKET = "iron-player-result-evidence";
const MAX_MULTIPART_BYTES = 19 * 1024 * 1024;

function getId(request: NextRequest): string {
  return request.nextUrl.searchParams.get("playerId") ?? "";
}

function createReply(
  access: Awaited<ReturnType<typeof checkPlayerOwnershipForRequest>>,
) {
  return (data: Record<string, unknown>, status: number) => {
    const response = NextResponse.json(data, { status });
    access.applyAuthCookies(response);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Vary", "Cookie");
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  };
}

function deny(
  decision: string,
  reply: ReturnType<typeof createReply>,
): NextResponse | null {
  if (decision === "owner") return null;
  if (decision === "disabled" || decision === "invalid_profile") return reply({ error: "Недоступно" }, 404);
  if (decision === "unauthenticated") return reply({ error: "Потрібен вхід через Discord" }, 401);
  if (decision === "unavailable") return reply({ error: "Сервіс тимчасово недоступний" }, 503);
  return reply({ error: "Ви не є підтвердженим власником цього профілю" }, 403);
}

/** Only the user's own submissions are returned. No screenshot paths or private files are exposed. */
export async function GET(request: NextRequest) {
  const playerId = getId(request);
  const access = await checkPlayerOwnershipForRequest(request, playerId);
  const reply = createReply(access);
  const denied = deny(access.decision, reply);
  if (denied) return denied;
  if (!access.authUserId) return reply({ error: "Помилка перевірки сесії" }, 503);

  const { data, error } = await supabaseAdmin.from("player_result_submissions")
    .select("id, match_id, home_goals, away_goals, status, revision, screenshot_path, no_screenshot_reason, created_at, updated_at")
    .eq("auth_user_id", access.authUserId)
    .eq("player_id", playerId)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("PLAYER RESULT SUBMISSIONS: list error", error);
    return reply({ error: "Не вдалося завантажити заявки" }, 503);
  }
  return reply({ requests: (data ?? []).map((row) => ({
    id: row.id, match_id: row.match_id, home_goals: row.home_goals,
    away_goals: row.away_goals, status: row.status, revision: row.revision,
    has_screenshot: Boolean(row.screenshot_path),
    no_screenshot_reason: row.no_screenshot_reason,
    created_at: row.created_at, updated_at: row.updated_at,
  })) }, 200);
}

/** One or two independent, pre-existing Season 4 matches -> pending only. Never updates matches. */
export async function POST(request: NextRequest) {
  const playerId = getId(request);
  const access = await checkPlayerOwnershipForRequest(request, playerId);
  const reply = createReply(access);
  const denied = deny(access.decision, reply);
  if (denied) return denied;
  if (!access.authUserId) return reply({ error: "Помилка перевірки сесії" }, 503);

  // Explicit same-origin check against cookie-based cross-site form submission.
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) return reply({ error: "Недозволене джерело запиту" }, 403);
  if (!(request.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
    return reply({ error: "Очікується форма з результатами" }, 415);
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (!Number.isFinite(contentLength) || contentLength <= 0 || contentLength > MAX_MULTIPART_BYTES) {
    return reply({ error: "Запит завеликий або невідомий розмір файлу" }, 413);
  }

  let form: FormData;
  try { form = await request.formData(); }
  catch { return reply({ error: "Не вдалося прочитати форму" }, 400); }
  const raw = form.get("items");
  if (typeof raw !== "string" || raw.length > 3000) return reply({ error: "Некоректні дані" }, 400);
  let itemsInput: unknown;
  try { itemsInput = JSON.parse(raw) as unknown; }
  catch { return reply({ error: "Некоректний JSON" }, 400); }
  const validation = validateResultSubmissionItems(itemsInput);
  if (!validation.ok) return reply({ error: validation.error }, 400);

  const ids = validation.items.map((item) => item.match_id);
  const { data: matches, error: matchesError } = await supabaseAdmin.from("matches")
    .select("id, season, status, participant_type, home_id, away_id")
    .in("id", ids);
  if (matchesError || !matches || matches.length !== ids.length) {
    return reply({ error: "Не знайдено всі матчі календаря" }, 409);
  }
  for (const match of matches) {
    if (!eligibleForPlayerResultRequest({ ...match, id: String(match.id) }, playerId)) {
      return reply({ error: "Матч не доступний для подання результату" }, 409);
    }
  }

  // Rate-limit before accepting expensive evidence uploads. The RPC repeats
  // this check transactionally to prevent concurrent request bypasses.
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentEdits, error: rateError } = await supabaseAdmin
    .from("player_result_submission_versions")
    .select("id", { head: true, count: "exact" })
    .eq("changed_by", access.authUserId)
    .gte("changed_at", hourAgo);
  if (rateError) return reply({ error: "Сервіс заявок ще не налаштований" }, 503);
  if ((recentEdits ?? 0) >= 100) return reply({ error: "Забагато виправлень. Спробуйте пізніше" }, 429);

  // Validate every file fully before uploading any of them.
  const attachments: Array<{ matchId: string; body: Uint8Array; mime: string; ext: string }> = [];
  for (const item of validation.items) {
    const file = form.get(`evidence_${item.match_id}`);
    if (file !== null && !(file instanceof File)) return reply({ error: "Некоректний файл" }, 400);
    if (!file && (!item.no_screenshot_reason || item.no_screenshot_reason.length < RESULT_REASON_MIN)) {
      return reply({ error: "Додайте скриншот або письмову причину для кожного матчу" }, 400);
    }
    if (file) {
      if (file.size > RESULT_SCREENSHOT_MAX_BYTES || file.size <= 0) {
        return reply({ error: "Скриншот має бути не більшим за 8 МБ" }, 413);
      }
      const body = new Uint8Array(await file.arrayBuffer());
      const fileError = validateResultEvidence({ size: file.size, type: file.type, bytes: body });
      if (fileError) return reply({ error: fileError }, 400);
      attachments.push({ matchId: item.match_id, body, mime: file.type,
        ext: file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp" });
    }
  }

  const uploaded: string[] = [];
  const cleanup = async () => {
    if (uploaded.length === 0) return;
    const { error } = await supabaseAdmin.storage.from(BUCKET).remove(uploaded);
    if (error) console.error("PLAYER RESULT SUBMISSIONS: orphan cleanup failed", error);
  };
  try {
    const evidencePaths = new Map<string, string>();
    for (const file of attachments) {
      const path = `v1/${access.authUserId}/${file.matchId}/${randomUUID()}.${file.ext}`;
      const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, file.body, {
        contentType: file.mime, upsert: false, cacheControl: "0",
      });
      if (error) {
        console.error("PLAYER RESULT SUBMISSIONS: upload failed", error);
        await cleanup();
        return reply({ error: "Не вдалося завантажити скриншот" }, 503);
      }
      uploaded.push(path);
      evidencePaths.set(file.matchId, path);
    }
    const payload = validation.items.map((item) => ({
      match_id: item.match_id, home_goals: item.home_goals, away_goals: item.away_goals,
      screenshot_path: evidencePaths.get(item.match_id) ?? null,
      no_screenshot_reason: evidencePaths.has(item.match_id) ? null : item.no_screenshot_reason,
    }));
    const { data, error } = await supabaseAdmin.rpc("submit_player_result_requests", {
      p_auth_user_id: access.authUserId, p_player_id: playerId, p_items: payload,
    });
    if (error) {
      console.error("PLAYER RESULT SUBMISSIONS: transaction rejected", error);
      await cleanup();
      return reply({ error: "Заявку не збережено. Перевірте статус матчів або інші заявки." }, 409);
    }
    return reply({ success: true, result: data }, 200);
  } catch (error) {
    console.error("PLAYER RESULT SUBMISSIONS: unexpected failure", error);
    await cleanup();
    return reply({ error: "Не вдалося зберегти заявку" }, 503);
  }
}
