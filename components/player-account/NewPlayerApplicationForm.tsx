"use client";

import { useEffect, useState, type FormEvent } from "react";
import { approvedPlayerProfileHref, profileRequestStatusLabel } from "../../lib/player-profile-request-display";

type Application = {
  id: string;
  desired_nickname: string;
  note: string | null;
  status: string;
  created_at: string;
  decision_reason?: string | null;
  approved_player_id?: string | null;
};
type ApiResult = { requests?: Application[]; request?: Application; error?: string };
const endpoint = "/api/player-account/profile-requests";

function dateLabel(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString("uk-UA");
}

export default function NewPlayerApplicationForm() {
  const [nickname, setNickname] = useState("");
  const [note, setNote] = useState("");
  const [requests, setRequests] = useState<Application[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refresh(signal?: AbortSignal) {
    const response = await fetch(endpoint, { cache: "no-store", credentials: "same-origin", signal });
    const result = await response.json().catch(() => ({})) as ApiResult;
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    setRequests(Array.isArray(result.requests) ? result.requests : []);
  }

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal).catch((cause) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Немає доступу");
    });
    return () => controller.abort();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || requests?.some((request) => request.status === "pending")) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ nickname, note }),
      });
      const result = await response.json().catch(() => ({})) as ApiResult;
      if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
      setMessage("Заявку отримано. До рішення адміністратора права гравця не надаються.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Заявку не надіслано");
    } finally {
      setBusy(false);
    }
  }

  const pending = requests?.some((request) => request.status === "pending") ?? false;

  return (
    <div className="space-y-6">
      <a href="/" className="text-sm font-semibold text-blue-300">← Iron League</a>
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-blue-300">IRON LEAGUE · ЗАЯВКА НОВОГО ГРАВЦЯ</p>
        <h1 className="mt-3 text-2xl font-black sm:text-3xl">Я новий гравець</h1>
        <p className="mt-2 text-sm text-white/70">Поки у вас немає профілю Iron League, можна подати заявку на його створення. Discord-вхід підтверджує акаунт, але сам собою не надає прав гравця.</p>
      </header>
      {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-950/30 p-4 text-sm text-red-200">{error} </p>}
      {message && <p role="status" className="rounded-xl border border-emerald-400/25 bg-emerald-950/20 p-4 text-sm text-emerald-200">{message}</p>}
      <section className="rounded-2xl border border-white/10 bg-[#07101d] p-5">
        <h2 className="text-lg font-bold">Мої заявки</h2>
        {requests === null && <p className="mt-3 text-sm text-white/60">Завантаження або очікування Discord-входу…</p>}
        {requests?.length === 0 && <p className="mt-3 text-sm text-white/60">Заявок поки немає.</p>}
        {requests?.map((request) => {
          const profileHref = approvedPlayerProfileHref(request);
          return (
            <article key={request.id} className="mt-3 rounded-xl border border-white/10 p-3 text-sm">
              <p className="font-bold">{request.desired_nickname} — {profileRequestStatusLabel(request.status)}</p>
              <p className="mt-1 text-xs text-white/55">Подано: {dateLabel(request.created_at)}</p>
              {request.decision_reason && <p className="mt-2 text-amber-200">Причина: {request.decision_reason}</p>}
              {profileHref && (
                <a href={profileHref} className="mt-3 inline-block font-semibold text-blue-300 underline-offset-4 hover:underline">
                  Перейти до профілю →
                </a>
              )}
            </article>
          );
        })}
      </section>
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-blue-400/20 bg-[#07101d] p-5 sm:p-6">
        <h2 className="text-lg font-bold">Заявка на створення профілю</h2>
        <label className="block text-sm font-semibold">
          Бажаний нікнейм
          <input required minLength={3} maxLength={32} value={nickname} onChange={(event) => setNickname(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/20 bg-[#030711] px-4 py-3 text-white outline-none focus:border-blue-400" placeholder="Ваш нік в Iron League" />
        </label>
        <label className="block text-sm font-semibold">
          Примітка для адміністратора (необов'язково)
          <textarea rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/20 bg-[#030711] p-3 text-white outline-none focus:border-blue-400" placeholder="Наприклад, як з вами зв'язатися у Discord" />
        </label>
        <button type="submit" disabled={busy || pending || requests === null} className="w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-40">
          {busy ? "Надсилання…" : pending ? "Заявка вже на розгляді" : "Надіслати заявку"}
        </button>
        <p className="text-xs text-white/50">Заявка не створює профіль, не додає до турніру та не відкриває подання результатів. Потрібне окреме рішення адміністратора.</p>
      </form>
    </div>
  );
}
