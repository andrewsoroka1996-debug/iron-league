"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { players } from "../../data/players";

type Match = {
  id: string;
  season: number;
  competition: string;
  division: number | null;
  stage: string | null;
  group_name: string | null;
  round: number | null;
  leg: number | null;
  participant_type: string;
  home_id: string;
  away_id: string;
  home_goals: number | null;
  away_goals: number | null;
  status: string;
};
type Assignment = {
  id: number;
  season: number;
  position: number;
  match_id: string;
  match_id_2: string | null;
  display_date: string | null;
  display_time: string | null;
  display_date_2: string | null;
  display_time_2: string | null;
};
type CoopTeam = { id: string; name: string };
type Draft = {
  match_id: string;
  match_id_2: string;
  display_date: string;
  display_time: string;
  display_date_2: string;
  display_time_2: string;
};
type ApiResponse = {
  success?: boolean;
  error?: string;
  matches?: Match[];
  featured?: Assignment[];
  coop_teams?: CoopTeam[];
};
const POSITIONS = [1, 2, 3, 4, 5];
const EMPTY: Draft = {
  match_id: "", match_id_2: "",
  display_date: "", display_time: "",
  display_date_2: "", display_time_2: "",
};

// Keep home/away reversal legal: Divisions' return fixture is often a distant round.
function sameFixture(first: Match, second: Match) {
  return first.id !== second.id &&
    first.season === second.season &&
    first.competition === second.competition &&
    first.division === second.division &&
    first.stage === second.stage &&
    first.group_name === second.group_name &&
    first.participant_type === second.participant_type &&
    ((first.home_id === second.home_id && first.away_id === second.away_id) ||
      (first.home_id === second.away_id && first.away_id === second.home_id));
}

function displayScore(match: Match, reference: Match) {
  if (match.status !== "finished" || match.home_goals === null || match.away_goals === null) {
    return match.status === "closed_unplayed" ? "Не відбувся" : "Не зіграно";
  }
  return match.home_id === reference.home_id
    ? `${match.home_goals}:${match.away_goals}`
    : `${match.away_goals}:${match.home_goals}`;
}

function matchLabel(match: Match, index: number) {
  // Group-stage European games have no meaningful round index.
  return match.competition === "division" && match.round != null
    ? `Тур ${match.round}`
    : `Матч ${index}`;
}

function tournamentFilterKey(match: Match): string {
  return match.competition === "division" && match.division != null
    ? `division:${match.division}`
    : `competition:${match.competition}`;
}

function tournamentName(match: Match) {
  if (match.competition === "division" && match.division) return `${match.division} Дивізіон`;
  const labels: Record<string, string> = {
    "champions-league": "Ліга чемпіонів", "europa-league": "Ліга Європи",
    "conference-league": "Ліга конференцій", "european-super-cup": "Суперкубок Європи",
    "season-qualification": "Кваліфікація", "qualification": "Кваліфікація", "associations-cup": "Кубок асоціацій",
    "iron-coop-cup": "Iron Co-op Cup", "coop-cup": "Iron Co-op Cup",
  };
  const cup = match.competition.match(/^division-(\d)-cup$/);
  if (cup) return `Кубок ${cup[1]} Дивізіону`;
  return labels[match.competition] ?? match.competition;
}

