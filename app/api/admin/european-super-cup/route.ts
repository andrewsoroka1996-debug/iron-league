import { NextResponse } from "next/server";
import { loadEuropeanSuperCupState } from "../../../../lib/european-super-cup-server";

export const dynamic = "force-dynamic";

/** Read-only eligibility preview; creation is independently validated in /api/admin/match. */
export async function GET(request: Request) {
  if (!process.env.ADMIN_PASSWORD ||
      request.headers.get("x-admin-password") !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ success: false, error: "Невірний пароль адміністратора" }, { status: 401 });
  }

  const season = Number(new URL(request.url).searchParams.get("season"));
  if (!Number.isInteger(season) || season !== 3) {
    return NextResponse.json({ success: false, error: "Суперкубок доступний лише для сезону 3" }, { status: 400 });
  }

  try {
    const state = await loadEuropeanSuperCupState(season);
    return NextResponse.json({ success: true, ...state }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("SUPER CUP PREVIEW ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Помилка перевірки фіналістів Суперкубка" },
      { status: 500 }
    );
  }
}
