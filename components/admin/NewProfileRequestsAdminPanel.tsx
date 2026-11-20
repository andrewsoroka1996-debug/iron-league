"use client";

import { useEffect, useState } from "react";

type RequestRow = {
  id: string;
  nickname: string;
  note: string | null;
  createdAt: string;
  discordId: string | null;
  discordName: string | null;
};
type AdminResponse = { requests?: RequestRow[]; error?: string };
const endpoint = "/api/admin/player-profile-requests";

export default function NewProfileRequestsAdminPanel({ password }: { password: string }) {
  const [requests, setRequests] = useState<RequestRow[] | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Invalidate previously loaded admin data if the password changes.
  useEffect(() => { setRequests(null); setError(""); setMessage(""); }, [password]);

  async function post(body: Record<string, unknown>): Promise<AdminResponse> {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({ password, ...body }),
    });
    const data = await response.json().catch(() => ({})) as AdminResponse;
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  }

  async function load() {
    if (busy || !password.trim()) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const data = await post({ action: "list" });
      if (!Array.isArray(data.requests)) throw new Error("Неочікувана відповідь сервера");
      setRequests(data.requests);
      setMessage("Заявки новачків завантажено.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Заявки не завантажено");
      setRequests(null);
    } finally { setBusy(false); }
  }

  async function reject(request: RequestRow) {
    if (busy) return;
    const reason = (reasons[request.id] || "").trim();
    if (reason.length < 5 || reason.length > 500) {
      setError("Вкажіть причину від 5 до 500 символів.");
      return;
    }
    if (!window.confirm(`Відхилити заявку на створення профілю ${request.nickname}?`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await post({ action: "reject", requestId: request.id, reason });
      setMessage("Заявку новачка відхилено.");
      const data = await post({ action: "list" });
      setRequests(Array.isArray(data.requests) ? data.requests : null);
    } catch (cause) {
      setRequests(null);
      setError(cause instanceof Error ? cause.message : "Заявку не розглянуто. Оновіть список.");
    } finally { setBusy(false); }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Нові гравці — заявки на створення профілю</h2>
          <p className="mt-1 text-xs text-white/60">Окремий список. Немає автоматичного створення профілю або прив'язки.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={busy || !password.trim()}
          className="rounded-xl border border-blue-400/30 bg-blue-600/20 px-4 py-3 text-sm font-bold text-blue-200 disabled:opacity-40">
          {busy ? "Обробка…" : "Завантажити заявки новачків"}
        </button>
      </div>
      {error && <p role="alert" className="rounded-xl border border-red-400/30 p-3 text-sm text-red-200">{error}</p>}
      {message && <p role="status" className="text-sm text-emerald-200">{message}</p>}
      {requests === null && <p className="text-sm text-white/55">Введіть пароль угорі та завантажте заявки.</p>}
      {requests?.length === 0 && <p className="text-sm text-white/55">Заявок новачків на розгляді немає.</p>}
      {requests?.map((request) => (
        <article key={request.id} className="space-y-3 rounded-xl border border-white/10 bg-[#07101d] p-4">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div><p className="text-xs text-white/50">Бажаний нікнейм</p><p className="break-words text-lg font-black text-blue-200">{request.nickname}</p></div>
            <div><p className="text-xs text-white/50">Discord (перевірений сервером)</p><p className="break-words font-semibold">{request.discordName || "Ім'я недоступне"}</p><p className="break-all font-mono text-xs text-white/60">ID: {request.discordId || "Недоступний"}</p></div>
            <p className="text-xs text-white/55">Подано: {new Date(request.createdAt).toLocaleString("uk-UA")}</p>
            <p className="break-all text-xs text-white/45">Заявка: {request.id}</p>
          </div>
          {request.note && <p className="rounded-lg border border-white/10 p-3 text-sm text-white/75">Примітка: {request.note}</p>}
          <p className="text-xs text-amber-200">Перевірте, чи профіль уже існує під іншим ніком. Створення нового профілю та його прив'язка тут навмисно недоступні.</p>
          <label className="block text-sm font-semibold">
            Причина відхилення
            <textarea value={reasons[request.id] || ""} onChange={(event) => setReasons((current) => ({ ...current, [request.id]: event.target.value }))}
              maxLength={500} rows={2} className="mt-2 w-full rounded-xl border border-white/20 bg-[#030711] p-3 text-white" />
          </label>
          <button type="button" disabled={busy || (reasons[request.id] || "").trim().length < 5} onClick={() => void reject(request)}
            className="rounded-xl border border-red-400/30 bg-red-600/15 px-4 py-3 text-sm font-bold text-red-100 disabled:opacity-40">Відхилити</button>
        </article>
      ))}
    </section>
  );
}
