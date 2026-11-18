import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import PlayerAccountPanel from "../../../components/player-account/PlayerAccountPanel";

export const dynamic = "force-dynamic";

/**
 * Strictly local harness for the REAL player account panel.
 * Does not load the full public profile (emblems, history, other competitions).
 * Account data is still fetched by the existing ownership-checked API.
 * Never enable this on production or against the production database.
 */
export default async function LocalPlayerCabinetTestPage() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host")?.toLowerCase() ?? "";
  let supabaseHost = "";
  try {
    supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    notFound();
  }

  if (
    process.env.NODE_ENV !== "development" ||
    process.env.IRON_LEAGUE_E2E_TEST_ONLY !== "true" ||
    process.env.PLAYER_ACCOUNTS_ENABLED !== "true" ||
    host !== "localhost:3001" ||
    supabaseHost !== "knrdsraydifnnbqycird.supabase.co"
  ) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#030b16] py-8 text-white sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="rounded-xl border border-blue-400/20 bg-[#10213a] px-4 py-5 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-300">
            Iron League / local test only
          </p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">
            Тест особистого кабінету
          </h1>
          <p className="mt-2 text-sm text-white/65">
            Справжній компонент кабінету, без завантаження повної сторінки гравця.
            Доступ і матчі перевіряються сервером для Andrew_SM.
          </p>
          <div className="mt-4">
            <Link
              href="/auth-test"
              className="inline-flex rounded-lg border border-blue-300/30 bg-blue-400/10 px-4 py-2 text-sm font-semibold text-blue-100 hover:bg-blue-400/20"
            >
              Повернутися до Discord-входу
            </Link>
          </div>
        </div>
      </div>
      <PlayerAccountPanel playerId="andrew-sm" />
      <p className="mx-auto mt-4 max-w-7xl px-4 text-xs text-white/45 sm:px-6">
        Якщо кабінет не з’являється, перевір сесію Discord через /auth-test.
        Ця сторінка не змінює офіційних результатів автоматично.
      </p>
    </main>
  );
}
