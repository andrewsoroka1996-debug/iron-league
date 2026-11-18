"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

const ORIGIN = "https://ironleague.com.ua";
const SUPABASE_ORIGIN = "https://mrihbcbmpzenhepaglcm.supabase.co";

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (window.location.origin !== ORIGIN || !url || !key || new URL(url).origin !== SUPABASE_ORIGIN) {
    throw new Error("Пілотний вхід недоступний у цьому середовищі.");
  }
  return createBrowserClient(url, key);
}

export default function DiscordPilotClient() {
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data, error } = await client().auth.getUser();
        if (active && data.user && !error) {
          setName(String(data.user.user_metadata?.full_name || data.user.user_metadata?.name || "Discord"));
        }
      } catch {
        if (active) setMessage("Не вдалося перевірити сесію.");
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => { active = false; };
  }, []);

  async function login() {
    setBusy(true);
    setMessage("");
    try {
      const { error } = await client().auth.signInWithOAuth({
        provider: "discord",
        options: { redirectTo: `${ORIGIN}/auth/callback`, scopes: "identify email" },
      });
      if (error) throw error;
    } catch {
      setMessage("Не вдалося почати Discord-вхід.");
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      const { error } = await client().auth.signOut();
      if (error) throw error;
      setName(null);
      setMessage("Вихід виконано.");
    } catch {
      setMessage("Не вдалося завершити сесію.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030711] px-4 py-8 text-white">
      <div className="w-full max-w-md rounded-2xl border border-blue-400/25 bg-[#10253e] p-8 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-300">IRON LEAGUE · PRIVATE PILOT</p>
        <h1 className="mt-3 text-2xl font-black">Перевірка Discord-входу</h1>
        <p className="mt-4 text-sm text-white/70">Лише для попередньо дозволених Discord-акаунтів. Це не публічний особистий кабінет.</p>
        {checking ? (
          <p className="mt-6">Перевіряємо сесію…</p>
        ) : name ? (
          <>
            <p className="mt-6 text-green-300">Discord-вхід підтверджено</p>
            <p className="mt-2 text-lg font-bold break-words">{name}</p>
            <button type="button" onClick={logout} disabled={busy} className="mt-6 w-full rounded-xl border border-white/30 p-4 font-bold disabled:opacity-50">Вийти</button>
          </>
        ) : (
          <button type="button" onClick={login} disabled={busy} className="mt-6 w-full rounded-xl bg-[#5865F2] p-4 font-bold disabled:opacity-50">{busy ? "Підключення…" : "Увійти через Discord"}</button>
        )}
        {message && <p role="status" className="mt-4 text-sm text-amber-200">{message}</p>}
        <p className="mt-6 text-xs text-white/50">Жодних прав на редагування результатів ця сторінка не надає.</p>
      </div>
    </main>
  );
}
