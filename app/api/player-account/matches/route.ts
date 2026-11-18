import { NextRequest, NextResponse } from "next/server";
import { players } from "../../../../data/players";
import { checkPlayerOwnershipForRequest } from "../../../../lib/player-account-ownership-server";
import { loadSeason4DirectPlayerMatchGroups } from "../../../../lib/player-account-matches-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Read-only Season 4 direct-match endpoint. Ownership is checked before any
 * match query. No mutation, account signup, linking, or admin action here.
 */
export async function GET(request: NextRequest) {
  const playerId = request.nextUrl.searchParams.get("playerId") ?? "";
  const access = await checkPlayerOwnershipForRequest(request, playerId);
  const reply = (body: Record<string, unknown>, status: number) => {
    const response = NextResponse.json(body, { status });
    access.applyAuthCookies(response);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Vary", "Cookie");
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  };

  switch (access.decision) {
    case "disabled":
    case "invalid_profile":
      return reply({ error: "Недоступно" }, 404);
    case "unauthenticated":
      return reply({ error: "Потрібен вхід через Discord" }, 401);
    case "unlinked":
    case "forbidden":
      return reply({ error: "Доступ до цього профілю заборонено" }, 403);
    case "unavailable":
      return reply({ error: "Перевірка доступу тимчасово недоступна" }, 503);
    case "owner":
      break;
    default:
      return reply({ error: "Доступ заборонено" }, 403);
  }

  try {
    const groups = await loadSeason4DirectPlayerMatchGroups(playerId);
    const ids = new Set<string>([playerId]);
    for (const group of groups) {
      ids.add(group.opponentId);
      for (const match of group.matches) {
        ids.add(match.home_id);
        ids.add(match.away_id);
      }
    }
    const playerNames: Record<string, string> = {};
    for (const player of players) {
      if (ids.has(player.id)) playerNames[player.id] = player.nickname;
    }
    return reply({ groups, playerNames }, 200);
  } catch (error) {
    console.error("PLAYER ACCOUNT MATCHES: load failed", error);
    // Never expose DB internals to a visitor.
    return reply({ error: "Не вдалося завантажити матчі" }, 503);
  }
}
