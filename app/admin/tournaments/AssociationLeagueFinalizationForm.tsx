"use client";

import { useEffect, useState } from "react";

type Preview = {
  success?: boolean;
  finalized?: boolean;
  ready?: boolean;
  blockers?: string[];
  error?: string;
  message?: string;
  previewHash?: string;
  finalizedAt?: string;
  recordedMatches?: number;
  unresolvedMatches?: number;
  champion?: {
    associationName: string;
    leaguePoints: number;
    members: Array<string | { playerId: string; playerName: string }>;
  } | null;
};

export default function AssociationLeagueFinalizationForm({
  password,
  season,
}: {
  password: string;
  season: number;
}) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [calendarConfirmed, setCalendarConfirmed] = useState(false);
  const [coefficientsConfirmed, setCoefficientsConfirmed] = useState(false);

  useEffect(() => {
    setPreview(null);
    setMessage("");
    setCalendarConfirmed(false);
    setCoefficientsConfirmed(false);
  }, [password, season]);

  async function send(action: "preview" | "finalize") {
    if (!password) {
      setMessage("Спочатку введіть пароль адміністратора.");
      return;
    }

    if (action === "finalize") {
      if (!preview?.ready || !preview.previewHash || !calendarConfirmed || !coefficientsConfirmed) return;
      if (!window.confirm("ОСТАТОЧНО зафіксувати переможця Ліги асоціацій? Повторне збереження недоступне.")) return;
    }

    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/association-league-finalization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          password,
          season,
          action,
          previewHash: action === "finalize" ? preview?.previewHash : undefined,
          confirmCalendarComplete: action === "finalize" ? calendarConfirmed : undefined,
          confirmCoefficientsFinal: action === "finalize" ? coefficientsConfirmed : undefined,
        }),
      });
      const data = (await response.json()) as Preview;
      setPreview(data);
      setMessage(data.error ?? data.message ?? (response.ok ? "Готово" : "Помилка запиту"));
      // Any changed preview must be explicitly acknowledged again.
      setCalendarConfirmed(false);
      setCoefficientsConfirmed(false);
    } catch {
      setMessage("Помилка з'єднання з сервером.");
    } finally {
      setBusy(false);
    }
  }

  if (season !== 3 && season !== 4) return null;

  const locked = Boolean(preview?.finalized);
  const ready = Boolean(preview?.ready && preview?.previewHash);

  return (
    <section className="mt-8 space-y-5 rounded-3xl border border-amber-400/20 bg-[#07101d] p-5 sm:p-7">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-amber-300">Офіційні підсумки</div>
        <h2 className="mt-2 text-2xl font-black text-white">Фіналізація Ліги асоціацій</h2>
        <p className="mt-2 text-sm leading-6 text-white/60">
          Завершення Кубка асоціацій лише встановлює множники. До фіналізації рейтинг залишається
          поточним, а трофей нікому не присуджується. Фіналізація зберігає незмінний знімок таблиці
          та шістьох членів асоціації-переможця.
        </p>
      </div>

      <button
        type="button"
        onClick={() => void send("preview")}
        disabled={busy || !password}
        className="rounded-xl border border-blue-400/30 bg-blue-500/15 px-4 py-3 text-sm font-bold text-blue-200 disabled:opacity-40"
      >
        {busy ? "Перевірка..." : "Перевірити готовність і переглянути переможця"}
      </button>

      {message && <p role="status" className="text-sm leading-6 text-amber-200">{message}</p>}

      {preview && (
        <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.035] p-4 text-sm text-white/75">
          {locked ? (
            <p className="font-bold text-emerald-300">Результат офіційно зафіксовано. Повторна фіналізація заблокована.</p>
          ) : (
            <p className={ready ? "font-bold text-blue-200" : "font-bold text-amber-200"}>
              {ready ? "Технічних перешкод немає — потрібне остаточне рішення організатора." : "Сезон ще не готовий до фіналізації."}
            </p>
          )}

          {preview.champion && (
            <div className="space-y-1">
              <p>Асоціація: <strong className="text-white">{preview.champion.associationName}</strong></p>
              <p>Очки: <strong className="text-white">{preview.champion.leaguePoints}</strong></p>
              <p>Учасники: {preview.champion.members.map((m) => typeof m === "string" ? m : m.playerName).join(", ")}</p>
            </div>
          )}

          {preview.finalizedAt && <p>Дата фіксації: {new Date(preview.finalizedAt).toLocaleString("uk-UA")}</p>}
          {typeof preview.recordedMatches === "number" && (
            <p>Зареєстровано матчів коефіцієнтних турнірів: {preview.recordedMatches}. Незавершено: {preview.unresolvedMatches}.</p>
          )}
          {(preview.blockers?.length ?? 0) > 0 && (
            <ul className="list-inside list-disc space-y-1 text-amber-200">
              {preview.blockers!.map((item) => <li key={item}>{item}</li>)}
            </ul>
          )}
        </div>
      )}

      {!locked && ready && (
        <div className="space-y-4 border-t border-white/10 pt-4 text-sm text-white/80">
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-1" checked={calendarConfirmed} onChange={(e) => setCalendarConfirmed(e.target.checked)} />
            Підтверджую, що внесено весь календар сезону, усі матчі, що впливають на коефіцієнти, адміністративно завершені, нових матчів не буде.
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-1" checked={coefficientsConfirmed} onChange={(e) => setCoefficientsConfirmed(e.target.checked)} />
            Підтверджую, що всі коефіцієнти, коригування та заміни гравців остаточні і перевірені.
          </label>
          <button
            type="button"
            onClick={() => void send("finalize")}
            disabled={busy || !calendarConfirmed || !coefficientsConfirmed}
            className="rounded-xl bg-amber-400 px-5 py-3 font-black text-black disabled:opacity-40"
          >
            Остаточно завершити Лігу асоціацій сезону {season}
          </button>
          <p className="text-xs text-amber-200/70">Увага: ця дія записує незмінний результат у Supabase. Не натискайте, поки сезон триває.</p>
        </div>
      )}
    </section>
  );
}
