"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  PUBLIC_ORIGIN,
  PUBLIC_SUPABASE_ORIGIN,
} from "../../../lib/player-public-oauth-policy";

/** No privileged key or admin credentials are ever used in the browser. */
function browserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (
    window.location.origin !== PUBLIC_ORIGIN || !url || !key ||
    new URL(url).origin !== PUBLIC_SUPABASE_ORIGIN
  ) throw new Error("Discord-вхід недоступний у цьому середовищі.");
  return createBrowserClient(url, key);
}

export default function PublicDiscordLogin() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("oauth") === "error") {
      setMessage("Не вдалося завершити Discord-вхід. Спробуйте ще раз.");
    }
  }, []);

  async function login() {
    setBusy(true);
    setMessage("");
    try {
      const { error } = await browserClient().auth.signInWithOAuth({
        provider: "discord",
        options: {
          redirectTo: `${PUBLIC_ORIGIN}/auth/public-callback`,
          scopes: "identify email",
        },
      });
      if (error) throw error;
    } catch {
      setMessage("Не вдалося розпочати вхід через Discord.");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030711] px-4 py-8 text-white">
      <section className="w-full max-w-md rounded-2xl border border-blue-400/25 bg-[#10253e] p-6 text-center sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-300">IRON LEAGUE · АКАУНТ ГРАВЦЯ</p>
        <h1 className="mt-3 text-2xl font-black">Вхід через Discord</h1>
        <p className="mt-3 text-sm text-white/70">
          Авторизація підтверджує лише Discord-акаунт. Доступ до профілю Iron League
          надається після окремого схвалення адміністратора.
        </p>
        <button type="button" disabled={busy} onClick={() => void login()}
          className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white disabled:opacity-50">
          {busy ? "Переходимо до Discord…" : "Продовжити з Discord"}
        </button>
        {message && <p role="alert" className="mt-4 text-sm text-rose-300">{message}</p>}
        <a href="/" className="mt-5 inline-block text-sm text-blue-300 underline">На головну Iron League</a>
      </section>
    </main>
  );
}
