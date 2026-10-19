import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";

type WriteBody = {
  password?: string;
  season?: number;
  position?: number;
  match_id?: string;
  display_date?: string | null;
  display_time?: string | null;
};

type DbMatch = {
  id: string;
  season: number;
  competition: string;
  division: number | null;
  stage: string | null;
  group_name: string | null;
  round: number | null;
  leg: number | null;
  participant_type: string;
  home_id: string;
  away_id: string;
  home_goals: number | null;
  away_goals: number | null;
  status: string;
  played_at: string | null;
};

const matchFields = `id, season, competition, division, stage, group_name,
  round, leg, participant_type, home_id, away_id, home_goals, away_goals,
  status, played_at`;

function authorized(password: string | null | undefined) {
  return Boolean(process.env.ADMIN_PASSWORD) && password === process.env.ADMIN_PASSWORD;
}

function validSeason(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 4;
}
function validPosition(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}
function parseSchedule(body: WriteBody) {
  const date = body.display_date?.trim() || null;
  const time = body.display_time?.trim() || null;
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  if (time && !date) return null;
  if (date) {
    const [y, m, d] = date.split("-").map(Number);
    const v = new Date(Date.UTC(y, m - 1, d));
    if (v.getUTCFullYear() !== y || v.getUTCMonth() + 1 !== m || v.getUTCDate() !== d) return null;
  }
  return { date, time };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    if (!authorized(request.headers.get("x-admin-password"))) {
      return NextResponse.json({ error: "Невірний пароль адміністратора" }, { status: 401 });
    }
    const season = Number(url.searchParams.get("season"));
    if (!validSeason(season)) {
      return NextResponse.json({ error: "Некоректний сезон" }, { status: 400 });
    }

    // The highlights table is independent from the old date-bound day highlights.
    const { data: featured, error: fe } = await supabaseAdmin
      .from("weekly_featured_matches")
      .select("id, season, position, match_id, display_date, display_time")
      .eq("season", season)
      .order("position", { ascending: true });
    if (fe) throw fe;

    // Supabase may cap a single result to 1000 rows; page through all season matches.
    const matches: DbMatch[] = [];
    let page = 0;
    const pageSize = 500;
    while (true) {
      const { data, error } = await supabaseAdmin.from("matches")
        .select(matchFields)
        .eq("season", season)
        .order("id", { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) throw error;
      const rows = (data ?? []) as DbMatch[];
      matches.push(...rows);
      if (rows.length < pageSize) break;
      page++;
      if (page > 40) throw new Error("Забагато матчів сезону для завантаження");
    }

    // Optional team names for team-based cups.
    const { data: coopTeams } = await supabaseAdmin.from("coop_teams")
      .select("id, name").eq("season", season);
    return NextResponse.json({
      success: true,
      featured: featured ?? [],
      matches,
      coop_teams: coopTeams ?? [],
    });
  } catch (error) {
    console.error("WEEKLY FEATURED GET:", error);
    return NextResponse.json({ error: "Помилка завантаження матчів тижня. Перевірте SQL-міграцію." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as WriteBody;
    if (!authorized(body.password)) {
      return NextResponse.json({ error: "Невірний пароль адміністратора" }, { status: 401 });
    }
    if (!validSeason(body.season) || !validPosition(body.position) || !body.match_id?.trim()) {
      return NextResponse.json({ error: "Вкажіть сезон, позицію 1–5 і матч" }, { status: 400 });
    }
    const schedule = parseSchedule(body);
    if (!schedule) {
      return NextResponse.json({ error: "Некоректна дата або час. Час можна встановити лише разом із датою." }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin.rpc("set_weekly_featured_match", {
      p_season: body.season,
      p_position: body.position,
      p_match_id: body.match_id,
      p_display_date: schedule.date,
      p_display_time: schedule.time,
    });
    if (error) {
      console.error("WEEKLY FEATURED POST:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: true, featured: data });
  } catch (error) {
    console.error("WEEKLY FEATURED POST:", error);
    return NextResponse.json({ error: "Помилка збереження матчу тижня" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json() as WriteBody;
    if (!authorized(body.password)) {
      return NextResponse.json({ error: "Невірний пароль адміністратора" }, { status: 401 });
    }
    if (!validSeason(body.season) || !validPosition(body.position)) {
      return NextResponse.json({ error: "Некоректний сезон або позиція" }, { status: 400 });
    }
    const { error } = await supabaseAdmin.from("weekly_featured_matches")
      .delete().eq("season", body.season).eq("position", body.position);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("WEEKLY FEATURED DELETE:", error);
    return NextResponse.json({ error: "Не вдалося прибрати матч із головної" }, { status: 500 });
  }
}
