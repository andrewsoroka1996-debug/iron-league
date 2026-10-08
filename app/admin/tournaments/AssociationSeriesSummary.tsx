"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { players } from "../../../data/players";

import { getCompetitionAssociations } from "../../../data/competitions/get-competition-associations";

import type { SeasonNumber } from "../../../data/competitions/season-competitions";

type SeriesSide = {
  points: number;

  goalsFor: number;
  goalsAgainst: number;

  goalDifference: number;

  wins: number;
  draws: number;
  losses: number;
};

type SeriesMatch = {
  id: string;

  home_id: string;
  away_id: string;

  home_goals: number | null;
  away_goals: number | null;

  status: string;

  is_tiebreak: boolean;
};

type SeriesSummary = {
  regularMatchesPlayed: number;

  home: SeriesSide;
  away: SeriesSide;

  regularComplete: boolean;

  winner:
    | "home"
    | "away"
    | null;

  needsTiebreak: boolean;

  tiebreakMatch:
    | SeriesMatch
    | null;

  status:
    | "in-progress"
    | "home-winner"
    | "away-winner"
    | "needs-tiebreak"
    | "tiebreak-pending"
    | "tiebreak-draw";
};

type SeriesResponse = {
  success: true;

  series: {
    id: string;

    season: number;

    stage: string | null;

    home: {
      id: string;
      name: string;
    };

    away: {
      id: string;
      name: string;
    };
  };

  matches: SeriesMatch[];

  summary: SeriesSummary;
};

type Props = {
  season: number;

  seriesId: string;

  password: string;

  refreshKey?: number;

  onTiebreakCreated?: () => void;
};

