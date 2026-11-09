import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { calculateCoefficients, type CoefficientMatch } from "../../../../lib/calculate-coefficients";
import {
  applyCoefficientAdjustments,
  europeCoefficientPoints,
  adjustedEuropePoints,
  type CoefficientAdjustment,
  type CoefficientAdjustmentMode,
  type CoefficientAdjustmentScope,
} from "../../../../lib/coefficient-adjustments";
import { loadSeason3CoefficientAdjustments } from "../../../../lib/coefficient-adjustments-server";
import { getSeasonPlayerReplacements, applyPlayerReplacements } from "../../../../lib/player-replacements";
import { players } from "../../../../data/players";

export const dynamic = "force-dynamic";

const COMPETITIONS = [
  "division", "division-1-cup", "division-2-cup", "division-3-cup",
  "champions-league", "europa-league", "european-super-cup",
];

type RequestBody = {
  password?: string;
  action?: "list" | "apply";
  season?: number;
  player_id?: string;
  scope?: CoefficientAdjustmentScope;
  mode?: CoefficientAdjustmentMode;
  points?: number;
  reason?: string;
};

async function loadCalculatedRows() {
  const matches: CoefficientMatch[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabaseAdmin.from("matches")
      .select("id,season,competition,division,stage,group_name,round,leg,participant_type,home_id,away_id,home_goals,away_goals,status,series_id,series_home_id,series_away_id,is_tiebreak")
      .eq("season", 3)
      .in("competition", COMPETITIONS)
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`Не вдалося отримати матчі: ${error.message}`);
    const batch = (data ?? []) as CoefficientMatch[];
    matches.push(...batch);
    if (batch.length < pageSize) break;
  }

  const replacements = await getSeasonPlayerReplacements(3);
  const resolvePlayerId = (playerId: string) =>
    applyPlayerReplacements([playerId], replacements)[0] ?? playerId;

  return calculateCoefficients({ season: 3, matches, resolvePlayerId });
}

async function responseWithCurrentState() {
  const [rawRows, adjustments, historyResult] = await Promise.all([
    loadCalculatedRows(),
    loadSeason3CoefficientAdjustments(),
    supabaseAdmin.from("coefficient_adjustment_events")
      .select("id,season,player_id,scope,mode,points,reason,created_at")
      .eq("season", 3)
      .order("id", { ascending: false })
      .limit(100),
  ]);
  if (historyResult.error) throw new Error(historyResult.error.message);
  const currentRows = applyCoefficientAdjustments(rawRows, adjustments);
  const rawByPlayer = new Map(rawRows.map(row => [row.playerId, row]));

  const rows = currentRows.map(row => {
    const raw = rawByPlayer.get(row.playerId)!;
    return {
      player_id: row.playerId,
      nickname: players.find(p => p.id === row.playerId)?.nickname ?? row.playerId,
      original_total: raw.total,
      original_europe: europeCoefficientPoints(raw),
      adjusted_total: row.total,
      adjusted_europe: adjustedEuropePoints(row),
    };
  });
  return NextResponse.json({
    success: true,
    season: 3,
    rows,
    decisions: adjustments,
    history: historyResult.data ?? [],
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  try {
    let body: RequestBody;
    try { body = (await request.json()) as RequestBody; }
    catch { return NextResponse.json({ success: false, error: "Некоректний JSON" }, { status: 400 }); }

    if (!process.env.ADMIN_PASSWORD || body.password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ success: false, error: "Невірний пароль адміністратора" }, { status: 401 });
    }
    if (body.season !== 3) {
      return NextResponse.json({ success: false, error: "Підтримується лише сезон 3" }, { status: 400 });
    }
    if (body.action === "list") return await responseWithCurrentState();
    if (body.action !== "apply") {
      return NextResponse.json({ success: false, error: "Невідома дія" }, { status: 400 });
    }

    const { player_id, scope, mode, points, reason } = body;
    if (typeof player_id !== "string" || !players.some(p => p.id === player_id)) {
      return NextResponse.json({ success: false, error: "Оберіть наявного гравця" }, { status: 400 });
    }
    if (scope !== "europe" && scope !== "all") {
      return NextResponse.json({ success: false, error: "Некоректна область коригування" }, { status: 400 });
    }
    if (mode !== "zero" && mode !== "penalty" && mode !== "clear") {
      return NextResponse.json({ success: false, error: "Некоректна операція" }, { status: 400 });
    }
    if (typeof reason !== "string" || reason.trim().length < 5 || reason.trim().length > 400) {
      return NextResponse.json({ success: false, error: "Вкажіть причину (5–400 символів)" }, { status: 400 });
    }
    if (!Number.isInteger(points) || points! < 0 || points! > 100000 ||
        (mode === "penalty" && points! === 0) ||
        (mode !== "penalty" && points !== 0)) {
      return NextResponse.json({ success: false, error: "Некоректна кількість штрафних балів" }, { status: 400 });
    }

    // Do not create invisible sanctions on players absent from season 3.
    const rawRows = await loadCalculatedRows();
    if (!rawRows.some(row => row.playerId === player_id)) {
      return NextResponse.json({ success: false, error: "Гравець відсутній у розрахунку сезону 3" }, { status: 409 });
    }

    // Append-only INSERT: preserves all previous administrative decisions.
    // No UPDATE of matches, coefficients, historical seasons, or audit records.
    const { error } = await supabaseAdmin.from("coefficient_adjustment_events").insert({
      season: 3,
      player_id,
      scope,
      mode,
      points,
      reason: reason.trim(),
    });
    if (error) throw new Error(error.message);

    return await responseWithCurrentState();
  } catch (error) {
    console.error("COEFFICIENT ADJUSTMENTS ERROR:", error);
    return NextResponse.json({ success: false, error: "Помилка коригування коефіцієнтів. Перевірте міграцію та журнал сервера." }, { status: 500 });
  }
}
