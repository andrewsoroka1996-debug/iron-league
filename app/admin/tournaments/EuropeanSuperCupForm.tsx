"use client";

import { useCallback, useEffect, useState } from "react";
import { players } from "../../../data/players";

type Preview = {
  success: boolean;
  ready?: boolean;
  championsLeagueWinner?: string | null;
  europaLeagueWinner?: string | null;
  existingMatchId?: string | null;
  reason?: string | null;
  error?: string;
};

type Props = {
  password: string;
  season: number;
  onCreated: () => void;
};

function playerName(id: string | null | undefined) {
  if (!id) return "Не визначено";
  return players.find((p) => p.id === id)?.nickname ?? id;
}

export default function EuropeanSuperCupForm({ password, season, onCreated }: Props) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);

  const refresh = useCallback(async (signal: AbortSignal) => {
    const response = await fetch(`/api/admin/european-super-cup?season=${season}`, {
      headers: { "x-admin-password": password },
      cache: "no-store",
      signal,
    });
    const data = (await response.json()) as Preview;
    if (!response.ok || !data.success) throw new Error(data.error ?? "Помилка завантаження фіналістів");
    return data;
  }, [password, season]);

  useEffect(() => {
    const controller = new AbortController();
    setPreview(null);
    setMessage("");
    if (!password) {
      setIsLoading(false);
      return () => controller.abort();
    }
    setIsLoading(true);
    void refresh(controller.signal)
      .then((data) => { if (!controller.signal.aborted) setPreview(data); })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Помилка зв'язку");
      })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [password, refresh, revision]);

  async function createFinal() {
    if (!password || !preview?.ready || !preview.championsLeagueWinner || !preview.europaLeagueWinner) return;
    setIsCreating(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/match", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          season,
          competition: "european-super-cup",
          stage: "final",
          division: null,
          group_name: null,
          round: null,
          leg: 1,
          participant_type: "player",
          home_id: preview.championsLeagueWinner,
          away_id: preview.europaLeagueWinner,
          series_id: null,
          series_home_id: null,
          series_away_id: null,
          is_tiebreak: false,
        }),
      });
      const result = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || result.success !== true) {
        throw new Error(result.error ?? "Не вдалося створити фінал");
      }
      setMessage("Фінал Суперкубка створено. Можна внести результат у списку матчів нижче.");
      setPreview(null);
      setRevision((value) => value + 1);
      onCreated();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Помилка зв'язку");
      setRevision((value) => value + 1);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="mt-8 space-y-5 rounded-3xl border border-white/10 bg-[#07101d] p-6 sm:p-7">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">Суперкубок Європи</div>
        <h2 className="mt-2 text-3xl font-black">Створити фінальний матч</h2>
        <p className="mt-3 text-sm text-white/55">Гравці визначаються автоматично за завершеними фіналами ЛЧ та ЛЄ цього сезону.</p>
      </div>
      {!password && <p className="text-sm text-yellow-200">Введіть пароль адміністратора.</p>}
      {isLoading && <p className="text-sm text-white/60">Перевіряємо фінали та можливі дублікати…</p>}
      {preview && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs text-blue-300">Переможець Ліги чемпіонів · Господар</div>
            <div className="mt-2 text-lg font-bold">{playerName(preview.championsLeagueWinner)}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs text-blue-300">Переможець Ліги Європи · Гість</div>
            <div className="mt-2 text-lg font-bold">{playerName(preview.europaLeagueWinner)}</div>
          </div>
        </div>
      )}
      {preview?.reason && <div className="rounded-xl border border-yellow-400/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">{preview.reason}</div>}
      <button
        type="button"
        onClick={() => void createFinal()}
        disabled={!password || isLoading || isCreating || !preview?.ready}
        className="w-full rounded-xl bg-blue-500 px-6 py-4 font-black transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isCreating ? "Створення…" : "Створити фінал Суперкубка"}
      </button>
      {message && <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm">{message}</div>}
    </div>
  );
}
