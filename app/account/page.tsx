import Link from "next/link";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getDiscordProviderId } from "../../lib/discord-identity-provider-id";
import { playerAccountsEnabled } from "../../lib/player-account-access-policy";
import { profileApplicationsEnabled } from "../../lib/player-profile-request-server";
import { publicDiscordAuthEnabled } from "../../lib/player-public-oauth-policy";
import { resolvePublicPlayer } from "../../lib/dynamic-player-profiles-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { robots: { index: false, follow: false } };

type HubState =
  | { kind: "signed-out" }
  | { kind: "discord-required" }
  | { kind: "unlinked" }
  | { kind: "linked"; href: string; nickname: string }
  | { kind: "profile-unavailable" }
  | { kind: "unavailable" };

/**
 * Account landing page for the FUTURE public OAuth flow.
 * Read-only, RLS-scoped, no service-role/admin credentials.
 * No nickname, user metadata or pending request ever grants ownership.
 * The production pilot and OAuth callback are deliberately NOT changed here.
 */
async function loadHubState(): Promise<HubState> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { kind: "unavailable" };

  try {
    const store = await cookies();
    const client = createServerClient(url, key, {
      cookies: {
        getAll: () => store.getAll(),
        setAll(changes) {
          try {
            for (const { name, value, options } of changes) {
              store.set(name, value, options);
            }
          } catch {
            // Server Components may not write refresh cookies. Do not grant
            // access on refresh failure: getUser() remains the auth gate.
          }
        },
      },
    });

    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) {
      if (!auth.user && (!authError || authError.name === "AuthSessionMissingError")) {
        return { kind: "signed-out" };
      }
      return { kind: "unavailable" };
    }

    const discordIdentity = auth.user.identities?.find((identity) => identity.provider === "discord");
    if (!getDiscordProviderId(discordIdentity)) {
      return { kind: "discord-required" };
    }

    // SELECT is allowed only for the current authenticated owner by RLS.
    // If the migration, grants or policy are missing, fail closed.
    const { data: link, error: linkError } = await client
      .from("player_discord_links")
      .select("player_id")
      .eq("auth_user_id", auth.user.id)
      .maybeSingle();
    if (linkError) return { kind: "unavailable" };
    if (!link) return { kind: "unlinked" };

    if (typeof link.player_id !== "string") return { kind: "profile-unavailable" };
    const profile = await resolvePublicPlayer(link.player_id);
    if (!profile || profile.id !== link.player_id) {
      return { kind: "profile-unavailable" };
    }
    return {
      kind: "linked",
      href: `/players/${encodeURIComponent(profile.id)}`,
      nickname: profile.nickname,
    };
  } catch {
    return { kind: "unavailable" };
  }
}

export default async function PlayerAccountHomePage() {
  if (!playerAccountsEnabled(process.env.PLAYER_ACCOUNTS_ENABLED)) notFound();
  const state = await loadHubState();
  const newApplicationsAvailable = profileApplicationsEnabled();
  const publicLoginAvailable = publicDiscordAuthEnabled({
    nodeEnv: process.env.NODE_ENV,
    accountsEnabled: process.env.PLAYER_ACCOUNTS_ENABLED,
    publicEnabled: process.env.IRON_LEAGUE_PUBLIC_DISCORD_AUTH_ENABLED,
    pilotEnabled: process.env.IRON_LEAGUE_PROD_DISCORD_PILOT_ENABLED,
    localTestEnabled: process.env.IRON_LEAGUE_E2E_TEST_ONLY,
    requestOrigin: "https://ironleague.com.ua",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  return (
    <main className="min-h-screen bg-[#030711] px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/" className="text-sm font-semibold text-blue-300 hover:text-blue-200">
          ← Iron League
        </Link>
        <header>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-300">
            IRON LEAGUE · АКАУНТ ГРАВЦЯ
          </p>
          <h1 className="mt-3 text-2xl font-black sm:text-3xl">Мій акаунт</h1>
          <p className="mt-2 text-sm text-white/65">
            Персональний доступ надається тільки після підтвердження Discord і схваленої прив'язки профілю.
          </p>
        </header>

        <section className="space-y-4 rounded-2xl border border-blue-400/20 bg-[#0a1a2b] p-5 sm:p-7">
          {state.kind === "signed-out" && (
            <>
              <h2 className="text-lg font-bold">Потрібен вхід через Discord</h2>
              {publicLoginAvailable ? (
                <>
                  <p className="text-sm text-white/70">
                    Увійдіть через Discord, щоб переглянути прив'язаний профіль або подати заявку.
                  </p>
                  <Link href="/auth/discord" className="inline-flex rounded-xl border border-blue-300/40 bg-blue-500/25 px-4 py-3 text-sm font-bold text-blue-100 hover:bg-blue-500/35">
                    Увійти через Discord
                  </Link>
                </>
              ) : (
                <p className="text-sm text-white/70">
                  Публічний Discord-вхід ще не відкрито. Сторінка не надає доступу без підтвердженої сесії.
                </p>
              )}
            </>
          )}
          {state.kind === "discord-required" && (
            <>
              <h2 className="text-lg font-bold">Discord не підтверджено</h2>
              <p className="text-sm text-white/70">
                Для роботи з акаунтом потрібна перевірена Discord-ідентичність.
              </p>
            </>
          )}
          {state.kind === "unlinked" && (
            <>
              <h2 className="text-lg font-bold">Оберіть свій шлях</h2>
              <p className="text-sm text-white/70">
                Якщо вже брали участь в Iron League, подайте заявку на прив'язку історичного профілю.
                Новачки можуть подати заявку на створення профілю, коли прийом заявок увімкнено.
                Обидва варіанти потребують рішення адміністратора.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/account/link-player" className="rounded-xl border border-blue-300/40 bg-blue-500/20 px-4 py-3 text-sm font-bold text-blue-100 hover:bg-blue-500/30">
                  Це мій профіль
                </Link>
                {newApplicationsAvailable && (
                  <Link href="/account/new-player" className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/15">
                    Я новий гравець
                  </Link>
                )}
              </div>
              <p className="text-xs text-white/50">Статус поданої заявки можна переглянути на відповідній сторінці.</p>
            </>
          )}
          {state.kind === "linked" && (
            <>
              <h2 className="text-lg font-bold">Ваш профіль підтверджено</h2>
              <p className="text-sm text-white/70">Прив'язаний профіль Iron League: <strong className="text-white">{state.nickname}</strong>.</p>
              <Link href={state.href} className="inline-flex rounded-xl border border-blue-300/40 bg-blue-500/25 px-4 py-3 text-sm font-bold text-blue-100 hover:bg-blue-500/35">
                Відкрити мій профіль
              </Link>
            </>
          )}
          {state.kind === "profile-unavailable" && (
            <>
              <h2 className="text-lg font-bold">Прив'язка підтверджена</h2>
              <p className="text-sm text-white/70">
                Ваш профіль наразі недоступний для перегляду. Зверніться до організатора Iron League.
              </p>
            </>
          )}
          {state.kind === "unavailable" && (
            <>
              <h2 className="text-lg font-bold">Тимчасово недоступно</h2>
              <p className="text-sm text-white/70">
                Не вдалося безпечно перевірити акаунт. Спробуйте пізніше або зверніться до організатора.
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
