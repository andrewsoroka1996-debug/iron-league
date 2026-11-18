"use client";

import { useEffect, useMemo, useState } from "react";
import type { PlayerAccountMatch, PlayerMatchGroup } from "../../lib/player-account-match-groups";
import { RESULT_SCREENSHOT_MAX_BYTES, RESULT_REASON_MAX,
  validateResultSubmissionItems, validateScreenshotAbsenceReason } from "../../lib/player-result-submission-policy";

type Props = { playerId: string; groups: PlayerMatchGroup[]; playerNames: Record<string, string> };
type Draft = { home: string; away: string; file: File | null; reason: string };
type Submitted = { match_id: string; status: string; revision: number; home_goals: number;
  away_goals: number; has_screenshot: boolean; no_screenshot_reason: string | null;
  last_rejection_reason?: string | null; last_rejection_revision?: number | null };
const freshDraft = (): Draft => ({ home: "", away: "", file: null, reason: "" });
const canSend = (m: PlayerAccountMatch) => m.season === 4 && m.participant_type === "player" &&
  (m.status === "scheduled" || m.status === "closed_unplayed");

function name(id: string, names: Record<string,string>) { return names[id] || id; }
function gameLabel(m: PlayerAccountMatch) {
  const parts = [];
  if (m.stage) parts.push(m.stage);
  if (m.round !== null) parts.push(`Тур/гра ${m.round}`);
  if (m.leg !== null) parts.push(`Матч ${m.leg}`);
  return parts.join(" · ") || "Матч";
}

