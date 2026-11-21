"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

/** Public account session exit; it never grants or changes player ownership. */
export default function PublicDiscordSignOut() {
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function signOut() {
    if (busy) return;
    setBusy(true);
    setErrorMessage("");
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!url || !key) throw new Error("Missing public auth configuration");
      const client = createBrowserClient(url, key);
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) throw error;
      // Full navigation discards server-rendered private state after cookies clear.
      window.location.replace("/account");
    } catch {
      setErrorMessage("Не вдалося вийти з акаунта. Спробуйте ще раз.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        disabled={busy}
        onClick={() => void signOut()}
        className="rounded-lg border border-white/25 px-3 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Завершення сесії…" : "Вийти з акаунта"}
      </button>
      {errorMessage && <p role="alert" className="mt-2 text-sm text-amber-200">{errorMessage}</p>}
    </div>
  );
}
