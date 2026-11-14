import { NextResponse } from "next/server";

import { getAssociationLeague } from "../../../../lib/association-league";
import {
  assessAssociationLeagueFinalization,
} from "../../../../lib/association-league-finalization-rules";
import {
  getAssociationFinalizationMatchStatus,
  getAssociationLeagueFinalization,
  getAssociationPreviewHash,
  insertAssociationLeagueFinalization,
  type FinalizableAssociationSeason,
} from "../../../../lib/association-league-finalization-server";

export const dynamic = "force-dynamic";

function respond(data: object, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      password?: string;
      season?: number;
      action?: "preview" | "finalize";
      previewHash?: string;
      confirmCalendarComplete?: boolean;
      confirmCoefficientsFinal?: boolean;
    };

    if (!process.env.ADMIN_PASSWORD || body.password !== process.env.ADMIN_PASSWORD) {
      return respond({ success: false, error: "Невірний пароль адміністратора" }, 401);
    }

    if (body.season !== 3 && body.season !== 4) {
      return respond({ success: false, error: "Фіналізація доступна лише для сезонів 3–4" }, 400);
    }
    const season = body.season as FinalizableAssociationSeason;

    if (body.action !== "preview" && body.action !== "finalize") {
      return respond({ success: false, error: "Невідома дія" }, 400);
    }

    const already = await getAssociationLeagueFinalization(season);
    if (already) {
      return respond({
        success: true, finalized: true, ready: false,
        season, champion: {
          associationId: already.associationId,
          associationName: already.associationName,
          leaguePoints: already.leaguePoints,
          members: already.rows.find((row) => row.associationId === already.associationId)
            ?.members.map((member) => ({
              playerId: member.playerId,
              playerName: member.playerName,
            })) ?? already.memberIds,
        },
        finalizedAt: already.finalizedAt,
        message: "Результат уже фіналізовано та захищено від повторного запису.",
      });
    }

    const [league, matches] = await Promise.all([
      getAssociationLeague(season),
      getAssociationFinalizationMatchStatus(season),
    ]);
    const assessment = assessAssociationLeagueFinalization(
      league, matches.unresolved, matches.recorded
    );
    const previewHash = getAssociationPreviewHash(
      league, matches.unresolved, matches.recorded
    );
    const champion = assessment.champion
      ? {
          associationId: assessment.champion.associationId,
          associationName: assessment.champion.associationName,
          leaguePoints: assessment.champion.leaguePoints,
          members: assessment.champion.members.map((member) => ({
            playerId: member.playerId,
            playerName: member.playerName,
          })),
        }
      : null;

    const preview = {
      success: true,
      finalized: false,
      season,
      ready: assessment.ready,
      blockers: assessment.blockers,
      recordedMatches: matches.recorded,
      unresolvedMatches: matches.unresolved,
      champion,
      previewHash,
      message: "Попередній перегляд. Трофей ще НЕ присуджений.",
    };

    if (body.action === "preview") return respond(preview);

    if (!assessment.ready || !assessment.champion) {
      return respond({ ...preview, error: "Сезон ще не готовий до фіналізації." }, 409);
    }

    if (
      body.confirmCalendarComplete !== true ||
      body.confirmCoefficientsFinal !== true
    ) {
      return respond({ ...preview, error: "Підтвердьте повний календар і остаточність коефіцієнтів." }, 400);
    }

    if (!body.previewHash || body.previewHash !== previewHash) {
      return respond({ ...preview, error: "Дані змінилися після попереднього перегляду. Перевірте їх ще раз." }, 409);
    }

    await insertAssociationLeagueFinalization({
      season,
      associationId: assessment.champion.associationId,
      associationName: assessment.champion.associationName,
      memberIds: assessment.champion.members.map((member) => member.playerId),
      leaguePoints: assessment.champion.leaguePoints!,
      rows: league.rows,
      previewHash,
      finalizedAt: new Date().toISOString(),
    });

    return respond({
      success: true, finalized: true, season,
      message: "Лігу асоціацій фіналізовано. Snapshot збережено.",
      champion,
    });
  } catch (error) {
    console.error("ASSOCIATION LEAGUE FINALIZATION ERROR", error);
    return respond({
      success: false,
      error: error instanceof Error ? error.message : "Помилка фіналізації",
    }, 500);
  }
}
