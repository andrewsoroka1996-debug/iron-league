import { NextRequest } from "next/server";
import { handleAdminProfileRequest } from "../../../../lib/player-profile-request-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// POST only; ADMIN_PASSWORD must never appear in a URL.
export async function POST(request: NextRequest) {
  return handleAdminProfileRequest(request);
}