export default function WeeklyMatchesAdmin({ season, password }: { season: number; password: string }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teams, setTeams] = useState<CoopTeam[]>([]);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [competition, setCompetition] = useState("");
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<number | "loading" | null>(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const getName = useCallback((id: string, type: string) => {
    if (type === "team") return teams.find(t => t.id === id)?.name ?? id;
    if (type !== "player") return id;
    return players.find(p => p.id === id)?.nickname ?? id;
  }, [teams]);

  const load = useCallback(async () => {
    if (!password.trim()) {
      setMessage("Спочатку введіть пароль адміністратора у полі вище.");
      setIsError(true);
      return;
    }
    setBusy("loading");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/weekly-featured-matches?season=${season}`, {
        headers: { "x-admin-password": password }, cache: "no-store",
      });
      const data = await response.json() as ApiResponse;
      if (!response.ok || !data.success) throw new Error(data.error ?? "Не вдалося завантажити добірку");
      const rows = data.featured ?? [];
      const nextDrafts: Record<number, Draft> = {};
      for (const slot of POSITIONS) {
        const saved = rows.find(r => r.position === slot);
        nextDrafts[slot] = saved ? {
          match_id: saved.match_id,
          match_id_2: saved.match_id_2 ?? "",
          display_date: saved.display_date ?? "",
          display_time: saved.display_time?.slice(0, 5) ?? "",
          display_date_2: saved.display_date_2 ?? "",
          display_time_2: saved.display_time_2?.slice(0, 5) ?? "",
        } : { ...EMPTY };
      }
      setAssignments(rows);
      setMatches(data.matches ?? []);
      setTeams(data.coop_teams ?? []);
      setDrafts(nextDrafts);
      setLoaded(true);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Помилка завантаження");
    } finally {
      setBusy(null);
    }
  }, [season, password]);

  useEffect(() => {
    setLoaded(false);
    setAssignments([]);
    setMatches([]);
    setDrafts({});
    setMessage("");
  }, [season, password]);

  // Divisions share the DB competition value "division". Include the division number
  // in the UI filter key, so 1/2/3/4 Divisions remain distinct options.
  const competitions = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const match of matches) {
      const key = tournamentFilterKey(match);
      byKey.set(key, tournamentName(match));
    }
    return [...byKey.entries()]
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "uk", { numeric: true }));
  }, [matches]);
  const options = useMemo(() => {
    const q = search.trim().toLowerCase();
    return matches.filter(m => {
      if (competition && tournamentFilterKey(m) !== competition) return false;
      if (!q) return true;
      return [getName(m.home_id, m.participant_type), getName(m.away_id, m.participant_type), tournamentName(m)]
        .some(s => s.toLowerCase().includes(q));
    });
  }, [matches, competition, search, getName]);

  const change = (position: number, patch: Partial<Draft>) => {
    setDrafts(prev => ({ ...prev, [position]: { ...(prev[position] ?? EMPTY), ...patch } }));
  };

  async function save(position: number) {
    const draft = drafts[position] ?? EMPTY;
    if (!draft.match_id) return;
    if ((draft.display_time && !draft.display_date) ||
        (draft.display_time_2 && !draft.display_date_2)) {
      setIsError(true);
      setMessage("Щоб вказати час, спочатку вкажіть дату відповідного матчу.");
      return;
    }
    const first = matches.find(m => m.id === draft.match_id);
    const second = matches.find(m => m.id === draft.match_id_2);
    if (draft.match_id_2 && (!first || !second || !sameFixture(first, second))) {
      setIsError(true);
      setMessage("Другий матч має бути між тими самими суперниками в тому самому турнірі та групі.");
      return;
    }
    if (!password.trim()) {
      setIsError(true); setMessage("Введіть пароль адміністратора."); return;
    }
    setBusy(position);
    setMessage("");
    try {
      const response = await fetch("/api/admin/weekly-featured-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, season, position, ...draft }),
      });
      const result = await response.json() as ApiResponse;
      if (!response.ok || !result.success) throw new Error(result.error ?? "Не вдалося зберегти матч");
      await load();
      setIsError(false);
      setMessage(`Матч на позиції №${position} збережено. Він залишиться на головній до ручного видалення.`);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Помилка збереження");
    } finally { setBusy(null); }
  }

  async function remove(position: number) {
    if (!window.confirm(`Прибрати матч №${position} з головної сторінки?`)) return;
    setBusy(position);
    setMessage("");
    try {
      const response = await fetch("/api/admin/weekly-featured-matches", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, season, position }),
      });
      const result = await response.json() as ApiResponse;
      if (!response.ok || !result.success) throw new Error(result.error ?? "Не вдалося прибрати матч");
      await load();
      setIsError(false);
      setMessage(`Позицію №${position} звільнено. Офіційний матч не змінено.`);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Помилка видалення");
    } finally { setBusy(null); }
  }

  const fieldClass = "mt-1 w-full min-w-0 rounded-xl border border-white/10 bg-[#030711] px-3 py-3 text-sm text-white [color-scheme:dark]";
  return (
    <div className="mt-8 space-y-5">
      <div className="rounded-3xl border border-blue-400/20 bg-[#07101d] p-4 sm:p-7">
        <div className="text-xs font-bold uppercase tracking-[0.24em] text-blue-400">Головна сторінка · Ручна публікація</div>
        <h2 className="mt-2 text-2xl font-black sm:text-3xl">5 матчів тижня</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">Публікуй до 5 протистоянь: кожне може містити два офіційні матчі між тими самими суперниками. Матчі можуть бути завершені. Дату й час кожного встановлюй пізніше. Добірка не зникає автоматично.</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void load()} disabled={busy !== null}
            className="rounded-xl bg-blue-500 px-5 py-3 text-sm font-bold text-white hover:bg-blue-400 disabled:opacity-40">
            {busy === "loading" ? "Завантаження..." : loaded ? "Оновити добірку" : "Завантажити матчі сезону"}
          </button>
          {loaded && <span className="text-sm text-blue-300">Опубліковано: {assignments.length} / 5</span>}
        </div>
      </div>
      {loaded && (
        <>
          <div className="grid gap-3 rounded-2xl border border-white/10 bg-[#07101d] p-4 sm:grid-cols-2 sm:p-5">
            <div><label className="text-xs font-bold text-white/60">Фільтр за турніром</label>
              <select className={fieldClass} value={competition} onChange={e => setCompetition(e.target.value)}>
                <option value="">Усі турніри</option>
                {competitions.map(({ key, label }) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div><label className="text-xs font-bold text-white/60">Знайти гравця або турнір</label>
              <input className={fieldClass} value={search} onChange={e => setSearch(e.target.value)} placeholder="Введи нік..." />
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {POSITIONS.map(position => {
              const draft = drafts[position] ?? EMPTY;
              const current = assignments.find(a => a.position === position);
              const match = matches.find(m => m.id === draft.match_id);
              const secondMatch = matches.find(m => m.id === draft.match_id_2);
              const secondOptions = match ? matches.filter(m => sameFixture(match, m)) : [];
              return <section key={position} className="min-w-0 rounded-2xl border border-white/10 bg-[#07101d] p-4 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-black">Протистояння №{position}</h3>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${current ? "bg-emerald-500/10 text-emerald-300" : "bg-white/5 text-white/40"}`}>{current ? "На головній" : "Вільно"}</span>
                </div>
                <div className="mt-4"><label className="text-xs font-bold text-white/60">Перший матч сезону</label>
                  <select className={fieldClass} value={draft.match_id} onChange={e => change(position, {
                    match_id: e.target.value, match_id_2: "",
                    display_date: "", display_time: "",
                    display_date_2: "", display_time_2: "",
                  })}>
                    <option value="">Оберіть матч</option>
                    {draft.match_id && !options.some(m => m.id === draft.match_id) && match &&
                      <option value={match.id}>{tournamentName(match)} · {getName(match.home_id, match.participant_type)} — {getName(match.away_id, match.participant_type)}</option>}
                    {options.map(m => <option key={m.id} value={m.id} >
                      {m.status === "finished" ? "✓ " : ""}{tournamentName(m)} · {getName(m.home_id, m.participant_type)} — {getName(m.away_id, m.participant_type)}
                    </option>)}
                  </select>
                </div>
                {match && <div className="mt-3 rounded-xl border border-blue-400/10 bg-blue-500/[0.05] px-3 py-3 text-sm text-white/80">
                  <div className="font-bold text-white">{getName(match.home_id, match.participant_type)} <span className="text-blue-300">VS</span> {getName(match.away_id, match.participant_type)}</div>
                  <div className="mt-1 text-xs text-blue-300">{tournamentName(match)}</div>
                  {[match, secondMatch].filter((m): m is Match => Boolean(m)).map((m, i) => (
                    <div key={m.id} className="mt-2 flex items-center justify-between gap-2 text-xs text-white/70">
                      <span>{matchLabel(m, i + 1)}</span>
                      <span className="font-bold text-white">
                        {displayScore(m, match)}
                      </span>
                    </div>
                  ))}
                </div>}
                {match && <div className="mt-4">
                  <label className="text-xs font-bold text-white/60">Другий матч між цими суперниками (необов'язково)</label>
                  <select className={fieldClass} value={draft.match_id_2}
                    onChange={e => change(position, {
                      match_id_2: e.target.value, display_date_2: "", display_time_2: "",
                    })}>
                    <option value="">Поки лише один матч</option>
                    {secondOptions.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.status === "finished" ? "✓ " : ""}{matchLabel(m, 2)} · {getName(m.home_id, m.participant_type)} — {getName(m.away_id, m.participant_type)}
                        {m.status === "finished" && m.home_goals !== null && m.away_goals !== null ? ` (${m.home_goals}:${m.away_goals})` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-white/40">Для дивізіонів це може бути матч іншого туру, наприклад 1 і 16. Для груп єврокубків покажемо «Матч 1» та «Матч 2».</p>
                </div>}
                <div className="mt-4 border-t border-white/10 pt-3">
                  <div className="text-xs font-bold text-blue-300">{match ? matchLabel(match, 1) : "Перший матч"} · Розклад (необов'язково)</div>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-bold text-white/60">Дата</label>
                    <input type="date" className={fieldClass} value={draft.display_date} onChange={e => change(position, { display_date: e.target.value, display_time: e.target.value ? draft.display_time : "" })}/></div>
                  <div><label className="text-xs font-bold text-white/60">Час за Києвом</label>
                    <input type="time" className={fieldClass} value={draft.display_time} disabled={!draft.display_date} onChange={e => change(position, { display_time: e.target.value })}/></div>
                  </div>
                </div>
                {secondMatch && <div className="mt-3 border-t border-white/10 pt-3">
                  <div className="text-xs font-bold text-blue-300">{matchLabel(secondMatch, 2)} · Розклад (необов'язково)</div>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-bold text-white/60">Дата</label>
                      <input type="date" className={fieldClass} value={draft.display_date_2}
                        onChange={e => change(position, { display_date_2: e.target.value, display_time_2: e.target.value ? draft.display_time_2 : "" })}/></div>
                    <div><label className="text-xs font-bold text-white/60">Час за Києвом</label>
                      <input type="time" className={fieldClass} value={draft.display_time_2}
                        disabled={!draft.display_date_2} onChange={e => change(position, { display_time_2: e.target.value })}/></div>
                  </div>
                </div>}
                <p className="mt-2 text-xs text-white/40">Обидва розклади — лише для анонсу, вони не змінюють офіційні матчі. Перестановка з зайнятою позицією міняє протистояння місцями.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void save(position)} disabled={busy !== null || !draft.match_id}
                    className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold hover:bg-blue-500 disabled:opacity-40">{busy === position ? "Збереження..." : current ? "Зберегти зміни" : "Опублікувати протистояння"}</button>
                  {current && <button type="button" onClick={() => void remove(position)} disabled={busy !== null} className="rounded-xl border border-red-400/20 px-4 py-3 text-sm font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-40">Прибрати</button>}
                </div>
              </section>;
            })}
          </div>
        </>
      )}
      {message && <div role={isError ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${isError ? "border-red-500/30 bg-red-500/10 text-red-200" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"}`}>{message}</div>}
    </div>
  );
}
