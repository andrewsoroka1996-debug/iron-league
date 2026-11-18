import { NextRequest } from "next/server";
import { handlePlayerLinkRequest } from "../../../../lib/player-account-link-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  return handlePlayerLinkRequest(request, "GET");
}

export async function POST(request: NextRequest) {
  return handlePlayerLinkRequest(request, "POST");
}
