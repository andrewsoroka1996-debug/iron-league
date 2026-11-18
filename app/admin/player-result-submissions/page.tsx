import { notFound } from "next/navigation";
import { playerAccountsEnabled } from "../../../lib/player-account-access-policy";
import PlayerResultReviewPanel from "../../../components/admin/PlayerResultReviewPanel";

export const dynamic = "force-dynamic";

/** The page contains no privileged data; the POST API checks the admin secret. */
export default function PlayerResultSubmissionsAdminPage() {
  if (!playerAccountsEnabled(process.env.PLAYER_ACCOUNTS_ENABLED)) notFound();
  return <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 text-white">
    <PlayerResultReviewPanel />
  </main>;
}
