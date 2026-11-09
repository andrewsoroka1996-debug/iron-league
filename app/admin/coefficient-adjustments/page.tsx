"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { players } from "../../../data/players";
import type {
  CoefficientAdjustment,
  CoefficientAdjustmentMode,
  CoefficientAdjustmentScope,
} from "../../../lib/coefficient-adjustments";

type CoefficientPreviewRow = {
  player_id: string;
  nickname: string;
  original_total: number;
  original_europe: number;
  adjusted_total: number;
  adjusted_europe: number;
};

type DataResponse = {
  success: boolean;
  error?: string;
  rows?: CoefficientPreviewRow[];
  decisions?: CoefficientAdjustment[];
  history?: CoefficientAdjustment[];
};

const inputClass = "mt-2 w-full rounded-xl border border-white/15 bg-[#040b17] px-3 py-3 text-sm text-white outline-none focus:border-blue-400";

export default function CoefficientAdjustmentsAdminPage() {
  const [password, setPassword] = useState("");
  const [data, setData] = useState<DataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [scope, setScope] = useState<CoefficientAdjustmentScope>("europe");
  const [mode, setMode] = useState<CoefficientAdjustmentMode>("zero");
  const [pointsText, setPointsText] = useState("10");
  const [reason, setReason] = useState("");
  const [confirmChecked, setConfirmChecked] = useState(false);

  const rows = data?.rows ?? [];
  const foundRows = useMemo(() =>
    rows.filter(row => `${row.nickname} ${row.player_id}`.toLowerCase().includes(search.toLowerCase())),
    [rows, search]
  );
  const selectedRow = rows.find(row => row.player_id === playerId);
  const current = data?.decisions?.find(decision => decision.player_id === playerId);
  const base = selectedRow ? (scope === "europe" ? selectedRow.original_europe : selectedRow.original_total) : 0;
  const points = Number(pointsText);
  const possible = mode === "clear" ? base : mode === "zero" ? 0 : Math.max(0, base - (Number.isFinite(points) ? points : 0));
  const simulatedTotal = selectedRow ? selectedRow.original_total + (possible - base) : 0;
  const canApply = Boolean(
    data?.success && selectedRow && reason.trim().length >= 5 && reason.trim().length <= 400 &&
    (mode !== "penalty" || (Number.isInteger(points) && points > 0 && points <= 100000)) &&
    confirmChecked && !loading
  );

  async function submit(action: "list" | "apply") {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/coefficient-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          password, season: 3, action,
          ...(action === "apply" ? {
            player_id: playerId, scope, mode,
            points: mode === "penalty" ? Number(pointsText) : 0,
            reason: reason.trim(),
          } : {}),
        }),
      });
      const payload = (await response.json()) as DataResponse;
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "Помилка запиту");
      setData(payload);
      if (action === "apply") {
        setMessage("Рішення збережено. Рейтинг сезону 3 перераховуватиметься з урахуванням коригування.");
        setReason("");
        setConfirmChecked(false);
      } else setMessage("Актуальні коефіцієнти та історію завантажено.");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Помилка запиту");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#030711] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin" className="text-sm font-bold text-blue-300 hover:underline">← Адмін-панель</Link>
          <Link href="/coefficients?season=3" className="text-sm font-bold text-blue-300 hover:underline">Переглянути таблицю коефіцієнтів ↗</Link>
        </div>
        <h1 className="text-2xl font-black sm:text-3xl">Коефіцієнти · ручне коригування</h1>
        <p className="mt-3 text-sm leading-6 text-white/60">
          Тільки сезон 3. Результати матчів, групові таблиці та архів сезонів 1–2 залишаються незмінними.
          Одне чинне рішення на гравця; кожна нова дія зберігається в журналі.
        </p>

        <section className="mt-6 rounded-2xl border border-white/10 bg-[#07101d] p-4 sm:p-6">
          <label className="block text-sm font-bold text-white/70" htmlFor="coefficient-admin-password">Пароль адміністратора</label>
          <input id="coefficient-admin-password" type="password" autoComplete="off" value={password}
            onChange={event => {setPassword(event.target.value); setData(null); setPlayerId("");}}
            className={inputClass} placeholder="Введи пароль" />
          <button type="button" disabled={!password || loading} onClick={() => submit("list")}
            className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black disabled:opacity-50 sm:w-auto">
            {loading ? "Перевірка…" : "Завантажити коефіцієнти та історію"}
          </button>
        </section>

        {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>}
        {message && <p role="status" className="mt-4 rounded-xl border border-blue-400/20 bg-blue-500/10 p-4 text-sm text-blue-100">{message}</p>}

        {data?.success && (
          <>
            <section className="mt-6 rounded-2xl border border-white/10 bg-[#07101d] p-4 sm:p-6">
              <h2 className="text-xl font-black">Рішення адміністратора</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-sm font-bold text-white/70" htmlFor="coefficient-player-search">Пошук гравця</label>
                  <input id="coefficient-player-search" value={search} onChange={event => setSearch(event.target.value)}
                    className={inputClass} placeholder="Нікнейм або ID" />
                  <select value={playerId} onChange={event => {setPlayerId(event.target.value);setConfirmChecked(false);}}
                    className={inputClass} aria-label="Гравець сезону 3">
                    <option value="">Оберіть гравця</option>
                    {foundRows.map(row => <option key={row.player_id} value={row.player_id}>{row.nickname} ({row.player_id})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-white/70" htmlFor="coefficient-scope">Що коригуємо</label>
                  <select id="coefficient-scope" value={scope} onChange={event => {setScope(event.target.value as CoefficientAdjustmentScope);setConfirmChecked(false);}} className={inputClass}>
                    <option value="europe">Лише єврокубки (ЛЧ + ЛЄ)</option>
                    <option value="all">Увесь коефіцієнт сезону 3</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-white/70" htmlFor="coefficient-mode">Дія</label>
                  <select id="coefficient-mode" value={mode} onChange={event => {setMode(event.target.value as CoefficientAdjustmentMode);setConfirmChecked(false);}} className={inputClass}>
                    <option value="zero">Обнулити</option>
                    <option value="penalty">Штраф (відняти бали)</option>
                    <option value="clear">Скасувати коригування</option>
                  </select>
                </div>
                {mode === "penalty" && (
                  <div>
                    <label className="text-sm font-bold text-white/70" htmlFor="coefficient-penalty">Кількість балів штрафу</label>
                    <input id="coefficient-penalty" type="number" min={1} max={100000} step={1} value={pointsText}
                      onChange={event => {setPointsText(event.target.value);setConfirmChecked(false);}} className={inputClass} />
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className="text-sm font-bold text-white/70" htmlFor="coefficient-reason">Причина рішення (5–400 символів)</label>
                  <textarea id="coefficient-reason" rows={3} maxLength={400} value={reason}
                    onChange={event => {setReason(event.target.value);setConfirmChecked(false);}} className={inputClass}
                    placeholder="Наприклад: рішення організатора за порушення регламенту" />
                </div>
              </div>

              {selectedRow && (
                <div className="mt-5 rounded-xl border border-blue-400/20 bg-blue-500/[0.06] p-4 text-sm">
                  <div className="font-black text-blue-200">Попередній перегляд: {selectedRow.nickname}</div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <p>Автоматично загалом: <strong>{selectedRow.original_total}</strong></p>
                    <p>Автоматично єврокубки: <strong>{selectedRow.original_europe}</strong></p>
                    <p>Зараз загалом: <strong>{selectedRow.adjusted_total}</strong></p>
                    <p>Зараз єврокубки: <strong>{selectedRow.adjusted_europe}</strong></p>
                    <p className="font-bold text-amber-200">Після нового рішення загалом: {simulatedTotal}</p>
                    {scope === "europe" && <p className="font-bold text-amber-200">Після рішення єврокубки: {possible}</p>}
                  </div>
                  {current && <p className="mt-3 text-xs text-white/50">Поточне рішення: {current.mode} / {current.scope}, {current.points} балів. {current.reason}</p>}
                  <p className="mt-3 text-xs text-white/45">Обнулення діє й після нових матчів. Фіксований штраф віднімається від поточного автоматичного результату, але не нижче нуля. Дія «Скасувати» повертає автоматичний розрахунок.</p>
                </div>
              )}

              <label className="mt-5 flex items-start gap-3 rounded-xl border border-white/10 p-3 text-sm text-white/70">
                <input type="checkbox" checked={confirmChecked} onChange={event => setConfirmChecked(event.target.checked)} className="mt-1" />
                <span>Я перевірив гравця, область, дію та причину. Розумію, що зміна відобразиться у публічній таблиці коефіцієнтів.</span>
              </label>
              <button type="button" disabled={!canApply} onClick={() => {
                if (window.confirm(`Підтвердити рішення для ${selectedRow?.nickname ?? "гравця"}?`)) void submit("apply");
              }} className="mt-4 w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-black text-black disabled:opacity-40 sm:w-auto">
                {loading ? "Збереження…" : "Застосувати коригування"}
              </button>
            </section>

            <section className="mt-6 rounded-2xl border border-white/10 bg-[#07101d] p-4 sm:p-6">
              <h2 className="text-xl font-black">Історія адміністративних рішень</h2>
              <p className="mt-1 text-xs text-white/45">Останні 100 записів. Історія не видаляється при скасуванні штрафу.</p>
              <div className="mt-4 space-y-2">
                {(data.history ?? []).length === 0 && <p className="text-sm text-white/45">Рішень поки немає.</p>}
                {(data.history ?? []).map(event => (
                  <div key={event.id} className="rounded-xl border border-white/10 p-3 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <strong>{players.find(p => p.id === event.player_id)?.nickname ?? event.player_id}</strong>
                      <span className="text-xs text-white/40">{new Date(event.created_at).toLocaleString("uk-UA")}</span>
                    </div>
                    <p className="mt-1 text-white/70">{event.mode === "clear" ? "Скасовано" : event.mode === "zero" ? "Обнулення" : `Штраф −${event.points}`} · {event.scope === "europe" ? "Єврокубки" : "Увесь коефіцієнт"}</p>
                    <p className="mt-1 text-xs text-white/45">{event.reason}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
