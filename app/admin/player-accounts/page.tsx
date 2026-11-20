import { notFound } from "next/navigation";
import { playerAccountsEnabled } from "../../../lib/player-account-access-policy";
import PlayerAccountLinksAdminPanel from "../../../components/admin/PlayerAccountLinksAdminPanel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** The page exposes no requests without a separate password-checked POST. */
export default function PlayerAccountsAdminPage() {
  if (!playerAccountsEnabled(process.env.PLAYER_ACCOUNTS_ENABLED)) notFound();

  return (
    <main className="min-h-screen bg-[#030711] px-4 py-8 text-white sm:py-12">
      <div className="mx-auto max-w-5xl">
        <PlayerAccountLinksAdminPanel />
      </div>
    </main>
  );
}
