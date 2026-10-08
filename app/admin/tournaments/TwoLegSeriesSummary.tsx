"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { players } from "../../../data/players";

type SeriesMatch = {
  id: string;

  home_id: string;
  away_id: string;

  home_goals: number | null;
  away_goals: number | null;

  status: string;

  leg: number | null;
};

type SeriesSide = {
  id: string;

  goals: number;

  leg1Goals: number | null;
  leg2Goals: number | null;
};

type SeriesSummary = {
  matchesPlayed: number;

  complete: boolean;

  home: SeriesSide;
  away: SeriesSide;

  aggregateHomeGoals: number;
  aggregateAwayGoals: number;

  winner:
    | "home"
    | "away"
    | null;

  needsDecider: boolean;

  status:
    | "not-started"
    | "in-progress"
    | "home-winner"
    | "away-winner"
    | "aggregate-draw";
};

type SeriesResponse = {
  success: true;

  series: {
    id: string;

    season: number;

    competition: string;

    stage: string | null;

    home_id: string;
    away_id: string;
  };

  matches: SeriesMatch[];

  summary: SeriesSummary;
};

type Props = {
  season: number;

  seriesId: string;

  refreshKey?: number;
};

function getPlayerName(
  playerId: string
) {
  return (
    players.find(
      (player) =>
        player.id === playerId
    )?.nickname ?? playerId
  );
}

export default function TwoLegSeriesSummary({
  season,
  seriesId,
  refreshKey = 0,
}: Props) {
  const [
    data,
    setData,
  ] =
    useState<SeriesResponse | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  /*
    ========================================
    ЗАВАНТАЖЕННЯ СЕРІЇ
    ========================================
  */

  const loadSeries =
    useCallback(async () => {
      if (!seriesId) {
        setData(null);

        return;
      }

      setLoading(true);
      setError("");

      try {
        const params =
          new URLSearchParams();

        params.set(
          "season",
          String(season)
        );

        params.set(
          "series_id",
          seriesId
        );

        const response =
          await fetch(
            `/api/admin/two-leg-series?${params.toString()}`,
            {
              cache: "no-store",
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          setError(
            result.error ??
              "Не вдалося завантажити протистояння"
          );

          setData(null);

          return;
        }

        setData(
          result as SeriesResponse
        );
      } catch {
        setError(
          "Помилка з'єднання із сервером"
        );

        setData(null);
      } finally {
        setLoading(false);
      }
    }, [
      season,
      seriesId,
    ]);

  useEffect(() => {
    void loadSeries();
  }, [
    loadSeries,
    refreshKey,
  ]);

  /*
    ========================================
    LOADING
    ========================================
  */

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-[#07101d] p-7 text-white/40">
        Завантаження сумарного
        рахунку...
      </div>
    );
  }

  /*
    ========================================
    ERROR
    ========================================
  */

  if (error) {
    return (
      <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-7 text-red-200">
        {error}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const {
    series,
    summary,
  } = data;

  const homeName =
    getPlayerName(
      series.home_id
    );

  const awayName =
    getPlayerName(
      series.away_id
    );

  /*
    ========================================
    СТАТУС
    ========================================
  */

  let statusText =
    "Протистояння ще не завершене";

  if (
    summary.status ===
    "not-started"
  ) {
    statusText =
      "Матчі ще не зіграні";
  }

  if (
    summary.status ===
    "in-progress"
  ) {
    statusText =
      "Зіграно один із двох матчів";
  }

  if (
    summary.status ===
    "home-winner"
  ) {
    statusText =
      `Переможець: ${homeName}`;
  }

  if (
    summary.status ===
    "away-winner"
  ) {
    statusText =
      `Переможець: ${awayName}`;
  }

  if (
    summary.status ===
    "aggregate-draw"
  ) {
    statusText =
      "Рівність за сумою двох матчів";
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-[#07101d] p-7">
      {/* HEADER */}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Двоматчеве
            протистояння
          </div>

          <h2 className="mt-2 text-3xl font-black">
            {homeName}
            {" — "}
            {awayName}
          </h2>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold">
          {summary.matchesPlayed}
          /2 матчів
        </div>
      </div>

      {/* AGGREGATE */}

      <div className="mt-8 rounded-2xl border border-blue-400/20 bg-blue-500/10 p-7">
        <div className="text-center text-xs font-bold uppercase tracking-[0.25em] text-blue-300">
          Загальний рахунок
        </div>

        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="text-right">
            <div className="font-bold">
              {homeName}
            </div>

            <div className="mt-2 text-5xl font-black">
              {
                summary.aggregateHomeGoals
              }
            </div>
          </div>

          <div className="text-3xl font-black text-white/25">
            :
          </div>

          <div>
            <div className="font-bold">
              {awayName}
            </div>

            <div className="mt-2 text-5xl font-black">
              {
                summary.aggregateAwayGoals
              }
            </div>
          </div>
        </div>
      </div>

      {/* MATCH DETAILS */}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/35">
            Перший матч
          </div>

          <div className="mt-3 font-black">
            {homeName}
            {" — "}
            {awayName}
          </div>

          <div className="mt-3 text-2xl font-black">
            {summary.home
              .leg1Goals === null ||
            summary.away
              .leg1Goals === null
              ? "VS"
              : `${summary.home.leg1Goals} : ${summary.away.leg1Goals}`}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/35">
            Матч-відповідь
          </div>

          <div className="mt-3 font-black">
            {awayName}
            {" — "}
            {homeName}
          </div>

          <div className="mt-3 text-2xl font-black">
            {summary.home
              .leg2Goals === null ||
            summary.away
              .leg2Goals === null
              ? "VS"
              : `${summary.away.leg2Goals} : ${summary.home.leg2Goals}`}
          </div>
        </div>
      </div>

      {/* STATUS */}

      <div
        className={`mt-6 rounded-2xl border p-5 text-center font-black ${
          summary.winner
            ? "border-green-400/20 bg-green-500/10 text-green-200"
            : summary.needsDecider
              ? "border-yellow-400/20 bg-yellow-500/10 text-yellow-200"
              : "border-blue-400/20 bg-blue-500/10 text-blue-200"
        }`}
      >
        {statusText}
      </div>

      {/* DRAW */}

      {summary.needsDecider && (
        <div className="mt-4 rounded-xl border border-yellow-400/20 bg-yellow-500/10 p-4 text-center text-sm text-yellow-200">
          Сумарний рахунок рівний.
          Правило визначення
          переможця при такій
          ситуації ще потрібно
          зафіксувати.
        </div>
      )}
    </div>
  );
}