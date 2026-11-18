"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { players } from "../../data/players";

const TEST_HOST = "knrdsraydifnnbqycird.supabase.co";
const LOCAL_ORIGIN = "http://localhost:3001";

function getTestClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Тестовий Supabase не налаштований.");
  }

  if (new URL(url).hostname !== TEST_HOST) {
    throw new Error("Заборонено: це не тестовий Supabase.");
  }

  if (window.location.origin !== LOCAL_ORIGIN) {
    throw new Error("Ця сторінка призначена лише для localhost:3001.");
  }

  return createBrowserClient(url, key);
}

export default function AuthTestClient() {
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [linkedPlayerName, setLinkedPlayerName] = useState<string | null>(null);
  const [linkedPlayerId, setLinkedPlayerId] = useState<string | null>(null);
  const [linkState, setLinkState] = useState<"checking" | "linked" | "unlinked" | "error">("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function checkUser() {
      try {
        const supabase = getTestClient();
        const { data, error } = await supabase.auth.getUser();

        if (!active) return;

        if (data.user) {
          const metadata = data.user.user_metadata;

          const name =
            metadata?.full_name ||
            metadata?.name ||
            metadata?.preferred_username ||
            "Discord користувач";

          setUsername(String(name));

          const { data: link, error: linkError } = await supabase
            .from("player_discord_links")
            .select("player_id")
            .eq("auth_user_id", data.user.id)
            .maybeSingle();

          if (!active) return;

          if (linkError) {
            setLinkState("error");
            setMessage("Помилка перевірки прив'язки: " + linkError.message);
          } else if (link) {
            const player = players.find((p) => p.id === link.player_id);
            setLinkedPlayerName(player?.nickname ?? link.player_id);
            setLinkedPlayerId(link.player_id);
            setLinkState("linked");
          } else {
            setLinkState("unlinked");
          }
        } else {
          setUsername(null);

          if (error && error.name !== "AuthSessionMissingError") {
            setMessage(error.message);
          }
        }
      } catch (error) {
        if (active) {
          setMessage(
            error instanceof Error ? error.message : "Помилка перевірки."
          );
        }
      } finally {
        if (active) setChecking(false);
      }
    }

    void checkUser();

    return () => {
      active = false;
    };
  }, []);

  async function login() {
    setLoading(true);
    setMessage("");

    try {
      const supabase = getTestClient();

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {
          redirectTo: `${LOCAL_ORIGIN}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Помилка входу."
      );
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    setMessage("");

    try {
      const supabase = getTestClient();
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      setUsername(null);
      setLinkedPlayerName(null);
      setLinkedPlayerId(null);
      setLinkState("checking");
      setMessage("Вихід виконано.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Помилка виходу."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030711] px-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-blue-400/25 bg-[#10253e] p-8 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-300">
          IRON LEAGUE
        </p>

        <h1 className="mt-3 text-2xl font-black">
          Тестування Discord Auth
        </h1>

        {checking ? (
          <p className="mt-6 text-white/60">Перевіряємо сесію...</p>
        ) : username ? (
          <>
            <p className="mt-6 text-sm text-green-300">
              Авторизація успішна
            </p>

            <p className="mt-2 break-words text-xl font-bold">
              {username}
            </p>

            <p className="mt-2 text-xs text-white/50">
              {linkState === "linked"
                ? "Прив'язано до профілю Iron League: " + linkedPlayerName
                : linkState === "unlinked"
                  ? "Акаунт ще не прив'язаний до профілю Iron League."
                  : linkState === "error"
                    ? "Не вдалося перевірити прив'язку."
                    : "Перевіряємо прив'язку профілю..."}
            </p>

            {linkState === "linked" && linkedPlayerId && (
              <a
                className="mt-5 block w-full rounded-xl border border-blue-300/40 bg-blue-500/20 px-5 py-3 font-bold text-blue-100"
                href={`/players/${encodeURIComponent(linkedPlayerId)}?season=4`}
              >
                Відкрити свій профіль (сезон 4)
              </a>
            )}

            <button
              type="button"
              onClick={logout}
              disabled={loading}
              className="mt-6 w-full rounded-xl border border-white/20 bg-white/10 px-5 py-4 font-bold disabled:opacity-60"
            >
              Вийти з акаунта
            </button>
          </>
        ) : (
          <>
            <p className="mt-5 text-sm text-white/60">
              Увійди через Discord для перевірки сесії.
            </p>

            <button
              type="button"
              onClick={login}
              disabled={loading}
              className="mt-7 w-full rounded-xl bg-[#5865F2] px-5 py-4 font-bold transition hover:bg-[#4752c4] disabled:opacity-60"
            >
              {loading ? "Підключення..." : "Увійти через Discord"}
            </button>
          </>
        )}

        {message && (
          <p className="mt-4 break-words text-sm text-amber-300">
            {message}
          </p>
        )}

        <p className="mt-6 text-xs text-white/40">
          Лише тестовий Supabase. Без доступу до адмінпанелі.
        </p>
      </div>
    </main>
  );
}
