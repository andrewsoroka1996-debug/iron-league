import { notFound } from "next/navigation";
import { profileApplicationsEnabled } from "../../../lib/player-profile-request-server";
import NewPlayerApplicationForm from "../../../components/player-account/NewPlayerApplicationForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function NewPlayerApplicationPage() {
  if (!profileApplicationsEnabled()) notFound();
  return (
    <main className="min-h-screen bg-[#030711] px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <NewPlayerApplicationForm />
      </div>
    </main>
  );
}
