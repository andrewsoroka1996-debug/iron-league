"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type PlayerOption = { id: string; nickname: string };
type LinkRequest = {
  id: string;
  player_id: string;
  status: string;
  created_at: string;
  decided_at?: string | null;
  decision_reason?: string | null;
};
type ApiResult = { requests?: LinkRequest[]; request?: LinkRequest; error?: string };

const endpoint = "/api/player-account/link-requests";

function statusLabel(status: string): string {
  switch (status) {
    case "pending": return "На розгляді";
    case "approved": return "Схвалено";
    case "rejected": return "Відхилено";
    default: return "Статус уточнюється";
  }
}

function dateLabel(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "Дата недоступна" : date.toLocaleString("uk-UA");
}

export default function ExistingPlayerLinkForm({ players }: { players: PlayerOption[] }) {
  const [query, setQuery] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [requests, setRequests] = useState<LinkRequest[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const known = useMemo(() => new Set(players.map((player) => player.id)), [players]);
  const names = useMemo(() => new Map(players.map((player) => [player.id, player.nickname])), [players]);
  const options = useMemo(() => {
    const normalized = query.normalize("NFC").trim().toLocaleLowerCase("uk");
    return players
      .filter(({ id, nickname }) => !normalized ||
        nickname.normalize("NFC").toLocaleLowerCase("uk").includes(normalized) ||
        id.toLocaleLowerCase("uk").includes(normalized))
      .sort((a, b) => a.nickname.localeCompare(b.nickname, "uk"));
  }, [players, query]);

  async function refresh(signal?: AbortSignal) {
    const response = await fetch(endpoint, {
      credentials: "same-origin",
      cache: "no-store",
      signal,
    });
    const result = await response.json().catch(() => ({})) as ApiResult;
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("Спочатку потрібно увійти через Discord. Публічний Discord-вхід ще не відкрито.");
      }
      throw new Error(result.error || `Помилка запиту: HTTP ${response.status}`);
    }
    setRequests(Array.isArray(result.requests) ? result.requests : []);
  }

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal).catch((cause) => {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "Не вдалося завантажити заявки");
      }
    });
    return () => controller.abort();
  }, []);

  const pending = requests?.some((request) => request.status === "pending") ?? false;
  const approved = requests?.some((request) => request.status === "approved") ?? false;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || requests === null || pending || approved || !known.has(playerId)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ playerId }),
      });
      const result = await response.json().catch(() => ({})) as ApiResult;
      if (!response.ok) throw new Error(result.error || `Помилка запиту: HTTP ${response.status}`);
      setMessage("Заявку подано. Прив'язка набуде чинності лише після підтвердження адміністратора.");
      setQuery("");
      setPlayerId("");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Заявку не створено");
    } finally {
      setBusy(false);
    }
  }

  async function reload() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не вдалося оновити заявки");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <a href="/" className="text-sm font-semibold text-blue-300 hover:text-blue-200">← Iron League</a>
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-blue-300">IRON LEAGUE · АКАУНТ ГРАВЦЯ</p>
        <h1 className="mt-3 text-2xl font-black sm:text-3xl">Це мій профіль</h1>
        <p className="mt-2 text-sm text-white/70">
          Якщо ви вже брали участь в Iron League, знайдіть свій історичний профіль та подайте
          заявку на прив'язку Discord. Сам Discord-нік не підтверджує право власності:
          рішення ухвалює адміністратор.
        </p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-950/30 p-4 text-sm text-red-200">{error}</p>}
      {message && <p role="status" className="rounded-xl border border-emerald-400/25 bg-emerald-950/20 p-4 text-sm text-emerald-200">{message}</p>}

      <section className="space-y-3 rounded-2xl border border-white/10 bg-[#07101d] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Мої заявки</h2>
          <button type="button" onClick={() => void reload()} disabled={busy}
            className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-blue-200 disabled:opacity-50">
            Оновити статус
          </button>
        </div>
        {requests === null && <p className="text-sm text-white/60">Перевірка Discord-сесії та завантаження заявок…</p>}
        {requests?.length === 0 && <p className="text-sm text-white/60">Заявок поки немає.</p>}
        {requests?.map((request) => (
          <article key={request.id} className="rounded-xl border border-white/10 p-3 text-sm">
            <p className="font-bold">
              {names.get(request.player_id) ?? request.player_id} — {statusLabel(request.status)}
            </p>
            <p className="mt-1 text-xs text-white/55">Подано: {dateLabel(request.created_at)}</p>
            {request.decision_reason && (
              <p className="mt-2 text-sm text-amber-200">Причина рішення: {request.decision_reason}</p>
            )}
            {request.status === "approved" && known.has(request.player_id) && (
              <a href={`/players/${encodeURIComponent(request.player_id)}`}
                className="mt-2 inline-block font-bold text-blue-300 underline hover:text-blue-200">
                Відкрити профіль
              </a>
            )}
          </article>
        ))}
      </section>

      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-blue-400/20 bg-[#07101d] p-5 sm:p-6">
        <h2 className="text-lg font-bold">Заявка на прив'язку профілю</h2>
        <label className="block text-sm font-semibold">
          Пошук за ніком або ID гравця
          <input type="search" maxLength={64} value={query}
            onChange={(event) => { setQuery(event.target.value); setPlayerId(""); }}
            className="mt-2 w-full rounded-xl border border-white/20 bg-[#030711] px-4 py-3 text-white outline-none focus:border-blue-400"
            placeholder="Введіть свій нік в Iron League" />
        </label>
        <label className="block text-sm font-semibold">
          Оберіть свій історичний профіль
          <select required value={playerId} onChange={(event) => setPlayerId(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/20 bg-[#030711] px-4 py-3 text-white outline-none focus:border-blue-400">
            <option value="">{options.length ? "Оберіть гравця" : "Нічого не знайдено"}</option>
            {options.map((player) => (
              <option key={player.id} value={player.id}>{player.nickname} ({player.id})</option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={busy || requests === null || pending || approved || !known.has(playerId)}
          className="w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
          {busy ? "Надсилання…" : approved ? "Профіль уже прив'язано" : pending ? "Заявка вже на розгляді" : "Подати заявку"}
        </button>
        <p className="text-xs text-white/55">
          Заявка не надає прав на результати, турніри або налаштування профілю.
          До схвалення адміністратором ваш профіль залишається публічним і незмінним.
        </p>
      </form>
    </div>
  );
}
