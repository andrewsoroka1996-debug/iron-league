import { notFound } from "next/navigation";
import { players } from "../../../data/players";
import ExistingPlayerLinkForm from "../../../components/player-account/ExistingPlayerLinkForm";
import { playerAccountsEnabled } from "../../../lib/player-account-access-policy";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { robots: { index: false, follow: false } };

/** The application flow is unavailable until the account feature is explicitly enabled. */
export default function LinkExistingPlayerPage() {
  if (!playerAccountsEnabled(process.env.PLAYER_ACCOUNTS_ENABLED)) notFound();

  // Public, historical identities only. Do not pass any Auth or privileged data.
  const options = players.map(({ id, nickname }) => ({ id, nickname }));

  return (
    <main className="min-h-screen bg-[#030711] px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <ExistingPlayerLinkForm players={options} />
      </div>
    </main>
  );
}
