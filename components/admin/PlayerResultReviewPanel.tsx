"use client";

import { useState } from "react";

type Filter = "pending" | "reviewed";
type Match = {
  id: string; season: number; competition: string; division: number | null;
  stage: string | null; round: number | null; leg: number | null;
  home_id: string; away_id: string; status: string;
  home_goals: number | null; away_goals: number | null;
};
type RequestItem = {
  id: string; player_id: string; match_id: string;
  home_goals: number; away_goals: number; status: string; revision: number;
  created_at: string; updated_at: string;
  no_screenshot_reason: string | null;
  has_screenshot: boolean; evidence_url: string | null;
  match: Match | null;
};

export default function PlayerResultReviewPanel() {
  const [password, setPassword] = useState("");
  const [filter, setFilter] = useState<Filter>("pending");
  const [items, setItems] = useState<RequestItem[]>([]);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function post(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/player-result-submissions", {
      method: "POST", cache: "no-store", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, ...body }),
    });
    const data = await res.json() as {error?: string; requests?: RequestItem[]; success?: boolean};
    if (!res.ok) throw new Error(data.error || "Помилка запиту");
    return data;
  }

  async function load(selected: Filter = filter) {
    if (!password) { setError("Уведіть пароль адміністратора."); return; }
    setError(""); setMessage(""); setLoading(true);
    try {
      const data = await post({ action: "list", filter: selected });
      setItems(data.requests ?? []);
      setFilter(selected);
    } catch (e) { setError(e instanceof Error ? e.message : "Помилка зв'язку"); }
    finally { setLoading(false); }
  }

  async function decide(item: RequestItem, action: "approve" | "reject") {
    if (busyId) return;
    if (action === "reject" && (reason[item.id] ?? "").trim().length < 8) {
      setError("Для відхилення вкажіть причину (мінімум 8 символів)."); return;
    }
    const title = action === "approve" ? "Затвердити результат і записати офіційний рахунок?" : "Відхилити заявку?";
    if (!window.confirm(title)) return;
    setBusyId(item.id); setError(""); setMessage("");
    try {
      await post({action, request_id: item.id, expected_revision: item.revision, reason: (reason[item.id] ?? "").trim() || null});
      setMessage(action === "approve" ? "Заявку затверджено, офіційний рахунок записано." : "Заявку відхилено.");
      const response = await post({action:"list",filter});
      setItems(response.requests ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Помилка зв'язку"); }
    finally { setBusyId(null); }
  }

  return <section className="space-y-5 rounded-2xl border border-blue-400/20 bg-[#071626] p-4 sm:p-6">
    <div>
      <h1 className="text-xl font-black text-blue-100 sm:text-2xl">Заявки гравців на результати</h1>
      <p className="mt-2 text-sm text-white/60">Призначено для адміністратора. Рахунок потрапляє в турнір лише після затвердження. Закриті без гри матчі поки потребують окремого ручного розгляду.</p>
    </div>
    <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(e)=>{e.preventDefault();void load();}}>
      <label className="flex-1 space-y-1 text-xs text-white/70">
        <span className="block">Пароль адміністратора</span>
        <input type="password" autoComplete="off" value={password} onChange={(e)=>setPassword(e.target.value)}
          className="w-full rounded-lg border border-blue-300/20 bg-[#030b16] px-3 py-3 text-sm text-white" required />
      </label>
      <button type="submit" disabled={loading || !!busyId}
        className="self-end rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
        {loading ? "Завантаження…" : "Завантажити заявки"}
      </button>
    </form>
    <div className="flex gap-2">
      {(["pending", "reviewed"] as const).map((value)=><button key={value} type="button" onClick={()=>void load(value)}
        className={`rounded-lg border px-4 py-2 text-sm ${filter===value ? "border-blue-300/50 bg-blue-600/30" : "border-white/10 bg-white/5"}`}>
        {value === "pending" ? "Очікують рішення" : "Розглянуті"}
      </button>)}
    </div>
    {error && <p role="alert" className="rounded-lg border border-red-500/40 p-3 text-sm text-red-200">{error}</p>}
    {message && <p role="status" className="rounded-lg border border-blue-500/40 p-3 text-sm text-blue-200">{message}</p>}
    {items.length===0 && <p className="rounded-xl border border-white/10 p-4 text-sm text-white/50">Заявок у завантаженому списку немає.</p>}
    <div className="space-y-4">
      {items.map((item)=><article key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-bold text-blue-200">Гравець: {item.player_id} · версія {item.revision}</div>
          <span className="text-xs text-white/60">{item.status === "pending" ? "Очікує" : item.status === "approved" ? "Затверджено" : "Відхилено"}</span>
        </div>
        <p className="mt-1 break-all text-xs text-white/45">Match ID: {item.match_id}</p>
        {item.match ? <>
          <p className="mt-3 text-sm text-white/80">{item.match.home_id} — {item.match.away_id}</p>
          <p className="mt-1 text-xs text-white/55">Сезон {item.match.season} · {item.match.competition} · {item.match.stage ?? "основний етап"} · тур/пара {item.match.round ?? "—"} · матч {item.match.leg ?? "—"}</p>
          <p className="mt-1 text-xs text-white/55">Поточний статус: <b>{item.match.status}</b></p>
        </> : <p className="mt-3 text-sm text-red-200">Матч календаря не знайдено — затвердження заборонене.</p>}
        <p className="mt-3 text-xl font-black tabular-nums">Подано: {item.home_goals}:{item.away_goals}</p>
        {item.has_screenshot ? <p className="mt-2 text-sm">{item.evidence_url ? <a href={item.evidence_url} target="_blank" rel="noopener noreferrer" className="text-blue-300 underline">Переглянути скриншот (тимчасове посилання)</a> : <span className="text-red-200">Скриншот тимчасово недоступний</span>}</p> : <p className="mt-2 text-sm text-white/70">Причина без скриншота: {item.no_screenshot_reason || "Не вказано"}</p>}
        {item.status === "pending" && <div className="mt-4 space-y-3 border-t border-white/10 pt-3">
          <label className="block space-y-1 text-xs text-white/70"><span>Коментар (для відхилення обов'язковий)</span>
            <textarea rows={2} maxLength={500} value={reason[item.id] ?? ""} onChange={(e)=>setReason((old)=>({...old,[item.id]:e.target.value}))}
              className="w-full rounded-lg border border-white/20 bg-[#030b16] p-3 text-sm text-white" /></label>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!!busyId || item.match?.status !== "scheduled" || (item.has_screenshot && !item.evidence_url)}
              onClick={()=>void decide(item,"approve")}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Затвердити</button>
            <button type="button" disabled={!!busyId} onClick={()=>void decide(item,"reject")}
              className="rounded-lg border border-red-400/40 px-4 py-2 text-sm font-bold text-red-200 disabled:opacity-40">Відхилити</button>
          </div>
          {item.match?.status === "closed_unplayed" && <p className="text-xs text-yellow-200">Закритий без гри матч: автоматичне затвердження заблоковане до окремої перевірки залежностей.</p>}
        </div>}
      </article>)}
    </div>
    <p className="text-xs text-white/45">Список обмежений останніми 60 заявками. Пароль не записується у сховище браузера. Приватні скриншоти доступні тільки через короткочасне підписане посилання.</p>
  </section>;
}
