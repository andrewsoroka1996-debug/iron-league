import { NextRequest } from "next/server";
import { handleAdminLinkRequest } from "../../../../lib/player-account-link-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// POST only: never place ADMIN_PASSWORD in a URL or access log.
export async function POST(request: NextRequest) {
  return handleAdminLinkRequest(request);
}
