import { NextRequest } from "next/server";
import { withPlayerAccountAdminDiscordGuard } from "../../../../lib/player-account-admin-access-server";
import { handleAdminLinkRequest } from "../../../../lib/player-account-link-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Two independent factors: verified allowlisted Discord session + ADMIN_PASSWORD.
// Never put the admin password in a URL or server log.
export async function POST(request: NextRequest) {
  return withPlayerAccountAdminDiscordGuard(request, () => handleAdminLinkRequest(request));
}
