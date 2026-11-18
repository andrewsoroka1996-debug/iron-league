import { NextRequest, NextResponse } from "next/server";
import { checkPlayerOwnershipForRequest } from "../../../../lib/player-account-ownership-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Read-only endpoint for a future signed-in account UI.
 * Disabled by default; no link creation, login or privilege escalation here.
 * Example when enabled: GET /api/player-account/ownership?playerId=andrew-sm
 */
export async function GET(request: NextRequest) {
  const playerId = request.nextUrl.searchParams.get("playerId") ?? "";
  const result = await checkPlayerOwnershipForRequest(request, playerId);

  // Deliberately do not disclose linked account details to callers.
  const status =
    result.decision === "disabled" || result.decision === "invalid_profile"
      ? 404
      : result.decision === "unauthenticated"
        ? 401
        : result.decision === "unavailable"
          ? 503
          : result.decision === "owner"
            ? 200
            : 403;

  const response = NextResponse.json(
    { isOwner: result.decision === "owner" },
    { status },
  );
  result.applyAuthCookies(response);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie");
  return response;
}
