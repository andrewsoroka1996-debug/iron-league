import { notFound } from "next/navigation";
import { profileApplicationsEnabled } from "../../../lib/player-profile-request-server";
import { existingPlayerApplicationsEnabled } from "../../../lib/player-account-access-policy";
import NewPlayerApplicationForm from "../../../components/player-account/NewPlayerApplicationForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function NewPlayerApplicationPage() {
  if (!profileApplicationsEnabled()) notFound();
  return (
    <main className="min-h-screen bg-[#030711] px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <NewPlayerApplicationForm />
        {existingPlayerApplicationsEnabled(
          process.env.PLAYER_ACCOUNTS_ENABLED,
          process.env.IRON_LEAGUE_EXISTING_PLAYER_APPLICATIONS_ENABLED,
        ) && (
          <p className="mt-6 text-sm text-white/65">
            Уже маєте історичний профіль Iron League?{" "}
            <a href="/account/link-player" className="font-semibold text-blue-300 underline hover:text-blue-200">
              Подайте заявку на його прив'язку до Discord
            </a>.
          </p>
        )}
      </div>
    </main>
  );
}
