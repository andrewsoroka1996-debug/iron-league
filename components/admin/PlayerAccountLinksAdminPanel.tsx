"use client";

import { useState, type FormEvent } from "react";

type PendingLink = {
  id: string;
  playerId: string;
  createdAt: string;
  discordId: string | null;
  discordName: string | null;
};

type LinkAdminResponse = {
  requests?: PendingLink[];
  error?: string;
  status?: unknown;
};

const endpoint = "/api/admin/player-account-links";

function friendlyDate(raw: string) {
  const value = new Date(raw);
  return Number.isNaN(value.getTime()) ? raw : value.toLocaleString("uk-UA");
}

/** Do not persist, log or send ADMIN_PASSWORD except in the intended POST body. */
export default function PlayerAccountLinksAdminPanel() {
  const [password, setPassword] = useState("");
  const [requests, setRequests] = useState<PendingLink[] | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function post(body: Record<string, unknown>): Promise<LinkAdminResponse> {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      credentials: "same-origin",
      body: JSON.stringify({ password, ...body }),
    });
    const payload: unknown = await response.json().catch(() => null);
    const parsed = payload && typeof payload === "object" ? payload as LinkAdminResponse : {};
    if (!response.ok) throw new Error(parsed.error || `Помилка сервера: HTTP ${response.status}`);
    return parsed;
  }

  async function loadRequests(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (busy || !password.trim()) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const data = await post({ action: "list" });
      if (!Array.isArray(data.requests)) throw new Error("Неочікувана відповідь сервера");
      setRequests(data.requests);
      setMessage("Список очікуваних заявок оновлено.");
    } catch (cause) {
      setRequests(null);
      setError(cause instanceof Error ? cause.message : "Не вдалося завантажити заявки");
    } finally {
      setBusy(false);
    }
  }

  async function decide(request: PendingLink, action: "approve" | "reject") {
    if (busy) return;
    const reason = (reasons[request.id] ?? "").trim();
    if (action === "reject" && (reason.length < 5 || reason.length > 500)) {
      setError("Для відхилення введіть причину від 5 до 500 символів.");
      return;
    }
    if (action === "approve" && !/^\d{15,22}$/.test(request.discordId ?? "")) {
      setError("Не вдалося перевірити числовий Discord ID. Схвалення заблоковано.");
      return;
    }
    const question = action === "approve"
      ? `Підтвердити прив'язку Discord ID ${request.discordId} до профілю ${request.playerId}? Спочатку переконайтеся, що це власник профілю.`
      : `Відхилити заявку на профіль ${request.playerId}?`;
    if (!window.confirm(question)) return;

    setBusy(true);
    setMessage("");
    setError("");
    try {
      await post({ action, requestId: request.id, reason: action === "reject" ? reason : null });
      setMessage(action === "approve" ? "Заявку схвалено." : "Заявку відхилено.");
      try {
        const data = await post({ action: "list" });
        if (!Array.isArray(data.requests)) throw new Error("Неочікувана відповідь сервера");
        setRequests(data.requests);
      } catch {
        setRequests(null);
        setError("Рішення збережено, але список не оновився. Натисніть «Оновити заявки».");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не вдалося розглянути заявку");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <a href="/admin" className="text-sm font-semibold text-blue-300 hover:text-blue-200">← Адмінпанель</a>
        <h1 className="mt-4 text-2xl font-black sm:text-3xl">Акаунти гравців</h1>
        <p className="mt-2 text-sm text-white/65">Заявки на прив'язку Discord до наявних профілів Iron League.</p>
      </div>

      <section className="rounded-2xl border border-blue-400/20 bg-[#07101d] p-4 sm:p-6">
        <h2 className="font-bold">Доступ адміністратора</h2>
        <p className="mt-1 text-sm text-white/60">Пароль використовується лише для захищеного запиту. Він не зберігається в браузерному сховищі.</p>
        <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={loadRequests}>
          <label className="flex-1 text-sm font-semibold">
            Пароль адміністратора
            <input
              type="password"
              name="player-accounts-admin-password"
              autoComplete="off"
              value={password}
              onChange={(event) => { setPassword(event.target.value); setRequests(null); setMessage(""); setError(""); }}
              className="mt-2 w-full rounded-xl border border-white/20 bg-[#030711] px-4 py-3 text-white outline-none focus:border-blue-400"
              placeholder="Введіть пароль"
              required
              maxLength={1024}
            />
          </label>
          <button type="submit" disabled={busy || !password.trim()} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? "Обробка…" : "Оновити заявки"}
          </button>
        </form>
      </section>

      {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-950/30 p-4 text-sm text-red-200">{error}</p>}
      {message && <p role="status" className="rounded-xl border border-emerald-400/25 bg-emerald-950/20 p-4 text-sm text-emerald-200">{message}</p>}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-black">Очікують підтвердження</h2>
          {requests && <span className="text-sm text-white/55">Показано: {requests.length} (до 30 найстаріших)</span>}
        </div>

        {requests === null && <p className="rounded-xl border border-white/10 p-5 text-sm text-white/65">Введіть пароль і завантажте заявки. Дані не завантажуються автоматично.</p>}
        {requests?.length === 0 && <p className="rounded-xl border border-white/10 p-5 text-sm text-white/65">Заявок на розгляді немає.</p>}

        {requests?.map((request) => {
          const reason = reasons[request.id] ?? "";
          const verifiedDiscordId = /^\d{15,22}$/.test(request.discordId ?? "");
          return (
            <article key={request.id} className="rounded-2xl border border-white/10 bg-[#07101d] p-4 sm:p-6">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Профіль Iron League</p>
                  <p className="mt-1 break-all text-lg font-black text-blue-200">{request.playerId}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Discord-акаунт</p>
                  <p className="mt-1 break-all font-semibold">{request.discordName || "Ім'я не отримано"}</p>
                  <p className="mt-1 break-all font-mono text-xs text-white/65">ID: {request.discordId || "Недоступний"}</p>
                </div>
                <div className="text-white/55">Подано: {friendlyDate(request.createdAt)}</div>
                <div className="break-all text-xs text-white/45">Заявка: {request.id}</div>
              </div>
              <p className="mt-4 rounded-lg border border-amber-400/20 bg-amber-500/5 p-3 text-xs text-amber-100/85">
                Ім'я Discord не підтверджує право на профіль. Перед схваленням звірте особу з організатором або власником профілю.
              </p>
              {!verifiedDiscordId && <p className="mt-2 text-sm text-amber-200">Числовий Discord ID відсутній або некоректний: схвалення недоступне.</p>}
              <label className="mt-4 block text-sm font-semibold">
                Причина відхилення (обов'язкова при відхиленні)
                <textarea
                  value={reason}
                  onChange={(event) => setReasons((current) => ({ ...current, [request.id]: event.target.value }))}
                  rows={2}
                  maxLength={500}
                  className="mt-2 w-full rounded-xl border border-white/20 bg-[#030711] p-3 text-sm text-white outline-none focus:border-blue-400"
                  placeholder="Пояснення для гравця (від 5 до 500 символів)"
                />
              </label>
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" disabled={busy || !verifiedDiscordId} onClick={() => void decide(request, "approve")} className="rounded-xl border border-emerald-400/40 bg-emerald-600/20 px-5 py-3 text-sm font-bold text-emerald-100 hover:bg-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-40">
                  Підтвердити прив'язку
                </button>
                <button type="button" disabled={busy || reason.trim().length < 5} onClick={() => void decide(request, "reject")} className="rounded-xl border border-red-400/35 bg-red-600/15 px-5 py-3 text-sm font-bold text-red-100 hover:bg-red-600/25 disabled:cursor-not-allowed disabled:opacity-40">
                  Відхилити заявку
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <section className="rounded-2xl border border-white/10 p-4 text-sm text-white/65 sm:p-6">
        <h2 className="text-base font-bold text-white">Нові гравці — наступний етап</h2>
        <p className="mt-2">Створення профілю для користувача, якого ще немає в реєстрі гравців, потребує окремої заявки та схвалення. Тут поки немає кнопки створення: цей патч не змінює реєстр профілів і не створює гравців автоматично.</p>
      </section>
    </div>
  );
}