export default function PlayerResultSubmissionForm({ playerId, groups, playerNames }: Props) {
  const eligibleGroups = useMemo(() => groups.map((g) => ({...g, matches: g.matches.filter(canSend)}))
    .filter((g) => g.matches.length > 0), [groups]);
  const [groupKey, setGroupKey] = useState("");
  const group = eligibleGroups.find((g) => g.key === groupKey) ?? eligibleGroups[0];
  const [selected, setSelected] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string,Draft>>({});
  const [existing, setExisting] = useState<Submitted[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const aborter = new AbortController();
    async function loadOwn() {
      try {
        const response = await fetch(`/api/player-account/result-submissions?playerId=${encodeURIComponent(playerId)}`,
          { cache: "no-store", credentials: "same-origin", signal: aborter.signal });
        if (!response.ok) return;
        const payload = await response.json() as {requests?:Submitted[]};
        if (!aborter.signal.aborted && Array.isArray(payload.requests)) setExisting(payload.requests);
      } catch { /* Transient history-load failure should not block draft editing. */ }
    }
    void loadOwn();
    return () => aborter.abort();
  }, [playerId]);

  function getDraft(id: string): Draft { return drafts[id] ?? freshDraft(); }
  function changeDraft(id: string, change: Partial<Draft>) {
    setDrafts((old) => ({...old, [id]: {...(old[id] ?? freshDraft()), ...change}}));
    setFeedback(""); setError("");
  }
  function toggle(id: string) {
    setError("");
    setSelected((old) => old.includes(id) ? old.filter((v) => v !== id) :
      old.length < 2 ? [...old,id] : old);
  }
  function onGroupChange(value: string) {
    setGroupKey(value); setSelected([]); setError(""); setFeedback("");
  }
  async function send() {
    setError(""); setFeedback("");
    if (selected.length === 0 || selected.length > 2) {setError("Оберіть один або два матчі."); return;}
    const activeMatches = group?.matches.filter((m) => selected.includes(m.id)) ?? [];
    if (activeMatches.length !== selected.length) {setError("Один із матчів більше не доступний."); return;}
    const payload = activeMatches.map((m) => ({
      match_id: m.id, home_goals: Number(getDraft(m.id).home),
      away_goals: Number(getDraft(m.id).away),
      no_screenshot_reason: getDraft(m.id).file ? null : getDraft(m.id).reason,
    }));
    // Empty inputs must not become 0: Number('') == 0.
    for (const m of activeMatches) {
      const d = getDraft(m.id);
      if (!/^\d+$/.test(d.home.trim()) || !/^\d+$/.test(d.away.trim())) {
        setError("Для кожного вибраного матчу заповніть обидва поля рахунку."); return;
      }
      if (d.file && d.file.size > RESULT_SCREENSHOT_MAX_BYTES) {
        setError("Максимальний розмір скриншота — 8 МБ."); return;
      }
      if (!d.file) {
        const reasonError = validateScreenshotAbsenceReason(d.reason);
        if (reasonError) { setError(reasonError); return; }
      }
    }
    const checked = validateResultSubmissionItems(payload);
    if (!checked.ok) {setError(checked.error); return;}
    const body = new FormData();
    body.set("items", JSON.stringify(checked.items));
    for (const m of activeMatches) {
      const file = getDraft(m.id).file;
      if (file) body.set(`evidence_${m.id}`, file);
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/player-account/result-submissions?playerId=${encodeURIComponent(playerId)}`,
        {method:"POST",body,credentials:"same-origin",cache:"no-store"});
      const data = await response.json() as {error?:string};
      if (!response.ok) {setError(data.error || "Не вдалося надіслати заявку.");return;}
      setFeedback(selected.length === 2
        ? "Обидва результати надіслано адміністратору окремими заявками."
        : "Результат надіслано адміністратору на перевірку.");
      setSelected([]);
      const refresh = await fetch(`/api/player-account/result-submissions?playerId=${encodeURIComponent(playerId)}`,
        {cache:"no-store",credentials:"same-origin"});
      if (refresh.ok) {
        const latest = await refresh.json() as {requests?:Submitted[]};
        if (Array.isArray(latest.requests)) setExisting(latest.requests);
      }
    } catch {setError("Не вдалося зв’язатися із сервером.");}
    finally {setLoading(false);}
  }

  return <section aria-label="Подати результат" className="space-y-4">
    <p className="text-sm text-white/65">Оберіть суперника та один або два матчі. Рахунки вказуйте у порядку команд, що показаний нижче. Результат не потрапить до таблиць до рішення адміністратора.</p>
    {eligibleGroups.length === 0 ? <p className="rounded-xl border border-white/10 p-4 text-sm text-white/60">Немає матчів сезону 4, доступних для заявки.</p> : <>
      <label className="block space-y-1 text-xs font-bold text-blue-200">
        <span>Суперник і турнір</span>
        <select className="w-full rounded-xl border border-blue-400/25 bg-[#081728] px-3 py-3 text-sm text-white"
          value={group?.key ?? ""} onChange={(e)=>onGroupChange(e.target.value)}>
          {eligibleGroups.map((g) => <option key={g.key} value={g.key}>
            {name(g.opponentId,playerNames)} · {g.competition === "division" ? `${g.division} дивізіон` : g.competition} · {g.matches.length} матч(і)
          </option>)}
        </select>
      </label>
      <p className="text-xs text-white/55">Виберіть до двох ігор. Кожна має свій рахунок і свій доказ.</p>
      {group?.matches.map((m) => {
        const d = getDraft(m.id);
        const checked = selected.includes(m.id);
        const prev = existing.find((req) => req.match_id === m.id);
        return <div key={m.id} className={`rounded-xl border p-3 sm:p-4 ${checked ? "border-blue-300/50 bg-blue-500/10" : "border-white/10 bg-white/5"}`}>
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={checked} disabled={!checked && selected.length === 2}
              onChange={()=>toggle(m.id)} className="mt-1 h-4 w-4 accent-blue-500" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-medium text-blue-300">{gameLabel(m)}</span>
              <span className="block break-words text-sm font-bold text-white">{name(m.home_id,playerNames)} — {name(m.away_id,playerNames)}</span>
              <span className="block text-xs text-white/50">{m.status === "closed_unplayed" ? "Закрито без гри — остаточне рішення залежить від перевірки адміністратора" : "Матч очікує результату"}</span>
              {prev && <span className="mt-1 block text-xs text-blue-200">Попередня заявка: {prev.status === "pending" ? "Очікує підтвердження" : prev.status === "rejected" ? "Відхилена — можна подати знову" : "Затверджена"} · версія {prev.revision}</span>}
              {prev?.last_rejection_reason && (
                <span role="note" className="mt-2 block rounded-lg border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                  <strong className="block">Причина відхилення{prev.last_rejection_revision ? ` (версія ${prev.last_rejection_revision})` : ""}:</strong>
                  <span className="mt-1 block whitespace-pre-wrap break-words">{prev.last_rejection_reason}</span>
                </span>
              )}
            </span>
          </label>
          {checked && <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
            <div className="grid grid-cols-2 gap-3">
              {(["home","away"] as const).map((side)=><label key={side} className="space-y-1 text-xs text-white/70">
                <span className="block break-words">{side === "home" ? name(m.home_id,playerNames) : name(m.away_id,playerNames)}</span>
                <input type="number" min="0" max="99" inputMode="numeric" value={d[side]}
                  onChange={(e)=>changeDraft(m.id,side === "home" ? {home:e.target.value} : {away:e.target.value})}
                  className="w-full rounded-lg border border-white/20 bg-[#081728] px-3 py-2 text-base text-white" />
              </label>)}
            </div>
            <label className="block space-y-1 text-xs text-white/70">
              <span className="block">Скриншот (JPG, PNG, WebP; до 8 МБ)</span>
              <input type="file" accept="image/jpeg,image/png,image/webp"
                onChange={(e)=>changeDraft(m.id,{file:e.target.files?.[0] ?? null})}
                className="block w-full text-xs text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-500/25 file:px-3 file:py-2 file:font-semibold file:text-blue-200" />
            </label>
            {!d.file && <label className="block space-y-1 text-xs text-white/70">
              <span className="block">Не вдалося зробити скриншот? Поясніть причину звичайними словами (мінімум три різні слова).</span>
              <textarea rows={3} value={d.reason} maxLength={RESULT_REASON_MAX}
                onChange={(e)=>changeDraft(m.id,{reason:e.target.value})}
                placeholder="Опишіть причину відсутності скриншота"
                className="w-full rounded-lg border border-white/20 bg-[#081728] px-3 py-2 text-sm text-white" />
            </label>}
          </div>}
        </div>;
      })}
      {error && <p role="alert" className="rounded-lg border border-red-400/40 bg-red-950/30 p-3 text-sm text-red-200">{error}</p>}
      {feedback && <p role="status" className="rounded-lg border border-blue-400/40 bg-blue-950/30 p-3 text-sm text-blue-100">{feedback}</p>}
      <button type="button" disabled={loading || selected.length===0} onClick={()=>void send()}
        className="min-h-11 w-full rounded-xl border border-blue-300/40 bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
        {loading ? "Надсилання…" : selected.length===2 ? "Надіслати два результати" : "Надіслати результат"}
      </button>
      <p className="text-xs text-white/45">Надіслані заявки не змінюють офіційні рахунки. Редагування заявки до рішення адміністратора створює нову версію.</p>
    </>}
  </section>;
}