function formatGoalDifference(
  value: number
) {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

export default function AssociationSeriesSummary({
  season,
  seriesId,
  password,
  refreshKey = 0,
  onTiebreakCreated,
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
    7-Й МАТЧ
    ========================================
  */

  const [
    tiebreakHomeId,
    setTiebreakHomeId,
  ] = useState("");

  const [
    tiebreakAwayId,
    setTiebreakAwayId,
  ] = useState("");

  const [
    creatingTiebreak,
    setCreatingTiebreak,
  ] = useState(false);

  const [
    tiebreakMessage,
    setTiebreakMessage,
  ] = useState("");

  /*
    ========================================
    СКЛАДИ АСОЦІАЦІЙ СЕЗОНУ
    ========================================
  */

  const associations =
    useMemo(() => {
      return getCompetitionAssociations({
        season:
          season as SeasonNumber,

        competition:
          "associations-cup",
      });
    }, [season]);

  /*
    ========================================
    НАЗВА ГРАВЦЯ
    ========================================
  */

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
            `/api/admin/association-series?${params.toString()}`,
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
    При зміні серії
    очищаємо вибір 7-го матчу.
  */

  useEffect(() => {
    setTiebreakHomeId("");
    setTiebreakAwayId("");
    setTiebreakMessage("");
  }, [seriesId]);

  /*
    ========================================
    СТВОРЕННЯ 7-ГО МАТЧУ
    ========================================
  */

  async function createTiebreak() {
    if (!password) {
      setTiebreakMessage(
        "Введіть пароль адміністратора"
      );

      return;
    }

    if (!data) {
      return;
    }

    if (
      !tiebreakHomeId ||
      !tiebreakAwayId
    ) {
      setTiebreakMessage(
        "Оберіть двох гравців"
      );

      return;
    }

    setCreatingTiebreak(true);
    setTiebreakMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/association-series",
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              password,

              season,

              series_id:
                seriesId,

              home_id:
                tiebreakHomeId,

              away_id:
                tiebreakAwayId,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setTiebreakMessage(
          result.error ??
            "Не вдалося створити 7-й матч"
        );

        return;
      }

      setTiebreakMessage(
        "✅ 7-й вирішальний матч створено"
      );

      setTiebreakHomeId("");
      setTiebreakAwayId("");

      await loadSeries();

      if (onTiebreakCreated) {
        onTiebreakCreated();
      }
    } catch {
      setTiebreakMessage(
        "Помилка з'єднання із сервером"
      );
    } finally {
      setCreatingTiebreak(false);
    }
  }

  /*
    ========================================
    LOADING
    ========================================
  */

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-[#07101d] p-7 text-white/40">
        Завантаження підсумку
        протистояння...
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

  /*
    ========================================
    СКЛАДИ САМЕ ЦИХ АСОЦІАЦІЙ
    ========================================
  */

  const homeAssociation =
    associations.find(
      (association) =>
        association.id ===
        series.home.id
    );

  const awayAssociation =
    associations.find(
      (association) =>
        association.id ===
        series.away.id
    );

  /*
    ========================================
    СТАТУС
    ========================================
  */

  let statusText =
    "Протистояння триває";

  if (
    summary.status ===
    "home-winner"
  ) {
    statusText =
      `Переможець: ${series.home.name}`;
  }

  if (
    summary.status ===
    "away-winner"
  ) {
    statusText =
      `Переможець: ${series.away.name}`;
  }

  if (
    summary.status ===
    "needs-tiebreak"
  ) {
    statusText =
      "Потрібен 7-й вирішальний матч";
  }

  if (
    summary.status ===
    "tiebreak-pending"
  ) {
    statusText =
      "7-й матч створений і очікує результату";
  }

  if (
    summary.status ===
    "tiebreak-draw"
  ) {
    statusText =
      "7-й матч завершився нічиєю";
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-[#07101d] p-7">
      {/* HEADER */}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Кубок асоціацій
          </div>

          <h2 className="mt-2 text-3xl font-black">
            {series.home.name}
            {" — "}
            {series.away.name}
          </h2>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold">
          {
            summary.regularMatchesPlayed
          }
          /6 матчів
        </div>
      </div>

      {/* STATISTICS */}

      <div className="mt-8 grid gap-5 md:grid-cols-[1fr_auto_1fr]">
        {/* HOME */}

        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
          <div className="text-center text-xl font-black">
            {series.home.name}
          </div>

          <div className="mt-5 text-center text-5xl font-black text-blue-400">
            {summary.home.points}
          </div>

          <div className="mt-1 text-center text-xs uppercase tracking-[0.2em] text-white/30">
            очок
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="text-white/40">
              Перемоги
            </div>

            <div className="text-right font-bold">
              {summary.home.wins}
            </div>

            <div className="text-white/40">
              Нічиї
            </div>

            <div className="text-right font-bold">
              {summary.home.draws}
            </div>

            <div className="text-white/40">
              Поразки
            </div>

            <div className="text-right font-bold">
              {summary.home.losses}
            </div>

            <div className="text-white/40">
              Голи
            </div>

            <div className="text-right font-bold">
              {
                summary.home.goalsFor
              }
              :
              {
                summary.home
                  .goalsAgainst
              }
            </div>

            <div className="text-white/40">
              Різниця
            </div>

            <div className="text-right font-black">
              {formatGoalDifference(
                summary.home
                  .goalDifference
              )}
            </div>
          </div>
        </div>

        {/* VS */}

        <div className="flex items-center justify-center text-2xl font-black text-white/20">
          VS
        </div>

        {/* AWAY */}

        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
          <div className="text-center text-xl font-black">
            {series.away.name}
          </div>

          <div className="mt-5 text-center text-5xl font-black text-blue-400">
            {summary.away.points}
          </div>

          <div className="mt-1 text-center text-xs uppercase tracking-[0.2em] text-white/30">
            очок
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="text-white/40">
              Перемоги
            </div>

            <div className="text-right font-bold">
              {summary.away.wins}
            </div>

            <div className="text-white/40">
              Нічиї
            </div>

            <div className="text-right font-bold">
              {summary.away.draws}
            </div>

            <div className="text-white/40">
              Поразки
            </div>

            <div className="text-right font-bold">
              {summary.away.losses}
            </div>

            <div className="text-white/40">
              Голи
            </div>

            <div className="text-right font-bold">
              {
                summary.away.goalsFor
              }
              :
              {
                summary.away
                  .goalsAgainst
              }
            </div>

            <div className="text-white/40">
              Різниця
            </div>

            <div className="text-right font-black">
              {formatGoalDifference(
                summary.away
                  .goalDifference
              )}
            </div>
          </div>
        </div>
      </div>

      {/* STATUS */}

      <div
        className={`mt-6 rounded-2xl border p-5 text-center font-black ${
          summary.status ===
            "needs-tiebreak" ||
          summary.status ===
            "tiebreak-draw"
            ? "border-yellow-400/20 bg-yellow-500/10 text-yellow-200"
            : summary.winner
              ? "border-green-400/20 bg-green-500/10 text-green-200"
              : "border-blue-400/20 bg-blue-500/10 text-blue-200"
        }`}
      >
        {statusText}
      </div>

      {/* NOT COMPLETE */}

      {!summary.regularComplete && (
        <div className="mt-4 text-center text-sm text-white/35">
          Для визначення
          переможця потрібно
          завершити всі 6
          основних матчів.
        </div>
      )}

      {/* CREATE TIEBREAK */}

      {summary.status ===
        "needs-tiebreak" &&
        !summary.tiebreakMatch && (
          <div className="mt-8 rounded-2xl border border-yellow-400/20 bg-yellow-500/10 p-6">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-300">
              Повна рівність
            </div>

            <h3 className="mt-2 text-2xl font-black">
              Створити 7-й матч
            </h3>

            <p className="mt-3 text-sm leading-6 text-yellow-100/70">
              Після шести матчів
              рівні і очки, і
              загальна різниця
              голів. Оберіть по
              одному гравцю від
              кожної асоціації.
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {/* HOME PLAYER */}

              <div>
                <label className="text-sm font-bold">
                  {series.home.name}
                </label>

                <select
                  value={
                    tiebreakHomeId
                  }
                  onChange={(event) =>
                    setTiebreakHomeId(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
                >
                  <option value="">
                    Оберіть гравця
                  </option>

                  {homeAssociation?.players.map(
                    (playerId) => (
                      <option
                        key={playerId}
                        value={playerId}
                      >
                        {getPlayerName(
                          playerId
                        )}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* AWAY PLAYER */}

              <div>
                <label className="text-sm font-bold">
                  {series.away.name}
                </label>

                <select
                  value={
                    tiebreakAwayId
                  }
                  onChange={(event) =>
                    setTiebreakAwayId(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
                >
                  <option value="">
                    Оберіть гравця
                  </option>

                  {awayAssociation?.players.map(
                    (playerId) => (
                      <option
                        key={playerId}
                        value={playerId}
                      >
                        {getPlayerName(
                          playerId
                        )}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={
                createTiebreak
              }
              disabled={
                creatingTiebreak ||
                !tiebreakHomeId ||
                !tiebreakAwayId
              }
              className="mt-6 w-full rounded-xl bg-yellow-400 px-6 py-4 font-black text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {creatingTiebreak
                ? "Створення..."
                : "Створити 7-й вирішальний матч"}
            </button>

            {tiebreakMessage && (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-center text-sm">
                {tiebreakMessage}
              </div>
            )}
          </div>
        )}

      {/* TIEBREAK EXISTS */}

      {summary.status ===
        "tiebreak-pending" &&
        summary.tiebreakMatch && (
          <div className="mt-6 rounded-2xl border border-blue-400/20 bg-blue-500/10 p-5">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">
              7-й матч
            </div>

            <div className="mt-3 text-lg font-black">
              {getPlayerName(
                summary.tiebreakMatch
                  .home_id
              )}
              {" — "}
              {getPlayerName(
                summary.tiebreakMatch
                  .away_id
              )}
            </div>

            <div className="mt-2 text-sm text-white/40">
              Очікує внесення
              результату.
            </div>
          </div>
        )}

      {/* TIEBREAK DRAW */}

      {summary.status ===
        "tiebreak-draw" && (
          <div className="mt-6 rounded-2xl border border-yellow-400/20 bg-yellow-500/10 p-5 text-yellow-200">
            7-й матч завершився
            нічиєю. Автоматично
            визначити переможця
            неможливо.
          </div>
        )}
    </div>
  );
}